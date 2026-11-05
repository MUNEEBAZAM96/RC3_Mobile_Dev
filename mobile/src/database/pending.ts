import { createId } from '../utils/format';
import { getDb, initDb } from './db';

export interface PendingAction {
  action_id: string;
  type: string;
  queued_at: string;
  payload: Record<string, unknown>;
}

export async function enqueue(type: string, payload: Record<string, unknown>): Promise<PendingAction> {
  await initDb();
  const action: PendingAction = {
    action_id: createId('act'),
    type,
    queued_at: new Date().toISOString(),
    payload,
  };
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO pending_actions (action_id, body, created_at) VALUES (?, ?, ?)', [
    action.action_id,
    JSON.stringify(action),
    action.queued_at,
  ]);
  return action;
}

export async function listPending(): Promise<PendingAction[]> {
  await initDb();
  const db = await getDb();
  const rows = await db.getAllAsync<{ body: string }>('SELECT body FROM pending_actions ORDER BY created_at ASC');
  return rows.map((row) => JSON.parse(row.body) as PendingAction);
}

export async function removePending(actionId: string): Promise<void> {
  await initDb();
  const db = await getDb();
  await db.runAsync('DELETE FROM pending_actions WHERE action_id = ?', [actionId]);
}

export async function clearPending(): Promise<void> {
  await initDb();
  const db = await getDb();
  await db.runAsync('DELETE FROM pending_actions');
}
