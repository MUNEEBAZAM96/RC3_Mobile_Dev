import { ApiError, request } from './client';
import type {
  BalanceRow,
  BudgetSummary,
  CheckoutPayload,
  CreateExpensePayload,
  CreateShoppingItemInput,
  Member,
  SettlePayload,
  ShoppingItem,
} from '../../types/household';
import { DEFAULT_MONTHLY_BUDGET_PKR } from '../../types/household';

export { ApiError };

function pickArray<T>(body: unknown, keys: string[]): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
}

function pickObject(body: unknown, keys: string[]): Record<string, unknown> | null {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  return null;
}

function normalizeMember(raw: Record<string, unknown>): Member {
  return {
    id: String(raw.id ?? raw.member_id ?? ''),
    name: String(raw.name ?? ''),
  };
}

function normalizeShoppingItem(raw: Record<string, unknown>): ShoppingItem {
  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    unit: String(raw.unit ?? 'pack') as ShoppingItem['unit'],
    requested_qty: Number(raw.requested_qty ?? raw.requestedQty ?? 1),
    status: (raw.status === 'bought' ? 'bought' : 'pending') as ShoppingItem['status'],
  };
}

function normalizeBalance(raw: Record<string, unknown>): BalanceRow {
  return {
    member_id: String(raw.member_id ?? raw.memberId ?? ''),
    name: raw.name != null ? String(raw.name) : undefined,
    total_paid: Number(raw.total_paid ?? raw.totalPaid ?? 0),
    total_share_owed: Number(raw.total_share_owed ?? raw.totalShareOwed ?? 0),
    settlements_received: Number(raw.settlements_received ?? raw.settlementsReceived ?? 0),
    settlements_sent: Number(raw.settlements_sent ?? raw.settlementsSent ?? 0),
    net_balance: Number(raw.net_balance ?? raw.netBalance ?? 0),
  };
}

function normalizeBudget(raw: Record<string, unknown>): BudgetSummary {
  const monthly = Number(raw.monthly_budget ?? raw.monthlyBudget ?? DEFAULT_MONTHLY_BUDGET_PKR);
  const spending = Number(raw.total_spending ?? raw.totalSpending ?? 0);
  const remaining = Number(raw.remaining ?? monthly - spending);
  const percent = Number(raw.percent_used ?? raw.percentUsed ?? (monthly > 0 ? (spending / monthly) * 100 : 0));
  return {
    monthly_budget: monthly,
    total_spending: spending,
    remaining,
    percent_used: percent,
    status: String(raw.status ?? (percent >= 80 ? 'Near Limit' : 'OK')),
  };
}

export const householdApi = {
  async getMembers(): Promise<Member[]> {
    const body = await request<unknown>('/api/members', {}, false);
    return pickArray<Record<string, unknown>>(body, ['members', 'data']).map(normalizeMember).filter((m) => m.id.length > 0);
  },

  async getShopping(status?: 'pending' | 'bought'): Promise<ShoppingItem[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const body = await request<unknown>(`/api/shopping${query}`, {}, false);
    return pickArray<Record<string, unknown>>(body, ['items', 'shopping', 'data'])
      .map(normalizeShoppingItem)
      .filter((item) => item.id.length > 0);
  },

  async createShoppingItem(input: CreateShoppingItemInput): Promise<ShoppingItem> {
    const body = await request<unknown>('/api/shopping', { method: 'POST', body: JSON.stringify(input) }, false);
    const obj = pickObject(body, ['item', 'data']) ?? (body as Record<string, unknown>);
    const itemRaw = (obj.item ?? obj) as Record<string, unknown>;
    return normalizeShoppingItem(itemRaw);
  },

  async checkout(payload: CheckoutPayload): Promise<void> {
    await request('/api/shopping/checkout', { method: 'POST', body: JSON.stringify(payload) }, false);
  },

  async createExpense(payload: CreateExpensePayload): Promise<void> {
    await request('/api/expenses', { method: 'POST', body: JSON.stringify(payload) }, false);
  },

  async getBalances(): Promise<BalanceRow[]> {
    const body = await request<unknown>('/api/balances', {}, false);
    return pickArray<Record<string, unknown>>(body, ['balances', 'members', 'data'])
      .map(normalizeBalance)
      .filter((row) => row.member_id.length > 0);
  },

  async settle(payload: SettlePayload): Promise<void> {
    await request('/api/settle', { method: 'POST', body: JSON.stringify(payload) }, false);
  },

  async getBudgetSummary(fallbackSpending?: number): Promise<BudgetSummary> {
    try {
      const body = await request<unknown>('/api/budget/summary', {}, false);
      const obj = pickObject(body, ['summary', 'budget', 'data']) ?? (body as Record<string, unknown>);
      const raw = (obj.summary ?? obj.budget ?? obj) as Record<string, unknown>;
      return normalizeBudget(raw);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 0)) {
        const spending = fallbackSpending ?? 0;
        const monthly = DEFAULT_MONTHLY_BUDGET_PKR;
        const remaining = monthly - spending;
        const percent = monthly > 0 ? (spending / monthly) * 100 : 0;
        return {
          monthly_budget: monthly,
          total_spending: spending,
          remaining,
          percent_used: percent,
          status: percent >= 80 ? 'Near Limit' : 'OK',
        };
      }
      throw err;
    }
  },

  async pingHealth(): Promise<boolean> {
    try {
      await request<unknown>('/health', {}, false);
      return true;
    } catch {
      return false;
    }
  },
};
