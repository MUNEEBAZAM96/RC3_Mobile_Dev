export type ShoppingUnit = 'pack' | 'dozen' | 'bottle' | 'bag';
export type ShoppingStatus = 'pending' | 'bought';
export type SplitType = 'equal' | 'custom';

export interface Member {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  joined_at?: string | null;
}

export interface CreateMemberInput {
  name: string;
  id?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface UpdateMemberInput {
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
  proof_url?: string | null;
  proof_public_id?: string | null;
}

export interface SetExpenseProofInput {
  proof_url: string;
  proof_public_id?: string | null;
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
  createMember(input: CreateMemberInput): Promise<Member>;
  updateMember(id: string, input: UpdateMemberInput): Promise<Member>;
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
  }): Promise<ExpenseRecord>;
  getExpense(id: string): Promise<ExpenseRecord | null>;
  setExpenseProof(expenseId: string, input: SetExpenseProofInput): Promise<ExpenseRecord>;
  listSettlements(): Promise<SettlementRecord[]>;
  listExpenses(): Promise<ExpenseRecord[]>;
  listExpenseSplits(): Promise<ExpenseSplitRecord[]>;
  addSettlement(input: { sender_id: string; recipient_id: string; amount: number }): Promise<void>;
  getMonthlyBudget(): Promise<number>;
  /** Removes shopping, expenses, splits, and settlements; keeps members and budget settings. */
  clearLedger(): Promise<void>;
}
