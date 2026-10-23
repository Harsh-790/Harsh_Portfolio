import { backendJson } from './api';
import { jsonArray, type Settings, type Stat } from './types';

export { DEFAULT_SETTINGS, SETTING_GROUPS, ACCENT_PRESETS, THEME_MODES } from './schemas';
export type { SettingField, SettingGroup, ThemeMode } from './schemas';


/** All settings, resolved by the backend (database rows overriding defaults). */
export async function getSettings(): Promise<Settings> {
  return backendJson<Settings>('/api/public/settings');
}

/** Parse the editable statistics block ("Label | Value | Note"). */
export function parseStats(value: string | undefined): Stat[] {
  return jsonArray<Stat>(value, []).filter((stat) => stat && stat.value);
}
