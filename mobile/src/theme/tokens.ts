export interface ThemeColors {
  text: string;
  muted: string;
  background: string;
  card: string;
  surface: string;
  border: string;
  primary: string;
  primaryText: string;
  hero: string;
  tabActive: string;
  danger: string;
  success: string;
  warning: string;
  online: string;
  offline: string;
  syncing: string;
  /** Soft tint behind primary-coloured content (selected chips, hero wash). */
  primarySoft: string;
  /** Soft tints behind status text so pills stay readable in light and dark. */
  successSoft: string;
  warningSoft: string;
  dangerSoft: string;
  /** Text and icon colour on top of `hero`. */
  heroText: string;
}

/** @deprecated use ThemeColors from tokens */
export type LegacyThemeColors = ThemeColors;

export type SoftTokenKeys =
  'primarySoft' | 'successSoft' | 'warningSoft' | 'dangerSoft' | 'heroText';

/**
 * Fill soft tokens for presets that have not defined their own.
 * Keeps every preset type-complete without changing its existing palette.
 */
export function withSoftTokens(
  colors: Omit<ThemeColors, SoftTokenKeys> & Partial<Pick<ThemeColors, SoftTokenKeys>>,
): ThemeColors {
  return {
    ...colors,
    primarySoft: colors.primarySoft ?? colors.surface,
    successSoft: colors.successSoft ?? colors.surface,
    warningSoft: colors.warningSoft ?? colors.surface,
    dangerSoft: colors.dangerSoft ?? colors.surface,
    heroText: colors.heroText ?? colors.primaryText,
  };
}
