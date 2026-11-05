export function formatPkr(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `PKR ${safe.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
