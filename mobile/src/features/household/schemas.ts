import { z } from 'zod';

import { SHOPPING_UNITS } from '../../types/household';

/** Accepts "", "5", "5.5" and turns blanks into undefined so optional fields stay optional. */
const optionalNonNegativeNumber = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.coerce.number().nonnegative().optional(),
);

export const createShoppingItemSchema = z.object({
  title: z.string().trim().min(1, 'Enter an item title.'),
  unit: z.enum(SHOPPING_UNITS),
  requested_qty: z.coerce.number().int().min(1, 'Quantity must be at least 1.'),
});

export const checkoutSchema = z.object({
  item_ids: z.array(z.string()).min(1, 'Select at least one item.'),
  total_paid: z.coerce.number().positive('Enter the total paid.'),
  payer_id: z.string().min(1, 'Choose who paid.'),
  split_members: z.array(z.string()).min(1, 'Select members to split with.'),
  tax_percent: optionalNonNegativeNumber,
  discount_amount: optionalNonNegativeNumber,
});

export const expenseSchema = z
  .object({
    title: z.string().trim().min(1, 'Enter a title.'),
    category: z.string().trim().min(1, 'Pick a category.'),
    date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD.'),
    amount: z.coerce.number().positive('Amount must be greater than zero.'),
    payer_id: z.string().min(1, 'Choose who paid.'),
    split_type: z.enum(['equal', 'custom']),
    custom_splits: z.array(
      z.object({
        member_id: z.string(),
        amount: z.coerce.number().nonnegative(),
      }),
    ),
    equal_member_ids: z.array(z.string()),
    is_recurring: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.split_type === 'equal' && data.equal_member_ids.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Select members for an equal split.',
        path: ['equal_member_ids'],
      });
    }
    if (data.split_type === 'custom') {
      const sum = data.custom_splits.reduce((acc, row) => acc + row.amount, 0);
      const roundedSum = Math.round(sum * 100);
      const roundedAmount = Math.round(data.amount * 100);
      if (roundedSum !== roundedAmount) {
        ctx.addIssue({
          code: 'custom',
          message: 'Custom shares must add up to the expense amount.',
          path: ['custom_splits'],
        });
      }
    }
  });

export const settleSchema = z
  .object({
    sender_id: z.string().min(1, 'Choose who pays.'),
    recipient_id: z.string().min(1, 'Choose who receives.'),
    amount: z.coerce.number().positive('Enter a positive amount.'),
  })
  .refine((data) => data.sender_id !== data.recipient_id, {
    message: 'Sender and recipient must be different people.',
    path: ['recipient_id'],
  });
