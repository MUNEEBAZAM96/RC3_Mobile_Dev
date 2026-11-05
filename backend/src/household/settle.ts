import { AppError } from '../http/errors';
import { toPaisa } from './money';
import type { BalanceRow } from './types';

export function validateSettlement(input: {
  sender_id: string;
  recipient_id: string;
  amount: number;
  balances: BalanceRow[];
  memberIds: Set<string>;
}): void {
  const { sender_id, recipient_id, amount, balances, memberIds } = input;

  if (!memberIds.has(sender_id) || !memberIds.has(recipient_id)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Unknown household member.');
  }
  if (sender_id === recipient_id) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Sender and recipient must be different.');
  }
  if (toPaisa(amount) <= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Settlement amount must be positive.');
  }

  const sender = balances.find((row) => row.member_id === sender_id);
  const recipient = balances.find((row) => row.member_id === recipient_id);
  if (!sender || !recipient) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Could not resolve member balances.');
  }

  if (sender.net_balance >= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Sender does not owe money (net balance is not negative).');
  }
  if (recipient.net_balance <= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Recipient is not owed money (net balance is not positive).');
  }

  const maxFromDebtor = -sender.net_balance;
  const maxToCreditor = recipient.net_balance;
  if (amount > maxFromDebtor + 0.001) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Settlement exceeds what the sender owes.');
  }
  if (amount > maxToCreditor + 0.001) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Settlement exceeds what the recipient is owed.');
  }
}
