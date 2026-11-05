import { householdApi } from '../../services/api/household';
import type { BalanceRow, BudgetSummary, Member } from '../../types/household';
import { formatPkr } from '../../utils/currency';
import { monthLabel } from '../../utils/time';

export interface HouseholdSnapshot {
  members: Member[];
  balances: BalanceRow[];
  budget: BudgetSummary;
  pendingItems: number;
  fetchedAt: string;
}

export interface AssistantIdentity {
  /** Home "Viewing as" selection. */
  viewingMemberId: string | null;
  /** Roommate linked in Profile (chat identity). */
  linkedMemberId: string | null;
}

/** Live data the assistant is allowed to talk about. Every number comes from the API. */
export async function fetchHouseholdSnapshot(): Promise<HouseholdSnapshot> {
  const [members, balances, pending] = await Promise.all([
    householdApi.getMembers(),
    householdApi.getBalances(),
    householdApi.getShopping('pending'),
  ]);
  const spending = balances.reduce((sum, row) => sum + row.total_paid, 0);
  const budget = await householdApi.getBudgetSummary(spending);
  return {
    members,
    balances,
    budget,
    pendingItems: pending.length,
    fetchedAt: new Date().toISOString(),
  };
}

function nameFor(members: Member[], id: string | null): string | null {
  if (!id) return null;
  return members.find((m) => m.id === id)?.name ?? id;
}

function describeNet(net: number): string {
  if (net > 0) return `is owed ${formatPkr(net)}`;
  if (net < 0) return `owes ${formatPkr(Math.abs(net))}`;
  return 'is settled (PKR 0.00)';
}

/**
 * Plain-text system prompt built on the client from live household data.
 * Kept well under the API's 8,000-character message limit.
 */
export function buildSystemPrompt(
  snapshot: HouseholdSnapshot,
  identity: AssistantIdentity,
): string {
  const { members, balances, budget, pendingItems } = snapshot;
  const viewing = nameFor(members, identity.viewingMemberId);
  const linked = nameFor(members, identity.linkedMemberId);
  const you = linked ?? viewing;

  const balanceLines = balances.map((row) => {
    const name = nameFor(members, row.member_id) ?? row.member_id;
    return `- ${name} (${row.member_id}): paid ${formatPkr(row.total_paid)}, share owed ${formatPkr(row.total_share_owed)}, settlements received ${formatPkr(row.settlements_received)}, sent ${formatPkr(row.settlements_sent)}; net ${formatPkr(row.net_balance)} -> ${describeNet(row.net_balance)}.`;
  });
  const sumNet = balances.reduce((acc, row) => acc + row.net_balance, 0);

  return [
    'You are GharSplit, the finance assistant inside a shared-flat ledger app used by three roommates in Lahore, Pakistan.',
    `Today is ${new Date().toDateString()}. Current period: ${monthLabel()}.`,
    '',
    'WHO IS ASKING',
    you
      ? `- The user is ${you}${linked && viewing && linked !== viewing ? ` (linked identity), currently viewing the dashboard as ${viewing}` : ''}. Address them as "you" and refer to the others by name.`
      : '- The user has not linked a roommate identity. Refer to everyone by name.',
    '',
    'HOUSEHOLD MEMBERS',
    ...members.map((m) => `- ${m.name} (${m.id})`),
    '',
    'LIVE BALANCES (from GET /api/balances)',
    ...balanceLines,
    `- Sum of all net balances: ${formatPkr(Math.round(sumNet * 100) / 100)} (must be PKR 0.00).`,
    '',
    'BUDGET (from GET /api/budget/summary)',
    `- Monthly budget ${formatPkr(budget.monthly_budget)}; spent ${formatPkr(budget.total_spending)}; remaining ${formatPkr(budget.remaining)}; ${Math.round(budget.percent_used)}% used; status "${budget.status}".`,
    `- Pending shopping items: ${pendingItems}.`,
    '',
    'HOW THE APP WORKS',
    '- Equal split: amount is divided in paisa; leftover paisa go one at a time to the lowest member ID first (M01, then M02, then M03). PKR 1,000.00 across three people is 333.34 / 333.33 / 333.33.',
    '- Net balance = total paid - total share owed - settlements received + settlements sent. Positive means the person should receive money; negative means they owe.',
    '- Settlements move cash between two members and never change household spending. The app rejects non-positive amounts, self-payments, and amounts above the debt or credit.',
    '- Checkout marks shopping items as bought and posts one shared expense for the trip.',
    '',
    'RULES',
    '- Answer only from the data above. Never invent amounts, members, or transactions. If something is not in the data, say so.',
    '- Always write money as PKR with two decimals, e.g. PKR 250.00.',
    '- Settlement ideas are suggestions for roommates, not financial advice.',
    '- Be concise and friendly: two to five short sentences, or a short list. No markdown tables.',
  ].join('\n');
}

export const QUICK_PROMPTS = [
  'Explain my net balance',
  'Who owes whom right now?',
  'How much budget is left this month?',
  'How do equal splits work in our app?',
] as const;
