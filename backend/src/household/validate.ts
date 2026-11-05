import { z } from 'zod';

const shoppingUnit = z.enum(['pack', 'dozen', 'bottle', 'bag']);

export const createShoppingItemSchema = z.object({
  title: z.string().trim().min(1),
  unit: shoppingUnit,
  requested_qty: z.number().int().min(1),
});

export const checkoutSchema = z.object({
  item_ids: z.array(z.string().min(1)).min(1),
  total_paid: z.number().positive(),
  payer_id: z.string().min(1),
  split_members: z.array(z.string().min(1)).min(1),
});

export const expenseSchema = z
  .object({
    title: z.string().trim().min(1),
    category: z.string().trim().min(1),
    amount: z.number().positive(),
    payer_id: z.string().min(1),
    split_type: z.enum(['equal', 'custom']),
    split_members: z.array(z.string().min(1)).optional(),
    splits: z.array(z.object({ member_id: z.string().min(1), amount: z.number().nonnegative() })).optional(),
    date: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.split_type === 'equal' && (!data.split_members || data.split_members.length === 0)) {
      ctx.addIssue({ code: 'custom', message: 'split_members required for equal split', path: ['split_members'] });
    }
    if (data.split_type === 'custom' && (!data.splits || data.splits.length === 0)) {
      ctx.addIssue({ code: 'custom', message: 'splits required for custom split', path: ['splits'] });
    }
  });

export const settleSchema = z.object({
  sender_id: z.string().min(1),
  recipient_id: z.string().min(1),
  amount: z.number().positive(),
});
