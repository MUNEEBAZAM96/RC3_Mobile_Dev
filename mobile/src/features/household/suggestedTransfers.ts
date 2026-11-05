import type { BalanceRow } from '../../types/household';

export interface SuggestedTransfer {
  sender_id: string;
  recipient_id: string;
  amount: number;
}

/** Greedy debtor→creditor pairs for settle UI (display only; same idea as Smart Settle). */
export function buildSuggestedTransfers(balances: BalanceRow[], limit = 3): SuggestedTransfer[] {
  const debtors = balances
    .filter((b) => b.net_balance < -0.004)
    .map((b) => ({ id: b.member_id, amount: -b.net_balance }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = balances
    .filter((b) => b.net_balance > 0.004)
    .map((b) => ({ id: b.member_id, amount: b.net_balance }))
    .sort((a, b) => b.amount - a.amount);

  const out: SuggestedTransfer[] = [];
  let di = 0;
  let ci = 0;
  while (di < debtors.length && ci < creditors.length && out.length < limit) {
    const pay = Math.min(debtors[di].amount, creditors[ci].amount);
    const rounded = Math.round(pay * 100) / 100;
    if (rounded > 0) {
      out.push({
        sender_id: debtors[di].id,
        recipient_id: creditors[ci].id,
        amount: rounded,
      });
    }
    debtors[di].amount -= rounded;
    creditors[ci].amount -= rounded;
    if (debtors[di].amount < 0.005) di += 1;
    if (creditors[ci].amount < 0.005) ci += 1;
  }
  return out;
}
