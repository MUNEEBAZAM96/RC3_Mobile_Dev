import { buildBudgetSummary, computeBalances, totalHouseholdSpending } from '../household/balances';
import type { BalanceRow, HouseholdStore, Member } from '../household/types';

export interface HouseholdCoachContext {
  asOf: string;
  members: Member[];
  balances: BalanceRow[];
  budget: ReturnType<typeof buildBudgetSummary>;
  recentExpenses: Array<{
    title: string;
    category: string;
    amount: number;
    payer_id: string;
    expense_date: string;
  }>;
}

export async function loadHouseholdCoachContext(store: HouseholdStore): Promise<HouseholdCoachContext> {
  const [members, expenses, splits, settlements, monthlyBudget] = await Promise.all([
    store.getMembers(),
    store.listExpenses(),
    store.listExpenseSplits(),
    store.listSettlements(),
    store.getMonthlyBudget(),
  ]);

  const balances = computeBalances(members, expenses, splits, settlements);
  const spending = totalHouseholdSpending(expenses);
  const budget = buildBudgetSummary(monthlyBudget, spending);

  const recentExpenses = [...expenses]
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date))
    .slice(0, 10)
    .map((row) => ({
      title: row.title,
      category: row.category,
      amount: row.amount,
      payer_id: row.payer_id,
      expense_date: row.expense_date,
    }));

  return {
    asOf: new Date().toISOString(),
    members,
    balances,
    budget,
    recentExpenses,
  };
}

export function buildHouseholdCoachSystemPrompt(
  ctx: HouseholdCoachContext,
  viewingMemberId?: string,
): string {
  const viewer = viewingMemberId
    ? ctx.members.find((m) => m.id === viewingMemberId)
    : undefined;

  const payload = {
    app: 'GharSplit',
    currency: 'PKR',
    as_of: ctx.asOf,
    viewing_member: viewer ? { id: viewer.id, name: viewer.name } : null,
    monthly_budget: ctx.budget,
    member_balances: ctx.balances.map((b) => ({
      member_id: b.member_id,
      name: b.name,
      total_paid: b.total_paid,
      total_share_owed: b.total_share_owed,
      net_balance: b.net_balance,
    })),
    recent_expenses: ctx.recentExpenses,
  };

  return [
    'You are GharSplit household finance coach for a shared flat in Lahore (Ali M01, Ayesha M02, Bilal M03).',
    'Rules:',
    '- Use ONLY numbers from the JSON context below. Never invent balances or expenses.',
    '- Currency is PKR with two decimal places.',
    '- Explain who owes whom; suggest optional settlement payments (sender pays recipient) when helpful.',
    '- This is not legal or professional financial advice.',
    '- Match the user language (English, Urdu, or mixed).',
    '- Keep answers concise (under 400 words) for text-to-speech.',
    viewer ? `- The user is viewing as ${viewer.name} (${viewer.id}).` : '',
    '',
    'Context JSON:',
    JSON.stringify(payload),
  ]
    .filter(Boolean)
    .join('\n');
}
