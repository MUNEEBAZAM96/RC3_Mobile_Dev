import type { ThemePresetId } from '../theme/presets';

export type { ThemePresetId };

export type TabBarVariant = 'standard' | 'floating' | 'centerAction';

export interface AppConfig {
  presetId: ThemePresetId;
  tabVariant: TabBarVariant;
  tabLayout: 'sharedLiving3' | 'fintech5' | 'classic3';
}

export const defaultAppConfig: AppConfig = {
  presetId: 'fintech',
  tabVariant: 'standard',
  tabLayout: 'sharedLiving3',
};
