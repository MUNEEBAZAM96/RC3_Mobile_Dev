import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import type { ThemePresetId } from '../config/app-config';
import { useUiConfig } from '../store/uiConfig';
import { themePresets } from './presets';
import { radius } from './radius';
import { cardShadow } from './shadows';
import { fontFamily, typeScale, type TypeScale } from './typography';
import type { ThemeColors } from './tokens';

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const minTapTarget = 48;

export type { ThemeColors } from './tokens';
export { radius, cardShadow, fontFamily, themePresets };

export interface AppTheme {
  presetId: ThemePresetId;
  mode: 'light' | 'dark';
  colors: ThemeColors;
  spacing: typeof spacing;
  type: TypeScale;
  radius: typeof radius;
  minTapTarget: number;
  fontsLoaded: boolean;
}

const ThemeContext = createContext<AppTheme | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  fontsLoaded: boolean;
}

export function ThemeProvider({ children, fontsLoaded }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const { presetId, colorMode } = useUiConfig();

  const mode = colorMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : colorMode;
  const preset = themePresets[presetId] ?? themePresets.fintech;

  const value = useMemo<AppTheme>(
    () => ({
      presetId,
      mode,
      colors: mode === 'dark' ? preset.dark : preset.light,
      spacing,
      type: typeScale(fontsLoaded),
      radius,
      minTapTarget,
      fontsLoaded,
    }),
    [fontsLoaded, mode, preset.dark, preset.light, presetId],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): AppTheme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider');
  return theme;
}
