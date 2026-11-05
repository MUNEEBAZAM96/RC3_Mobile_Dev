export const SHOPPING_UNITS = ['pack', 'dozen', 'bottle', 'bag'] as const;
export type ShoppingUnit = (typeof SHOPPING_UNITS)[number];

export type ShoppingItemStatus = 'pending' | 'bought';

export interface Member {
  id: string;
  name: string;
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
}

export type SplitType = 'equal' | 'custom';

export interface ExpenseSplitInput {
  member_id: string;
  amount: number;
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
}

export interface SettlePayload {
  sender_id: string;
  recipient_id: string;
  amount: number;
}

export const DEFAULT_MONTHLY_BUDGET_PKR = 5000;
