import { create } from 'zustand';

import { defaultAppConfig, type AppConfig, type TabBarVariant, type ThemePresetId } from '../config/app-config';

export type ColorModePreference = 'system' | 'light' | 'dark';

interface UiConfigState extends AppConfig {
  colorMode: ColorModePreference;
  setPresetId: (presetId: ThemePresetId) => void;
  setTabVariant: (tabVariant: TabBarVariant) => void;
  setTabLayout: (tabLayout: AppConfig['tabLayout']) => void;
  setColorMode: (colorMode: ColorModePreference) => void;
}

export const useUiConfig = create<UiConfigState>((set) => ({
  ...defaultAppConfig,
  colorMode: 'system',
  setPresetId: (presetId) => set({ presetId }),
  setTabVariant: (tabVariant) => set({ tabVariant }),
  setTabLayout: (tabLayout) => set({ tabLayout }),
  setColorMode: (colorMode) => set({ colorMode }),
}));
