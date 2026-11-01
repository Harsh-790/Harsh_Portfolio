import { getSettings as getPublicSettings } from './public-content';
import { jsonArray, type Settings, type Stat } from './types';

export { DEFAULT_SETTINGS, SETTING_GROUPS, ACCENT_PRESETS, THEME_MODES } from './schemas';
export type { SettingField, SettingGroup, ThemeMode } from './schemas';

/**
 * Public settings come from the committed snapshot, never from the API.
 * Admin settings use getAdminSettings() in lib/content.ts instead.
 */
export function getSettings(): Settings {
  return getPublicSettings();
}

/** Parse the editable statistics block ("Label | Value | Note"). */
export function parseStats(value: string | undefined): Stat[] {
  return jsonArray<Stat>(value, []).filter((stat) => stat && stat.value);
}
