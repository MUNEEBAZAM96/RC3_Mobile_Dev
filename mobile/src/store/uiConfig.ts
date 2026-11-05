/**
 * Backwards-compatible alias. UI config (theme preset, colour mode, tab variant) now lives in
 * the persisted preferences store so appearance survives app restarts.
 */
export { usePreferences as useUiConfig, type ColorModePreference } from './preferences';
