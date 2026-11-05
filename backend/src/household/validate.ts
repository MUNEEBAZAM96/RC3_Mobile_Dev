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
  tax_percent: z.number().nonnegative().optional(),
  discount_amount: z.number().nonnegative().optional(),
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

export const expenseProofUploadSchema = z.object({
  mime_type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  image_base64: z.string().min(1).max(7_000_000),
});

export const settleSchema = z.object({
  sender_id: z.string().min(1),
  recipient_id: z.string().min(1),
  amount: z.number().positive(),
});

const optionalTrimmed = z.string().trim().optional();

export const createMemberSchema = z.object({
  name: z.string().trim().min(1).max(80),
  id: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{1,32}$/)
      .optional(),
  ),
  phone: optionalTrimmed,
  email: z
    .string()
    .trim()
    .optional()
    .refine((v) => v === undefined || v === '' || z.string().email().safeParse(v).success, {
      message: 'Invalid email',
    }),
  notes: optionalTrimmed,
});

export const updateMemberSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    phone: z.string().trim().nullable().optional(),
    email: z
      .union([z.string().trim(), z.null()])
      .optional()
      .refine((v) => v === undefined || v === null || v === '' || z.string().email().safeParse(v).success, {
        message: 'Invalid email',
      }),
    notes: z.string().trim().nullable().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.phone !== undefined ||
      data.email !== undefined ||
      data.notes !== undefined,
    { message: 'At least one field is required to update a member.' },
  );
