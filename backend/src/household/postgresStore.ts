import { randomUUID } from 'node:crypto';

import pg from 'pg';

import { AppError } from '../http/errors';
import { roundPkr } from './money';
import { POSTGRES_HOUSEHOLD_SCHEMA } from './schema.sql';
import { splitEqual } from './split';
import { DEFAULT_MEMBERS, DEFAULT_MONTHLY_BUDGET } from './seed';
import type {
  ExpenseRecord,
  ExpenseSplitRecord,
  HouseholdStore,
  Member,
  SettlementRecord,
  ShoppingItem,
  ShoppingStatus,
  ShoppingUnit,
  SplitShare,
} from './types';

async function seedIfEmpty(pool: pg.Pool): Promise<void> {
  const count = await pool.query<{ c: string }>('SELECT COUNT(*)::text AS c FROM household_members');
  if (Number(count.rows[0]?.c ?? 0) > 0) return;

  for (const member of DEFAULT_MEMBERS) {
    await pool.query('INSERT INTO household_members (id, name) VALUES ($1, $2)', [member.id, member.name]);
  }
  await pool.query('INSERT INTO household_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING', [
    'monthly_budget',
    String(DEFAULT_MONTHLY_BUDGET),
  ]);
}

function mapShopping(row: {
  id: string;
  title: string;
  unit: string;
  requested_qty: number;
  status: string;
}): ShoppingItem {
  return {
    id: row.id,
    title: row.title,
    unit: row.unit as ShoppingUnit,
    requested_qty: row.requested_qty,
    status: row.status === 'bought' ? 'bought' : 'pending',
  };
}

export async function createPostgresHouseholdStore(databaseUrl: string): Promise<HouseholdStore> {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 });
  await pool.query(POSTGRES_HOUSEHOLD_SCHEMA);
  await seedIfEmpty(pool);

  async function memberIds(): Promise<Set<string>> {
    const result = await pool.query<{ id: string }>('SELECT id FROM household_members');
    return new Set(result.rows.map((row) => row.id));
  }

  async function assertMembers(ids: string[]): Promise<void> {
    const known = await memberIds();
    for (const id of ids) {
      if (!known.has(id)) throw new AppError(400, 'VALIDATION_ERROR', `Unknown member: ${id}`);
    }
  }

  async function insertExpense(client: pg.PoolClient, input: {
    title: string;
    category: string;
    amount: number;
    payer_id: string;
    split_type: 'equal' | 'custom';
    expense_date: string;
    shares: SplitShare[];
  }): Promise<void> {
    const expenseId = randomUUID();
    await client.query(
      `INSERT INTO expenses (id, title, category, amount, payer_id, split_type, expense_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        expenseId,
        input.title,
        input.category,
        roundPkr(input.amount),
        input.payer_id,
        input.split_type,
        input.expense_date,
      ],
    );
    for (const share of input.shares) {
      await client.query(
        `INSERT INTO expense_splits (expense_id, member_id, share_amount) VALUES ($1, $2, $3)`,
        [expenseId, share.member_id, roundPkr(share.share_amount)],
      );
    }
  }

  return {
    kind: 'postgres',
    async getMembers() {
      const result = await pool.query<Member>('SELECT id, name FROM household_members ORDER BY id');
      return result.rows;
    },
    async listShopping(status?: ShoppingStatus) {
      const result = status
        ? await pool.query(
            'SELECT id, title, unit, requested_qty, status FROM shopping_items WHERE status = $1 ORDER BY created_at DESC',
            [status],
          )
        : await pool.query(
            'SELECT id, title, unit, requested_qty, status FROM shopping_items ORDER BY created_at DESC',
          );
      return result.rows.map(mapShopping);
    },
    async createShoppingItem(input: { title: string; unit: ShoppingUnit; requested_qty: number }) {
      const id = randomUUID();
      const result = await pool.query(
        `INSERT INTO shopping_items (id, title, unit, requested_qty, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING id, title, unit, requested_qty, status`,
        [id, input.title.trim(), input.unit, input.requested_qty],
      );
      const row = result.rows[0];
      if (!row) throw new AppError(500, 'INTERNAL', 'Failed to create shopping item.');
      return mapShopping(row as { id: string; title: string; unit: string; requested_qty: number; status: string });
    },
    async checkout(input) {
      await assertMembers([input.payer_id, ...input.split_members]);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const itemsResult = await client.query<{ id: string; status: string }>(
          `SELECT id, status FROM shopping_items WHERE id = ANY($1::text[])`,
          [input.item_ids],
        );
        if (itemsResult.rows.length !== input.item_ids.length) {
          throw new AppError(400, 'VALIDATION_ERROR', 'One or more shopping items were not found.');
        }
        if (itemsResult.rows.some((row) => row.status !== 'pending')) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Checkout can only include pending items.');
        }
        const shares = splitEqual(input.total_paid, input.split_members);
        await insertExpense(client, {
          title: 'Shopping checkout',
          category: 'Groceries',
          amount: input.total_paid,
          payer_id: input.payer_id,
          split_type: 'equal',
          expense_date: new Date().toISOString().slice(0, 10),
          shares,
        });
        await client.query(`UPDATE shopping_items SET status = 'bought' WHERE id = ANY($1::text[])`, [input.item_ids]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
    async createExpense(input) {
      await assertMembers([input.payer_id, ...input.shares.map((s) => s.member_id)]);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await insertExpense(client, input);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
    async listExpenses() {
      const result = await pool.query<ExpenseRecord>(
        `SELECT id, title, category, amount::float8 AS amount, payer_id, split_type, expense_date::text AS expense_date
         FROM expenses ORDER BY created_at`,
      );
      return result.rows.map((row) => ({ ...row, amount: roundPkr(Number(row.amount)) }));
    },
    async listExpenseSplits() {
      const result = await pool.query<ExpenseSplitRecord>(
        `SELECT expense_id, member_id, share_amount::float8 AS share_amount FROM expense_splits`,
      );
      return result.rows.map((row) => ({ ...row, share_amount: roundPkr(Number(row.share_amount)) }));
    },
    async listSettlements() {
      const result = await pool.query<SettlementRecord>(
        `SELECT id, sender_id, recipient_id, amount::float8 AS amount, created_at::text AS created_at FROM settlements`,
      );
      return result.rows.map((row) => ({ ...row, amount: roundPkr(Number(row.amount)) }));
    },
    async addSettlement(input) {
      await assertMembers([input.sender_id, input.recipient_id]);
      await pool.query(
        `INSERT INTO settlements (id, sender_id, recipient_id, amount) VALUES ($1, $2, $3, $4)`,
        [randomUUID(), input.sender_id, input.recipient_id, roundPkr(input.amount)],
      );
    },
    async getMonthlyBudget() {
      const result = await pool.query<{ value: string }>(
        `SELECT value FROM household_settings WHERE key = 'monthly_budget'`,
      );
      const raw = result.rows[0]?.value;
      return raw ? Number(raw) : DEFAULT_MONTHLY_BUDGET;
    },
  };
}
