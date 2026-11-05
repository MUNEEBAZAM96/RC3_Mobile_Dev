export function toPaisa(amount: number): number {
  return Math.round(amount * 100);
}

export function fromPaisa(paisa: number): number {
  return paisa / 100;
}

export function roundPkr(amount: number): number {
  return fromPaisa(toPaisa(amount));
}
