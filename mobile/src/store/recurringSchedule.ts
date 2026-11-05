import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createId } from '../utils/format';

export interface RecurringTemplate {
  id: string;
  title: string;
  amount: number;
  payerName: string;
  payerId?: string;
  /** 1–28 so every month has the day. */
  dayOfMonth: number;
  /** ISO timestamp of when the template was saved. Dues are not shown before this month. */
  createdAt: string;
}

export type NewRecurringTemplate = Omit<RecurringTemplate, 'id' | 'createdAt' | 'dayOfMonth'> & {
  dayOfMonth: number;
};

const STORAGE_KEY = 'gharsplit.recurring.v1';
export const MAX_DUE_DAY = 28;

export function clampDueDay(day: number): number {
  if (!Number.isFinite(day)) return 1;
  return Math.min(MAX_DUE_DAY, Math.max(1, Math.round(day)));
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

interface RecurringScheduleState {
  templates: RecurringTemplate[];
  /** Adds a template or replaces the one with the same title. */
  upsertTemplate: (input: NewRecurringTemplate) => RecurringTemplate;
  removeTemplate: (id: string) => void;
  clear: () => void;
}

/**
 * Monthly bills the user marked as recurring on this phone. The API currently ignores
 * `is_recurring`, so this is the only place the calendar can learn when a bill is due.
 */
export const useRecurringSchedule = create<RecurringScheduleState>()(
  persist(
    (set, get) => ({
      templates: [],
      upsertTemplate: (input) => {
        const key = normalizeTitle(input.title);
        const existing = get().templates.find((t) => normalizeTitle(t.title) === key);
        const next: RecurringTemplate = {
          id: existing?.id ?? createId('rec'),
          title: input.title.trim(),
          amount: Math.round(input.amount * 100) / 100,
          payerName: input.payerName,
          payerId: input.payerId,
          dayOfMonth: clampDueDay(input.dayOfMonth),
          createdAt: existing?.createdAt ?? new Date().toISOString(),
        };
        set((state) => ({
          templates: [next, ...state.templates.filter((t) => t.id !== next.id)],
        }));
        return next;
      },
      removeTemplate: (id) =>
        set((state) => ({ templates: state.templates.filter((t) => t.id !== id) })),
      clear: () => set({ templates: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ templates: state.templates }),
    },
  ),
);

export function upsertRecurringTemplate(input: NewRecurringTemplate): RecurringTemplate {
  return useRecurringSchedule.getState().upsertTemplate(input);
}
