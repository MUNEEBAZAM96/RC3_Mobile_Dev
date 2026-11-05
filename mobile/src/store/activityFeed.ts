import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createId } from '../utils/format';

export type ActivityType = 'expense' | 'checkout' | 'settle' | 'shopping_added';

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  title: string;
  amount?: number;
  memberName?: string;
  /** ISO timestamp */
  createdAt: string;
}

export type NewActivityEvent = Omit<ActivityEvent, 'id' | 'createdAt'> &
  Partial<Pick<ActivityEvent, 'id' | 'createdAt'>>;

const STORAGE_KEY = 'gharsplit.activity.v1';
const MAX_EVENTS = 50;

interface ActivityFeedState {
  events: ActivityEvent[];
  pushEvent: (event: NewActivityEvent) => void;
  clear: () => void;
}

/**
 * On-device timeline of what this phone did in the flat ledger (checkout, expenses, settlements).
 * Newest first, capped at 50, persisted so it survives restarts. The API remains the source of
 * truth for balances; this is a human-readable trail for the Home preview and the Flat feed.
 */
export const useActivityFeed = create<ActivityFeedState>()(
  persist(
    (set) => ({
      events: [],
      pushEvent: (event) =>
        set((state) => ({
          events: [
            {
              ...event,
              id: event.id ?? createId('act'),
              createdAt: event.createdAt ?? new Date().toISOString(),
            },
            ...state.events,
          ].slice(0, MAX_EVENTS),
        })),
      clear: () => set({ events: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ events: state.events }),
    },
  ),
);

/** Imperative helper for components that already know the outcome of an API call. */
export function pushEvent(event: NewActivityEvent): void {
  useActivityFeed.getState().pushEvent(event);
}

export function listEvents(): ActivityEvent[] {
  return useActivityFeed.getState().events;
}
