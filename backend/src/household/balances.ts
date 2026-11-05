import { roundPkr } from './money';
import type { BalanceRow, ExpenseRecord, ExpenseSplitRecord, Member, SettlementRecord } from './types';

export function computeBalances(
  members: Member[],
  expenses: ExpenseRecord[],
  splits: ExpenseSplitRecord[],
  settlements: SettlementRecord[],
): BalanceRow[] {
  const paid = new Map<string, number>();
  const owed = new Map<string, number>();
  const received = new Map<string, number>();
  const sent = new Map<string, number>();

  for (const member of members) {
    paid.set(member.id, 0);
    owed.set(member.id, 0);
    received.set(member.id, 0);
    sent.set(member.id, 0);
  }

  for (const expense of expenses) {
    paid.set(expense.payer_id, roundPkr((paid.get(expense.payer_id) ?? 0) + expense.amount));
  }

  for (const split of splits) {
    owed.set(split.member_id, roundPkr((owed.get(split.member_id) ?? 0) + split.share_amount));
  }

  for (const settlement of settlements) {
    sent.set(settlement.sender_id, roundPkr((sent.get(settlement.sender_id) ?? 0) + settlement.amount));
    received.set(
      settlement.recipient_id,
      roundPkr((received.get(settlement.recipient_id) ?? 0) + settlement.amount),
    );
  }

  return members.map((member) => {
    const total_paid = paid.get(member.id) ?? 0;
    const total_share_owed = owed.get(member.id) ?? 0;
    const settlements_received = received.get(member.id) ?? 0;
    const settlements_sent = sent.get(member.id) ?? 0;
    // Positive net = member should receive cash; paying someone reduces what you owe;
    // receiving payment reduces what you are owed.
    const net_balance = roundPkr(
      total_paid - total_share_owed - settlements_received + settlements_sent,
    );
    return {
      member_id: member.id,
      name: member.name,
      total_paid,
      total_share_owed,
      settlements_received,
      settlements_sent,
      net_balance,
    };
  });
}

export function totalHouseholdSpending(expenses: ExpenseRecord[]): number {
  return roundPkr(expenses.reduce((sum, row) => sum + row.amount, 0));
}

export function buildBudgetSummary(monthlyBudget: number, totalSpending: number): {
  monthly_budget: number;
  total_spending: number;
  remaining: number;
  percent_used: number;
  status: string;
} {
  const remaining = roundPkr(monthlyBudget - totalSpending);
  const percent_used = monthlyBudget > 0 ? roundPkr((totalSpending / monthlyBudget) * 100) : 0;
  const status = percent_used >= 80 ? 'Near Limit' : 'OK';
  return {
    monthly_budget: monthlyBudget,
    total_spending: totalSpending,
    remaining,
    percent_used,
    status,
  };
}
