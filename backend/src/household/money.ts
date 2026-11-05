export function toPaisa(amount: number): number {
  return Math.round(amount * 100);
}

export function fromPaisa(paisa: number): number {
  return paisa / 100;
}

export function roundPkr(amount: number): number {
  return fromPaisa(toPaisa(amount));
}

/** Receipt adjustments for shopping checkout (matches mobile previewCheckoutTotal). */
export function checkoutTotalFromReceipt(
  itemsTotal: number,
  taxPercent = 0,
  discount = 0,
): number {
  if (!Number.isFinite(itemsTotal) || itemsTotal <= 0) return 0;
  const taxed = toPaisa(itemsTotal) * (1 + (Number.isFinite(taxPercent) ? taxPercent : 0) / 100);
  const net = Math.round(taxed) - toPaisa(Number.isFinite(discount) ? discount : 0);
  return roundPkr(Math.max(0, fromPaisa(net)));
}
