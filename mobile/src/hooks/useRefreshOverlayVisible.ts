import { useEffect, useRef, useState } from 'react';

const DEFAULT_MIN_VISIBLE_MS = 400;

/** Keeps a refresh splash visible for at least `minVisibleMs` to avoid flashing. */
export function useRefreshOverlayVisible(
  refreshing: boolean,
  minVisibleMs = DEFAULT_MIN_VISIBLE_MS,
): boolean {
  const [visible, setVisible] = useState(false);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (refreshing) {
      startedAt.current = Date.now();
      setVisible(true);
      return;
    }
    if (!visible) return;
    const elapsed = Date.now() - (startedAt.current ?? Date.now());
    const delay = Math.max(0, minVisibleMs - elapsed);
    const timer = setTimeout(() => setVisible(false), delay);
    return () => clearTimeout(timer);
  }, [refreshing, minVisibleMs, visible]);

  return visible;
}
