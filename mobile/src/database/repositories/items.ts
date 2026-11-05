import { createId } from '../../utils/format';
import type { Item } from '../../types/item';
import { getDb, initDb } from '../db';
import { getMeta, setMeta } from './meta';

interface ItemRow {
  id: string;
  title: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

function toItem(row: ItemRow): Item {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ItemRepository {
  list(): Promise<Item[]>;
  get(id: string): Promise<Item | null>;
  create(input: { title: string; notes: string }): Promise<Item>;
  update(id: string, input: { title: string; notes: string }): Promise<Item | null>;
  remove(id: string): Promise<void>;
}

export function createItemRepository(): ItemRepository {
  return {
    async list() {
      await initDb();
      const db = await getDb();
      if ((await getMeta('items_seeded')) !== '1') {
        const now = new Date().toISOString();
        const samples = [
          ['Welcome note', 'This row lives in SQLite on the device. Edit it or add your own.'],
          ['Hackathon idea', 'Swap this list for the domain you are building this weekend.'],
        ];
        for (const [title, notes] of samples) {
          await db.runAsync(
            'INSERT INTO items (id, title, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            [createId('item'), title, notes, now, now],
          );
        }
        await setMeta('items_seeded', '1');
      }
      const rows = await db.getAllAsync<ItemRow>('SELECT * FROM items ORDER BY updated_at DESC');
      return rows.map(toItem);
    },
    async get(id) {
      await initDb();
      const db = await getDb();
      const row = await db.getFirstAsync<ItemRow>('SELECT * FROM items WHERE id = ?', [id]);
      return row ? toItem(row) : null;
    },
    async create(input) {
      await initDb();
      const db = await getDb();
      const now = new Date().toISOString();
      const item: Item = { id: createId('item'), title: input.title.trim(), notes: input.notes.trim(), createdAt: now, updatedAt: now };
      await db.runAsync(
        'INSERT INTO items (id, title, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [item.id, item.title, item.notes, item.createdAt, item.updatedAt],
      );
      return item;
    },
    async update(id, input) {
      await initDb();
      const db = await getDb();
      const now = new Date().toISOString();
      const result = await db.runAsync(
        'UPDATE items SET title = ?, notes = ?, updated_at = ? WHERE id = ?',
        [input.title.trim(), input.notes.trim(), now, id],
      );
      if ((result.changes ?? 0) === 0) return null;
      return this.get(id);
    },
    async remove(id) {
      await initDb();
      const db = await getDb();
      await db.runAsync('DELETE FROM items WHERE id = ?', [id]);
    },
  };
}

export const items = createItemRepository();
