import type { ExpenseCategory, ShoppingUnit } from '../../types/household';

export interface ExpenseTitlePreset {
  id: string;
  title: string;
  category?: ExpenseCategory;
  amount?: number;
}

/** NASCON benchmark bills + common flat costs. */
export const EXPENSE_TITLE_PRESETS: ExpenseTitlePreset[] = [
  { id: 'grocery', title: 'Grocery trip', category: 'Groceries', amount: 780 },
  { id: 'cleaning', title: 'Cleaning supplies', category: 'Cleaning', amount: 900 },
  { id: 'internet', title: 'Internet bill', category: 'Utilities', amount: 1500 },
  { id: 'electricity', title: 'Electricity bill', category: 'Utilities', amount: 1020 },
  { id: 'gas', title: 'Gas cylinder', category: 'Utilities', amount: 3200 },
  { id: 'maid', title: 'Maid salary', category: 'Cleaning', amount: 8000 },
];

export const EXPENSE_AMOUNT_CHIPS = [780, 900, 1020, 1500, 1000] as const;

export interface ShoppingQuickItem {
  id: string;
  title: string;
  unit: ShoppingUnit;
  requested_qty: number;
}

export const SHOPPING_QUICK_ITEMS: ShoppingQuickItem[] = [
  { id: 'milk', title: 'Milk', unit: 'bottle', requested_qty: 2 },
  { id: 'rice', title: 'Rice', unit: 'bag', requested_qty: 1 },
  { id: 'soap', title: 'Dish soap', unit: 'bottle', requested_qty: 1 },
  { id: 'eggs', title: 'Eggs', unit: 'dozen', requested_qty: 1 },
];

export const CHECKOUT_AMOUNT_CHIPS = [780, 500, 1000, 1500] as const;
export const TAX_PERCENT_CHIPS = [0, 5, 17] as const;
export const DISCOUNT_CHIPS = [0, 100, 200] as const;
export const SETTLE_AMOUNT_CHIPS = [250, 200] as const;

/** Custom split templates — member ids M01 Ali, M02 Ayesha, M03 Bilal. */
export interface CustomSplitTemplate {
  id: string;
  label: string;
  /** Must equal expense amount when applied. */
  totalAmount: number;
  shares: { member_id: string; amount: number }[];
}

export const CUSTOM_SPLIT_TEMPLATES: CustomSplitTemplate[] = [
  {
    id: 'internet_rubric',
    label: 'Internet (500/300/700)',
    totalAmount: 1500,
    shares: [
      { member_id: 'M01', amount: 500 },
      { member_id: 'M02', amount: 300 },
      { member_id: 'M03', amount: 700 },
    ],
  },
  {
    id: 'cleaning_two',
    label: 'Ali + Ayesha 450/450',
    totalAmount: 900,
    shares: [
      { member_id: 'M01', amount: 450 },
      { member_id: 'M02', amount: 450 },
    ],
  },
];
