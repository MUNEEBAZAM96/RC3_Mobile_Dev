import { ApiError, request } from './client';
import type {
  BalanceRow,
  BudgetSummary,
  CategorySpending,
  CheckoutPayload,
  CreateExpensePayload,
  CreateShoppingItemInput,
  Member,
  RecurringApplyResult,
  SettlePayload,
  SettlementSuggestion,
  ShoppingItem,
} from '../../types/household';
import { DEFAULT_MONTHLY_BUDGET_PKR } from '../../types/household';

export { ApiError };

/**
 * True when the server answered "this feature is not here (yet)".
 * Hour 3.5 surfaces use it to show a calm empty state instead of an error.
 */
export function isUnavailable(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 404 || err.status === 501);
}

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
  const percent = Number(
    raw.percent_used ?? raw.percentUsed ?? (monthly > 0 ? (spending / monthly) * 100 : 0),
  );
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
    return pickArray<Record<string, unknown>>(body, ['members', 'data'])
      .map(normalizeMember)
      .filter((m) => m.id.length > 0);
  },

  async getShopping(status?: 'pending' | 'bought'): Promise<ShoppingItem[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const body = await request<unknown>(`/api/shopping${query}`, {}, false);
    return pickArray<Record<string, unknown>>(body, ['items', 'shopping', 'data'])
      .map(normalizeShoppingItem)
      .filter((item) => item.id.length > 0);
  },

  async createShoppingItem(input: CreateShoppingItemInput): Promise<ShoppingItem> {
    const body = await request<unknown>(
      '/api/shopping',
      { method: 'POST', body: JSON.stringify(input) },
      false,
    );
    const obj = pickObject(body, ['item', 'data']) ?? (body as Record<string, unknown>);
    const itemRaw = (obj.item ?? obj) as Record<string, unknown>;
    return normalizeShoppingItem(itemRaw);
  },

  async checkout(payload: CheckoutPayload): Promise<void> {
    await request(
      '/api/shopping/checkout',
      { method: 'POST', body: JSON.stringify(payload) },
      false,
    );
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
      const obj =
        pickObject(body, ['summary', 'budget', 'data']) ?? (body as Record<string, unknown>);
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

  // ── Hour 3.5 surfaces ────────────────────────────────────────────────────────

  /** Option 1: minimal set of transfers that clears every balance. */
  async getSimplifiedSettlements(): Promise<SettlementSuggestion[]> {
    const body = await request<unknown>('/api/balances/simplify', {}, false);
    return pickArray<Record<string, unknown>>(body, [
      'transfers',
      'payments',
      'suggestions',
      'settlements',
      'data',
    ])
      .map(normalizeSuggestion)
      .filter((row) => row.sender_id.length > 0 && row.recipient_id.length > 0 && row.amount > 0);
  },

  /** Option 3: spending per category with the 40%-of-budget flag. */
  async getCategoryBreakdown(): Promise<CategorySpending[]> {
    const body = await request<unknown>('/api/budget/categories', {}, false);
    return pickArray<Record<string, unknown>>(body, ['categories', 'breakdown', 'data'])
      .map(normalizeCategory)
      .filter((row) => row.category.length > 0);
  },

  /** Option 4: post every recurring template for the active month. */
  async applyRecurringExpenses(): Promise<RecurringApplyResult> {
    const body = await request<unknown>('/api/expenses/recurring/apply', { method: 'POST' }, false);
    const obj = pickObject(body, ['result', 'data']) ?? {};
    const created = Number(
      obj.created ??
        obj.count ??
        obj.generated ??
        (Array.isArray(obj.expenses) ? obj.expenses.length : 0),
    );
    return { created: Number.isFinite(created) ? created : 0 };
  },
};

function normalizeSuggestion(raw: Record<string, unknown>): SettlementSuggestion {
  return {
    sender_id: String(raw.sender_id ?? raw.from ?? raw.from_id ?? raw.debtor_id ?? ''),
    recipient_id: String(raw.recipient_id ?? raw.to ?? raw.to_id ?? raw.creditor_id ?? ''),
    amount: Number(raw.amount ?? 0),
  };
}

function normalizeCategory(raw: Record<string, unknown>): CategorySpending {
  const total = Number(raw.total ?? raw.amount ?? raw.spent ?? raw.total_spending ?? 0);
  const percent = Number(raw.percent_of_budget ?? raw.percent ?? raw.percentOfBudget ?? 0);
  const flagged =
    raw.exceeded ?? raw.flagged ?? raw.over_limit ?? raw.warning ?? raw.exceeds_threshold;
  return {
    category: String(raw.category ?? raw.name ?? ''),
    total,
    percent_of_budget: Number.isFinite(percent) ? percent : 0,
    exceeded: typeof flagged === 'boolean' ? flagged : percent > 40,
  };
}
