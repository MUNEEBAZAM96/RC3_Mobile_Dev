import { getDb, initDb } from '../db';

export async function getMeta(key: string): Promise<string | null> {
  await initDb();
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM local_meta WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await initDb();
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO local_meta (key, value) VALUES (?, ?)', [key, value]);
}

export async function deviceId(): Promise<string> {
  const existing = await getMeta('device_id');
  if (existing) return existing;
  const id = `device-${Date.now().toString(36)}`;
  await setMeta('device_id', id);
  return id;
}
