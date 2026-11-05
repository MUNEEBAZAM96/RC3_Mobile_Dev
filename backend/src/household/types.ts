export type ShoppingUnit = 'pack' | 'dozen' | 'bottle' | 'bag';
export type ShoppingStatus = 'pending' | 'bought';
export type SplitType = 'equal' | 'custom';

export interface Member {
  id: string;
  name: string;
}

export interface ShoppingItem {
  id: string;
  title: string;
  unit: ShoppingUnit;
  requested_qty: number;
  status: ShoppingStatus;
}

export interface ExpenseRecord {
  id: string;
  title: string;
  category: string;
  amount: number;
  payer_id: string;
  split_type: SplitType;
  expense_date: string;
}

export interface ExpenseSplitRecord {
  expense_id: string;
  member_id: string;
  share_amount: number;
}

export interface SettlementRecord {
  id: string;
  sender_id: string;
  recipient_id: string;
  amount: number;
  created_at: string;
}

export interface BalanceRow {
  member_id: string;
  name: string;
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

export interface SplitShare {
  member_id: string;
  share_amount: number;
}

export type HouseholdStoreKind = 'postgres' | 'sqlite' | 'memory';

export interface HouseholdStore {
  readonly kind: HouseholdStoreKind;
  getMembers(): Promise<Member[]>;
  listShopping(status?: ShoppingStatus): Promise<ShoppingItem[]>;
  createShoppingItem(input: { title: string; unit: ShoppingUnit; requested_qty: number }): Promise<ShoppingItem>;
  checkout(input: {
    item_ids: string[];
    total_paid: number;
    payer_id: string;
    split_members: string[];
  }): Promise<void>;
  createExpense(input: {
    title: string;
    category: string;
    amount: number;
    payer_id: string;
    split_type: SplitType;
    expense_date: string;
    shares: SplitShare[];
  }): Promise<void>;
  listSettlements(): Promise<SettlementRecord[]>;
  listExpenses(): Promise<ExpenseRecord[]>;
  listExpenseSplits(): Promise<ExpenseSplitRecord[]>;
  addSettlement(input: { sender_id: string; recipient_id: string; amount: number }): Promise<void>;
  getMonthlyBudget(): Promise<number>;
}
