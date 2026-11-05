import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

import Database from 'better-sqlite3';

import { AppError } from '../http/errors';
import { roundPkr } from './money';
import { SQLITE_HOUSEHOLD_SCHEMA } from './schema.sql';
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

function seedIfEmpty(db: Database.Database): void {
  const row = db.prepare('SELECT COUNT(*) AS c FROM household_members').get() as { c: number };
  if (row.c > 0) return;
  const insertMember = db.prepare('INSERT INTO household_members (id, name) VALUES (?, ?)');
  for (const member of DEFAULT_MEMBERS) {
    insertMember.run(member.id, member.name);
  }
  db.prepare(
    `INSERT INTO household_settings (key, value) VALUES ('monthly_budget', ?) ON CONFLICT(key) DO NOTHING`,
  ).run(String(DEFAULT_MONTHLY_BUDGET));
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

export function createSqliteHouseholdStore(filePath: string): HouseholdStore {
  mkdirSync(dirname(filePath), { recursive: true });
  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SQLITE_HOUSEHOLD_SCHEMA);
  seedIfEmpty(db);

  function memberIds(): Set<string> {
    const rows = db.prepare('SELECT id FROM household_members').all() as { id: string }[];
    return new Set(rows.map((row) => row.id));
  }

  function assertMembers(ids: string[]): void {
    const known = memberIds();
    for (const id of ids) {
      if (!known.has(id)) throw new AppError(400, 'VALIDATION_ERROR', `Unknown member: ${id}`);
    }
  }

  function insertExpense(input: {
    title: string;
    category: string;
    amount: number;
    payer_id: string;
    split_type: 'equal' | 'custom';
    expense_date: string;
    shares: SplitShare[];
  }): void {
    const expenseId = randomUUID();
    db.prepare(
      `INSERT INTO expenses (id, title, category, amount, payer_id, split_type, expense_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      expenseId,
      input.title,
      input.category,
      roundPkr(input.amount),
      input.payer_id,
      input.split_type,
      input.expense_date,
    );
    const insertSplit = db.prepare(
      `INSERT INTO expense_splits (expense_id, member_id, share_amount) VALUES (?, ?, ?)`,
    );
    for (const share of input.shares) {
      insertSplit.run(expenseId, share.member_id, roundPkr(share.share_amount));
    }
  }

  return {
    kind: 'sqlite',
    async getMembers() {
      return db.prepare('SELECT id, name FROM household_members ORDER BY id').all() as Member[];
    },
    async listShopping(status?: ShoppingStatus) {
      const rows = status
        ? (db
            .prepare(
              `SELECT id, title, unit, requested_qty, status FROM shopping_items WHERE status = ? ORDER BY created_at DESC`,
            )
            .all(status) as ShoppingItem[])
        : (db
            .prepare(`SELECT id, title, unit, requested_qty, status FROM shopping_items ORDER BY created_at DESC`)
            .all() as ShoppingItem[]);
      return rows.map(mapShopping);
    },
    async createShoppingItem(input: { title: string; unit: ShoppingUnit; requested_qty: number }) {
      const id = randomUUID();
      db.prepare(
        `INSERT INTO shopping_items (id, title, unit, requested_qty, status) VALUES (?, ?, ?, ?, 'pending')`,
      ).run(id, input.title.trim(), input.unit, input.requested_qty);
      const row = db
        .prepare(`SELECT id, title, unit, requested_qty, status FROM shopping_items WHERE id = ?`)
        .get(id) as ShoppingItem;
      return mapShopping(row);
    },
    async checkout(input) {
      assertMembers([input.payer_id, ...input.split_members]);
      const checkoutTx = db.transaction(() => {
        const placeholders = input.item_ids.map(() => '?').join(',');
        const items = db
          .prepare(`SELECT id, status FROM shopping_items WHERE id IN (${placeholders})`)
          .all(...input.item_ids) as { id: string; status: string }[];
        if (items.length !== input.item_ids.length) {
          throw new AppError(400, 'VALIDATION_ERROR', 'One or more shopping items were not found.');
        }
        if (items.some((row) => row.status !== 'pending')) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Checkout can only include pending items.');
        }
        const shares = splitEqual(input.total_paid, input.split_members);
        insertExpense({
          title: 'Shopping checkout',
          category: 'Groceries',
          amount: input.total_paid,
          payer_id: input.payer_id,
          split_type: 'equal',
          expense_date: new Date().toISOString().slice(0, 10),
          shares,
        });
        const mark = db.prepare(`UPDATE shopping_items SET status = 'bought' WHERE id = ?`);
        for (const itemId of input.item_ids) mark.run(itemId);
      });
      checkoutTx();
    },
    async createExpense(input) {
      assertMembers([input.payer_id, ...input.shares.map((s) => s.member_id)]);
      const tx = db.transaction(() => insertExpense(input));
      tx();
    },
    async listExpenses() {
      return (
        db
          .prepare(
            `SELECT id, title, category, amount, payer_id, split_type, expense_date FROM expenses ORDER BY created_at`,
          )
          .all() as ExpenseRecord[]
      ).map((row) => ({ ...row, amount: roundPkr(row.amount) }));
    },
    async listExpenseSplits() {
      return (db.prepare(`SELECT expense_id, member_id, share_amount FROM expense_splits`).all() as ExpenseSplitRecord[]).map(
        (row) => ({ ...row, share_amount: roundPkr(row.share_amount) }),
      );
    },
    async listSettlements() {
      return db
        .prepare(`SELECT id, sender_id, recipient_id, amount, created_at FROM settlements`)
        .all() as SettlementRecord[];
    },
    async addSettlement(input) {
      assertMembers([input.sender_id, input.recipient_id]);
      db.prepare(`INSERT INTO settlements (id, sender_id, recipient_id, amount) VALUES (?, ?, ?, ?)`).run(
        randomUUID(),
        input.sender_id,
        input.recipient_id,
        roundPkr(input.amount),
      );
    },
    async getMonthlyBudget() {
      const row = db
        .prepare(`SELECT value FROM household_settings WHERE key = 'monthly_budget'`)
        .get() as { value: string } | undefined;
      return row?.value ? Number(row.value) : DEFAULT_MONTHLY_BUDGET;
    },
  };
}
