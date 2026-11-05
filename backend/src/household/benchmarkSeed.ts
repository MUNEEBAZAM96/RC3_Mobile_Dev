import { buildBudgetSummary, computeBalances, totalHouseholdSpending } from './balances';
import { roundPkr } from './money';
import { splitCustom, splitEqual } from './split';
import { validateSettlement } from './settle';
import type { BalanceRow, BudgetSummary, HouseholdStore } from './types';

export type BenchmarkPreset =
  | 'empty'
  | 'pre_settlement'
  | 'post_settlement'
  | 'shopping_demo'
  | 'paisa_test';

export interface BenchmarkSeedReport {
  preset: BenchmarkPreset;
  expenses_created: number;
  settlements_created: number;
  shopping_pending_count: number;
  budget_summary: BudgetSummary;
  balances: BalanceRow[];
  assertions: { ok: boolean; messages: string[] };
}

const ALL_MEMBERS = ['M01', 'M02', 'M03'] as const;

async function loadReport(store: HouseholdStore, preset: BenchmarkPreset): Promise<BenchmarkSeedReport> {
  const members = await store.getMembers();
  const expenses = await store.listExpenses();
  const splits = await store.listExpenseSplits();
  const settlements = await store.listSettlements();
  const pending = await store.listShopping('pending');
  const monthlyBudget = await store.getMonthlyBudget();
  const spending = totalHouseholdSpending(expenses);
  const budget_summary = buildBudgetSummary(monthlyBudget, spending);
  const balances = computeBalances(members, expenses, splits, settlements);

  const assertions = runAssertions(preset, budget_summary, balances, splits, pending.length);

  return {
    preset,
    expenses_created: expenses.length,
    settlements_created: settlements.length,
    shopping_pending_count: pending.length,
    budget_summary,
    balances,
    assertions,
  };
}

function runAssertions(
  preset: BenchmarkPreset,
  budget: BudgetSummary,
  balances: BalanceRow[],
  splits: { member_id: string; share_amount: number }[],
  pendingCount: number,
): { ok: boolean; messages: string[] } {
  const messages: string[] = [];
  const net = (id: string) => balances.find((b) => b.member_id === id)?.net_balance;

  const expect = (label: string, ok: boolean) => {
    if (!ok) messages.push(`FAIL: ${label}`);
    else messages.push(`OK: ${label}`);
  };

  if (preset === 'empty') {
    expect('spending is 0', budget.total_spending === 0);
    expect('no pending required', true);
    return { ok: messages.every((m) => m.startsWith('OK:')), messages };
  }

  if (preset === 'shopping_demo') {
    expect('at least 2 pending items', pendingCount >= 2);
    expect('spending unchanged at 0', budget.total_spending === 0);
    return { ok: messages.every((m) => m.startsWith('OK:')), messages };
  }

  if (preset === 'paisa_test') {
    const byMember = new Map<string, number>();
    for (const row of splits) {
      byMember.set(row.member_id, (byMember.get(row.member_id) ?? 0) + row.share_amount);
    }
    expect('M01 share 333.34', byMember.get('M01') === 333.34);
    expect('M02 share 333.33', byMember.get('M02') === 333.33);
    expect('M03 share 333.33', byMember.get('M03') === 333.33);
    return { ok: messages.every((m) => m.startsWith('OK:')), messages };
  }

  if (preset === 'pre_settlement' || preset === 'post_settlement') {
    expect('spending 4200', budget.total_spending === 4200);
    expect('84% used', Math.round(budget.percent_used) === 84);
    expect('Near Limit status', /near limit/i.test(budget.status));
    expect('800 remaining', budget.remaining === 800);
    const sumNets = roundPkr(balances.reduce((s, b) => s + b.net_balance, 0));
    expect('nets sum to 0', sumNets === 0);

    if (preset === 'pre_settlement') {
      expect('M01 net +250', net('M01') === 250);
      expect('M02 net -450', net('M02') === -450);
      expect('M03 net +200', net('M03') === 200);
    } else {
      expect('M01 net 0', net('M01') === 0);
      expect('M02 net 0', net('M02') === 0);
      expect('M03 net 0', net('M03') === 0);
      expect('spending still 4200 after settle', budget.total_spending === 4200);
    }
  }

  const ok = messages.every((m) => m.startsWith('OK:'));
  return { ok, messages };
}

