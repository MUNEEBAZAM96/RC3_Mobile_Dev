import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { items as itemRepository } from '../database/repositories/items';
import type { Item } from '../types/item';
import { errorMessage } from '../utils/format';

interface ItemsValue {
  items: Item[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (input: { title: string; notes: string }) => Promise<Item>;
  update: (id: string, input: { title: string; notes: string }) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const ItemsContext = createContext<ItemsValue | null>(null);

export function ItemsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setItems(await itemRepository.list());
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Could not read the local database.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (input: { title: string; notes: string }) => {
    const item = await itemRepository.create(input);
    setItems((current) => [item, ...current]);
    return item;
  }, []);

  const update = useCallback(async (id: string, input: { title: string; notes: string }) => {
    const item = await itemRepository.update(id, input);
    if (!item) return;
    setItems((current) => current.map((row) => (row.id === id ? item : row)));
  }, []);

  const remove = useCallback(async (id: string) => {
    await itemRepository.remove(id);
    setItems((current) => current.filter((row) => row.id !== id));
  }, []);

  useEffect(() => {
    let alive = true;
    itemRepository
      .list()
      .then((rows) => {
        if (!alive) return;
        setItems(rows);
        setError(null);
      })
      .catch((err) => {
        if (!alive) return;
        setError(errorMessage(err, 'Could not read the local database.'));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo(
    () => ({ items, loading, error, refresh, create, update, remove }),
    [items, loading, error, refresh, create, update, remove],
  );
  return <ItemsContext.Provider value={value}>{children}</ItemsContext.Provider>;
}

export function useItems(): ItemsValue {
  const value = useContext(ItemsContext);
  if (!value) throw new Error('useItems must be used inside ItemsProvider');
  return value;
}
