import AsyncStorage from "@react-native-async-storage/async-storage";

import { THEME_STORAGE_KEY } from "@/lib/theme/preference";

// The ONLY module that touches AsyncStorage. The skeleton persists exactly one
// non-secret key (the theme choice, AC-33); anything else is refused. Adding a
// key here is a deliberate, reviewed decision — AsyncStorage is unencrypted.
export const ALLOWED_SETTING_KEYS = [THEME_STORAGE_KEY] as const;

export type SettingKey = (typeof ALLOWED_SETTING_KEYS)[number];

export interface WriteResult {
  ok: boolean;
}

function isAllowedKey(key: string): key is SettingKey {
  return (ALLOWED_SETTING_KEYS as readonly string[]).includes(key);
}

/** Returns the raw stored string, or `null` if missing, disallowed or unreadable. Never throws. */
export async function readSetting(key: SettingKey): Promise<string | null> {
  if (!isAllowedKey(key)) return null;
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Persists a value for an allowed key. Never throws; failure is reported via `ok: false`. */
export async function writeSetting(key: SettingKey, value: string): Promise<WriteResult> {
  if (!isAllowedKey(key)) return { ok: false };
  try {
    await AsyncStorage.setItem(key, value);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
