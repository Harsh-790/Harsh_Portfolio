import { db } from './db';
import { DEFAULT_SETTINGS } from './schemas';
import { jsonArray, type Settings, type Stat } from './types';

export { DEFAULT_SETTINGS, SETTING_GROUPS, ACCENT_PRESETS, THEME_MODES } from './schemas';
export type { SettingField, SettingGroup, ThemeMode } from './schemas';

/** All settings, database rows overriding the defaults from default-settings.json. */
export async function getSettings(): Promise<Settings> {
  const rows = await db.setting.findMany();
  const merged: Settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) merged[row.key] = row.value;
  return merged;
}

export async function getSetting(key: string): Promise<string> {
  const row = await db.setting.findUnique({ where: { key } });
  return row?.value ?? DEFAULT_SETTINGS[key] ?? '';
}

/** Parse the editable statistics block ("Label | Value | Note"). */
export function parseStats(value: string | undefined): Stat[] {
  return jsonArray<Stat>(value, []).filter((stat) => stat && stat.value);
}