export async function clearHouseholdLedger(store: HouseholdStore): Promise<void> {
  await store.clearLedger();
}

async function seedPreSettlementExpenses(store: HouseholdStore): Promise<void> {
  await store.createExpense({
    title: 'Grocery trip',
    category: 'Groceries',
    amount: 780,
    payer_id: 'M01',
    split_type: 'equal',
    expense_date: '2026-03-01',
    shares: splitEqual(780, [...ALL_MEMBERS]),
  });
  await store.createExpense({
    title: 'Cleaning supplies',
    category: 'Cleaning',
    amount: 900,
    payer_id: 'M02',
    split_type: 'custom',
    expense_date: '2026-03-05',
    shares: splitCustom(900, [
      { member_id: 'M01', amount: 450 },
      { member_id: 'M02', amount: 450 },
    ]),
  });
  await store.createExpense({
    title: 'Internet bill',
    category: 'Utilities',
    amount: 1500,
    payer_id: 'M03',
    split_type: 'custom',
    expense_date: '2026-03-10',
    shares: splitCustom(1500, [
      { member_id: 'M01', amount: 500 },
      { member_id: 'M02', amount: 300 },
      { member_id: 'M03', amount: 700 },
    ]),
  });
  await store.createExpense({
    title: 'Electricity bill',
    category: 'Utilities',
    amount: 1020,
    payer_id: 'M01',
    split_type: 'equal',
    expense_date: '2026-03-15',
    shares: splitEqual(1020, [...ALL_MEMBERS]),
  });
}

async function seedPostSettlements(store: HouseholdStore): Promise<void> {
  const pay = async (sender_id: string, recipient_id: string, amount: number) => {
    const members = await store.getMembers();
    const memberIds = new Set(members.map((m) => m.id));
    const expenses = await store.listExpenses();
    const splits = await store.listExpenseSplits();
    const settlements = await store.listSettlements();
    const balances = computeBalances(members, expenses, splits, settlements);
    validateSettlement({ sender_id, recipient_id, amount, balances, memberIds });
    await store.addSettlement({ sender_id, recipient_id, amount });
  };

  await pay('M02', 'M01', 250);
  await pay('M02', 'M03', 200);
}

async function seedShoppingDemo(store: HouseholdStore): Promise<void> {
  await store.createShoppingItem({ title: 'Milk', unit: 'bottle', requested_qty: 2 });
  await store.createShoppingItem({ title: 'Rice', unit: 'bag', requested_qty: 1 });
}

async function seedPaisaTest(store: HouseholdStore): Promise<void> {
  await store.createExpense({
    title: 'Paisa test',
    category: 'Groceries',
    amount: 1000,
    payer_id: 'M01',
    split_type: 'equal',
    expense_date: '2026-03-20',
    shares: splitEqual(1000, [...ALL_MEMBERS]),
  });
}

export async function applyBenchmarkPreset(
  store: HouseholdStore,
  preset: BenchmarkPreset,
): Promise<BenchmarkSeedReport> {
  await clearHouseholdLedger(store);

  if (preset === 'empty') {
    return loadReport(store, preset);
  }

  if (preset === 'shopping_demo') {
    await seedShoppingDemo(store);
    return loadReport(store, preset);
  }

  if (preset === 'paisa_test') {
    await seedPaisaTest(store);
    return loadReport(store, preset);
  }

  if (preset === 'pre_settlement') {
    await seedPreSettlementExpenses(store);
    return loadReport(store, preset);
  }

  if (preset === 'post_settlement') {
    await seedPreSettlementExpenses(store);
    await seedPostSettlements(store);
    return loadReport(store, preset);
  }

  return loadReport(store, preset);
}
