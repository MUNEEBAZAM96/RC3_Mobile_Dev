import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import type { ReactNode } from 'react';

import { ThemeProvider } from '../../theme';
import { LoadingScreen } from '../ui';

export function FontGate({ children }: { children: ReactNode }) {
  const [loaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  return (
    <ThemeProvider fontsLoaded={loaded}>
      {loaded ? children : <LoadingScreen label="Loading fonts" />}
    </ThemeProvider>
  );
}
