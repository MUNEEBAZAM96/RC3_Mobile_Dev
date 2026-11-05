import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getMeta, setMeta } from '../database/repositories/meta';

interface OnboardingValue {
  ready: boolean;
  onboarded: boolean;
  complete: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    getMeta('onboarded')
      .then((value) => setOnboarded(value === '1'))
      .catch(() => setOnboarded(false))
      .finally(() => setReady(true));
  }, []);

  const complete = useCallback(async () => {
    await setMeta('onboarded', '1');
    setOnboarded(true);
  }, []);

  const value = useMemo(() => ({ ready, onboarded, complete }), [ready, onboarded, complete]);
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingValue {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return value;
}
