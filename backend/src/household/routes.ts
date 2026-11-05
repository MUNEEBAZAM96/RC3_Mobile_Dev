/**
 * NASCON Shared Living API — curl smoke test (members seeded as M01–M03):
 * GET  /api/members
 * POST /api/members
 * PATCH /api/members/:id
 * GET  /api/expenses
 * POST /api/expenses  (benchmark bills)
 * POST /api/expenses/:id/proof
 * GET  /api/balances
 * POST /api/settle
 * GET  /api/budget/summary
 */
import type { FastifyInstance } from 'fastify';

import { AppError } from '../http/errors';
import { parseBody } from '../http/validate';
import { buildBudgetSummary, computeBalances, totalHouseholdSpending } from './balances';
import { checkoutTotalFromReceipt } from './money';
import { splitCustom, splitEqual } from './split';
import { validateSettlement } from './settle';
import { registerHouseholdDev } from './devRoutes';
import type { HouseholdStore } from './types';
import {
  checkoutSchema,
  createMemberSchema,
  createShoppingItemSchema,
  expenseProofUploadSchema,
  expenseSchema,
  settleSchema,
  updateMemberSchema,
} from './validate';
import { decodeProofImageBase64, uploadExpenseProof } from '../media/cloudinary';

export function registerHousehold(app: FastifyInstance, store: HouseholdStore): void {
  registerHouseholdDev(app, store);

  app.get('/api/members', async () => {
    const members = await store.getMembers();
    return { members };
  });

  // Hackathon: no auth on household routes per rubric.
  app.post('/api/members', async (request) => {
    const body = parseBody(createMemberSchema, request.body);
    const member = await store.createMember(body);
    return { member };
  });

  app.patch<{ Params: { id: string } }>('/api/members/:id', async (request) => {
    const id = request.params.id.trim();
    if (!id) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Member id is required.');
    }
    const body = parseBody(updateMemberSchema, request.body);
    const member = await store.updateMember(id, body);
    return { member };
  });

  app.get<{ Querystring: { status?: string } }>('/api/shopping', async (request) => {
    const status = request.query.status;
    const items =
      status === 'pending' || status === 'bought' ? await store.listShopping(status) : await store.listShopping();
    return { items };
  });

  app.post('/api/shopping', async (request) => {
    const body = parseBody(createShoppingItemSchema, request.body);
    const item = await store.createShoppingItem(body);
    return { item };
  });

  app.post('/api/shopping/checkout', async (request, reply) => {
    const body = parseBody(checkoutSchema, request.body);
    const amount = checkoutTotalFromReceipt(
      body.total_paid,
      body.tax_percent ?? 0,
      body.discount_amount ?? 0,
    );
    await store.checkout({
      item_ids: body.item_ids,
      total_paid: amount,
      payer_id: body.payer_id,
      split_members: body.split_members,
    });
    return reply.status(200).send({ ok: true });
  });

  // Hackathon: no auth — shared ledger for every household client on this API.
  app.get('/api/expenses', async () => {
    const expenses = await store.listExpenses();
    return { expenses };
  });

  app.post('/api/expenses', async (request) => {
    const body = parseBody(expenseSchema, request.body);
    const expenseDate = body.date && body.date.length > 0 ? body.date : new Date().toISOString().slice(0, 10);
    const shares =
      body.split_type === 'equal'
        ? splitEqual(body.amount, body.split_members ?? [])
        : splitCustom(body.amount, body.splits ?? []);

    const expense = await store.createExpense({
      title: body.title,
      category: body.category,
      amount: body.amount,
      payer_id: body.payer_id,
      split_type: body.split_type,
      expense_date: expenseDate,
      shares,
    });
    return { expense };
  });

  app.post<{ Params: { id: string } }>('/api/expenses/:id/proof', async (request) => {
    const id = request.params.id.trim();
    if (!id) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Expense id is required.');
    }
    const existing = await store.getExpense(id);
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Expense not found.');
    }
    const body = parseBody(expenseProofUploadSchema, request.body);
    const buffer = decodeProofImageBase64(body.image_base64);
    const uploaded = await uploadExpenseProof({
      expenseId: id,
      buffer,
      mimeType: body.mime_type,
    });
    const expense = await store.setExpenseProof(id, {
      proof_url: uploaded.url,
      proof_public_id: uploaded.public_id,
    });
    return { expense };
  });

  app.get('/api/balances', async () => {
    const members = await store.getMembers();
    const expenses = await store.listExpenses();
    const splits = await store.listExpenseSplits();
    const settlements = await store.listSettlements();
    const balances = computeBalances(members, expenses, splits, settlements);
    return { balances };
  });

  app.post('/api/settle', async (request, reply) => {
    const body = parseBody(settleSchema, request.body);
    const members = await store.getMembers();
    const memberIds = new Set(members.map((m) => m.id));
    const expenses = await store.listExpenses();
    const splits = await store.listExpenseSplits();
    const settlements = await store.listSettlements();
    const balances = computeBalances(members, expenses, splits, settlements);

    validateSettlement({
      sender_id: body.sender_id,
      recipient_id: body.recipient_id,
      amount: body.amount,
      balances,
      memberIds,
    });

    await store.addSettlement(body);
    return reply.status(200).send({ ok: true });
  });

  app.get('/api/budget/summary', async () => {
    const monthlyBudget = await store.getMonthlyBudget();
    const expenses = await store.listExpenses();
    const totalSpending = totalHouseholdSpending(expenses);
    const summary = buildBudgetSummary(monthlyBudget, totalSpending);
    return { summary };
  });

  // Hour 3.5 — Smart Settle (Annexure Option 1)
  app.get('/api/balances/simplify', async (_request, reply) => {
    return reply.status(501).send({
      error: { code: 'NOT_IMPLEMENTED', message: 'Smart Settle will be added at hour 3.5.' },
    });
  });

  app.get('/api/budget/categories', async () => ({ categories: [] }));

  app.post('/api/expenses/recurring/apply', async () => ({ created: 0 }));
}
