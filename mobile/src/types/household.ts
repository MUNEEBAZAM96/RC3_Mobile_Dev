export const SHOPPING_UNITS = ['pack', 'dozen', 'bottle', 'bag'] as const;
export type ShoppingUnit = (typeof SHOPPING_UNITS)[number];

export type ShoppingItemStatus = 'pending' | 'bought';

export const EXPENSE_CATEGORIES = ['Groceries', 'Utilities', 'Entertainment', 'Cleaning'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Member {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  joined_at?: string | null;
}

export interface CreateMemberPayload {
  name: string;
  id?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface UpdateMemberPayload {
  name?: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

export interface ShoppingItem {
  id: string;
  title: string;
  unit: ShoppingUnit;
  requested_qty: number;
  status: ShoppingItemStatus;
}

export interface BalanceRow {
  member_id: string;
  name?: string;
  total_paid: number;
  total_share_owed: number;
  settlements_received: number;
  settlements_sent: number;
  net_balance: number;
}

export interface BudgetSummary {
  monthly_budget: number;
  total_spending: number;
  remaining: number;
  percent_used: number;
  status: string;
}

export interface CreateShoppingItemInput {
  title: string;
  unit: ShoppingUnit;
  requested_qty: number;
}

export interface CheckoutPayload {
  item_ids: string[];
  total_paid: number;
  payer_id: string;
  split_members: string[];
  /** Hour 3.5 (Option 2): optional receipt adjustments. Sent only when entered. */
  tax_percent?: number;
  discount_amount?: number;
}

export type SplitType = 'equal' | 'custom';

export interface ExpenseSplitInput {
  member_id: string;
  amount: number;
}

export interface HouseholdExpense {
  id: string;
  title: string;
  category: string;
  amount: number;
  payer_id: string;
  split_type: SplitType;
  expense_date: string;
  proof_url?: string | null;
  proof_public_id?: string | null;
}

export interface CreateExpensePayload {
  title: string;
  category: string;
  amount: number;
  payer_id: string;
  split_type: SplitType;
  /** Equal split: member ids to include */
  split_members?: string[];
  splits?: ExpenseSplitInput[];
  date?: string;
  /** Hour 3.5 (Option 4): mark as a monthly recurring template. */
  is_recurring?: boolean;
}

export interface SettlePayload {
  sender_id: string;
  recipient_id: string;
  amount: number;
}

/** Hour 3.5 (Option 1): one transfer suggested by GET /api/balances/simplify. */
export interface SettlementSuggestion {
  sender_id: string;
  recipient_id: string;
  amount: number;
}

/** Hour 3.5 (Option 3): one row from GET /api/budget/categories. */
export interface CategorySpending {
  category: string;
  total: number;
  percent_of_budget: number;
  exceeded: boolean;
}

/** Hour 3.5 (Option 4): result of POST /api/expenses/recurring/apply. */
export interface RecurringApplyResult {
  created: number;
}

export const DEFAULT_MONTHLY_BUDGET_PKR = 5000;
