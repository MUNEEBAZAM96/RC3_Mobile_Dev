import { AppError } from '../http/errors';
import { fromPaisa, roundPkr, toPaisa } from './money';
import type { SplitShare } from './types';

/** Equal split: remainder paisa go to lowest member ids first (ascending sort). */
export function splitEqual(totalAmount: number, memberIds: string[]): SplitShare[] {
  const unique = [...new Set(memberIds)].filter(Boolean);
  if (unique.length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Select at least one member to split with.');
  }
  const sorted = [...unique].sort();
  const totalPaisa = toPaisa(totalAmount);
  const n = sorted.length;
  const base = Math.floor(totalPaisa / n);
  const remainder = totalPaisa - base * n;

  return sorted.map((member_id, index) => ({
    member_id,
    share_amount: fromPaisa(base + (index < remainder ? 1 : 0)),
  }));
}

export function splitCustom(
  totalAmount: number,
  splits: { member_id: string; amount: number }[],
): SplitShare[] {
  if (splits.length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Custom split requires at least one share.');
  }
  const sumPaisa = splits.reduce((acc, row) => acc + toPaisa(row.amount), 0);
  const totalPaisa = toPaisa(totalAmount);
  if (sumPaisa !== totalPaisa) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Custom shares must add up to the expense amount.');
  }
  return splits.map((row) => ({
    member_id: row.member_id,
    share_amount: roundPkr(row.amount),
  }));
}
