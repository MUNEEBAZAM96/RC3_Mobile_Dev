import { randomUUID } from 'node:crypto';

import { AppError } from '../http/errors';
import { roundPkr } from './money';
import { splitEqual } from './split';
import { DEFAULT_MEMBERS, DEFAULT_MONTHLY_BUDGET } from './seed';
import type {
  ExpenseRecord,
  ExpenseSplitRecord,
  HouseholdStore,
  SettlementRecord,
  ShoppingItem,
  ShoppingStatus,
  ShoppingUnit,
  SplitShare,
} from './types';

export function createMemoryHouseholdStore(): HouseholdStore {
  const members = [...DEFAULT_MEMBERS];
  const shopping: ShoppingItem[] = [];
  const expenses: ExpenseRecord[] = [];
  const splits: ExpenseSplitRecord[] = [];
  const settlements: SettlementRecord[] = [];
  let monthlyBudget = DEFAULT_MONTHLY_BUDGET;

  function memberIds(): Set<string> {
    return new Set(members.map((m) => m.id));
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
    assertMembers([input.payer_id, ...input.shares.map((s) => s.member_id)]);
    const expense: ExpenseRecord = {
      id: randomUUID(),
      title: input.title,
      category: input.category,
      amount: roundPkr(input.amount),
      payer_id: input.payer_id,
      split_type: input.split_type,
      expense_date: input.expense_date,
    };
    expenses.push(expense);
    for (const share of input.shares) {
      splits.push({
        expense_id: expense.id,
        member_id: share.member_id,
        share_amount: roundPkr(share.share_amount),
      });
    }
  }

  return {
    kind: 'memory',
    async getMembers() {
      return [...members];
    },
    async listShopping(status?: ShoppingStatus) {
      if (!status) return [...shopping];
      return shopping.filter((item) => item.status === status);
    },
    async createShoppingItem(input: { title: string; unit: ShoppingUnit; requested_qty: number }) {
      const item: ShoppingItem = {
        id: randomUUID(),
        title: input.title.trim(),
        unit: input.unit,
        requested_qty: input.requested_qty,
        status: 'pending',
      };
      shopping.push(item);
      return item;
    },
    async checkout(input) {
      assertMembers([input.payer_id, ...input.split_members]);
      const items = shopping.filter((row) => input.item_ids.includes(row.id));
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
      for (const item of items) item.status = 'bought';
    },
    async createExpense(input) {
      insertExpense(input);
    },
    async listExpenses() {
      return [...expenses];
    },
    async listExpenseSplits() {
      return [...splits];
    },
    async listSettlements() {
      return [...settlements];
    },
    async addSettlement(input) {
      assertMembers([input.sender_id, input.recipient_id]);
      settlements.push({
        id: randomUUID(),
        sender_id: input.sender_id,
        recipient_id: input.recipient_id,
        amount: roundPkr(input.amount),
        created_at: new Date().toISOString(),
      });
    },
    async getMonthlyBudget() {
      return monthlyBudget;
    },
  };
}
