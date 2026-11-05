import { create } from 'zustand';

export type ToastTone = 'success' | 'info' | 'danger';

export interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  current: ToastMessage | null;
  show: (message: string, tone?: ToastTone, durationMs?: number) => void;
  hide: () => void;
}

let counter = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

/** App-wide transient banner ("Saved", "Checkout complete"). Rendered once by <Toast /> in the root shell. */
export const useToast = create<ToastState>((set) => ({
  current: null,
  show: (message, tone = 'success', durationMs = 2200) => {
    if (timer) clearTimeout(timer);
    const id = ++counter;
    set({ current: { id, message, tone } });
    timer = setTimeout(() => {
      set((state) => (state.current?.id === id ? { current: null } : state));
      timer = null;
    }, durationMs);
  },
  hide: () => {
    if (timer) clearTimeout(timer);
    timer = null;
    set({ current: null });
  },
}));

/** Imperative helper for non-component code paths. */
export function showToast(message: string, tone: ToastTone = 'success'): void {
  useToast.getState().show(message, tone);
}
