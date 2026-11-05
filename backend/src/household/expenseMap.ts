import { roundPkr } from './money';
import type { ExpenseRecord } from './types';

export const EXPENSE_LIST_SELECT_SQLITE =
  'id, title, category, amount, payer_id, split_type, expense_date, proof_url, proof_public_id';

export const EXPENSE_LIST_SELECT_POSTGRES = `
  id, title, category, amount::float8 AS amount, payer_id, split_type,
  expense_date::text AS expense_date, proof_url, proof_public_id
`;

export function mapExpenseRow(row: {
  id: string;
  title: string;
  category: string;
  amount: number;
  payer_id: string;
  split_type: string;
  expense_date: string;
  proof_url?: string | null;
  proof_public_id?: string | null;
}): ExpenseRecord {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    amount: roundPkr(Number(row.amount)),
    payer_id: row.payer_id,
    split_type: row.split_type as ExpenseRecord['split_type'],
    expense_date: row.expense_date,
    proof_url: row.proof_url ?? null,
    proof_public_id: row.proof_public_id ?? null,
  };
}
