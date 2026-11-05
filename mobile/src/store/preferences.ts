import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  defaultAppConfig,
  type AppConfig,
  type TabBarVariant,
  type ThemePresetId,
} from '../config/app-config';

export type ColorModePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'gharsplit.preferences.v1';

interface PreferencesState extends AppConfig {
  colorMode: ColorModePreference;
  /** Roommate identity for chat and AI (M01 | M02 | M03). Separate from Home "Viewing as". */
  linkedMemberId: string | null;
  /** True once the one-time "link your roommate identity" prompt has been shown. */
  linkedMemberPromptDone: boolean;
  /** True after persisted values have been read from the device. */
  hydrated: boolean;
  setPresetId: (presetId: ThemePresetId) => void;
  setTabVariant: (tabVariant: TabBarVariant) => void;
  setTabLayout: (tabLayout: AppConfig['tabLayout']) => void;
  setColorMode: (colorMode: ColorModePreference) => void;
  setLinkedMemberId: (memberId: string | null) => void;
  setLinkedMemberPromptDone: (done: boolean) => void;
  resetAppearance: () => void;
}

/**
 * Device-level preferences. Appearance and the linked roommate identity survive restarts
 * through AsyncStorage; everything else is in-memory UI config.
 */
export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      ...defaultAppConfig,
      colorMode: 'system',
      linkedMemberId: null,
      linkedMemberPromptDone: false,
      hydrated: false,
      setPresetId: (presetId) => set({ presetId }),
      setTabVariant: (tabVariant) => set({ tabVariant }),
      setTabLayout: (tabLayout) => set({ tabLayout }),
      setColorMode: (colorMode) => set({ colorMode }),
      setLinkedMemberId: (linkedMemberId) => set({ linkedMemberId }),
      setLinkedMemberPromptDone: (linkedMemberPromptDone) => set({ linkedMemberPromptDone }),
      resetAppearance: () => set({ colorMode: 'system', presetId: defaultAppConfig.presetId }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        colorMode: state.colorMode,
        presetId: state.presetId,
        linkedMemberId: state.linkedMemberId,
        linkedMemberPromptDone: state.linkedMemberPromptDone,
      }),
      onRehydrateStorage: () => () => {
        usePreferences.setState({ hydrated: true });
      },
    },
  ),
);

/**
 * Resolves once persisted preferences are in the store (or after a short grace period if
 * storage is unavailable), so the first frame renders with the user's saved theme.
 */
export function hydratePreferences(timeoutMs = 1500): Promise<void> {
  if (usePreferences.persist.hasHydrated()) {
    usePreferences.setState({ hydrated: true });
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      unsubscribe();
      usePreferences.setState({ hydrated: true });
      resolve();
    };
    const unsubscribe = usePreferences.persist.onFinishHydration(finish);
    setTimeout(finish, timeoutMs);
  });
}
