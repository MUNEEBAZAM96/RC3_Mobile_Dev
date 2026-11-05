import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { isDevSeedAllowed } from '../config';
import { parseBody } from '../http/validate';
import { applyBenchmarkPreset, clearHouseholdLedger, type BenchmarkPreset } from './benchmarkSeed';
import { buildBudgetSummary, computeBalances, totalHouseholdSpending } from './balances';
import type { HouseholdStore } from './types';

const BenchmarkBody = z.object({
  preset: z.enum(['empty', 'pre_settlement', 'post_settlement', 'shopping_demo', 'paisa_test']),
});

/** Hackathon demo routes — not for production unless ALLOW_DEV_SEED=true. No auth (household rubric). */
export function registerHouseholdDev(app: FastifyInstance, store: HouseholdStore): void {
  if (!isDevSeedAllowed()) return;

  app.post('/api/dev/seed-benchmark', async (request) => {
    const body = parseBody(BenchmarkBody, request.body);
    return applyBenchmarkPreset(store, body.preset as BenchmarkPreset);
  });

  app.post('/api/dev/reset-household', async () => {
    await clearHouseholdLedger(store);
    const members = await store.getMembers();
    const monthlyBudget = await store.getMonthlyBudget();
    const expenses = await store.listExpenses();
    const summary = buildBudgetSummary(monthlyBudget, totalHouseholdSpending(expenses));
    return { ok: true, members, budget: { summary } };
  });

  app.get('/api/dashboard', async () => {
    const members = await store.getMembers();
    const expenses = await store.listExpenses();
    const splits = await store.listExpenseSplits();
    const settlements = await store.listSettlements();
    const pending = await store.listShopping('pending');
    const monthlyBudget = await store.getMonthlyBudget();
    const totalSpending = totalHouseholdSpending(expenses);
    return {
      members,
      balances: computeBalances(members, expenses, splits, settlements),
      budget: { summary: buildBudgetSummary(monthlyBudget, totalSpending) },
      pending_shopping_count: pending.length,
      month_spending: totalSpending,
    };
  });
}
