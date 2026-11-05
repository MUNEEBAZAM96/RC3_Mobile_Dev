/**
 * Client-side preview of the server's equal-split rule, for display only.
 *
 * Mirrors backend/src/household/split.ts: work in integer paisa, give every member the floor
 * share, then hand leftover paisa out one at a time in ascending member-ID order (M01, M02, M03).
 * PKR 1,000.00 across three members therefore previews as 333.34 / 333.33 / 333.33.
 *
 * The API performs the authoritative split when the expense is posted.
 */
export interface SplitPreviewShare {
  member_id: string;
  amount: number;
}

export function toPaisa(amount: number): number {
  return Math.round(amount * 100);
}

export function fromPaisa(paisa: number): number {
  return paisa / 100;
}

export function previewEqualSplit(
  totalAmount: number,
  memberIds: readonly string[],
): SplitPreviewShare[] {
  const unique = [...new Set(memberIds)].filter(Boolean).sort();
  if (unique.length === 0 || !Number.isFinite(totalAmount) || totalAmount <= 0) return [];
  const totalPaisa = toPaisa(totalAmount);
  const base = Math.floor(totalPaisa / unique.length);
  const remainder = totalPaisa - base * unique.length;
  return unique.map((member_id, index) => ({
    member_id,
    amount: fromPaisa(base + (index < remainder ? 1 : 0)),
  }));
}

/** Final checkout amount after optional receipt adjustments (Hour 3.5 option 2). */
export function previewCheckoutTotal(itemsTotal: number, taxPercent = 0, discount = 0): number {
  if (!Number.isFinite(itemsTotal) || itemsTotal <= 0) return 0;
  const taxed = toPaisa(itemsTotal) * (1 + (Number.isFinite(taxPercent) ? taxPercent : 0) / 100);
  const net = Math.round(taxed) - toPaisa(Number.isFinite(discount) ? discount : 0);
  return fromPaisa(Math.max(0, net));
}
