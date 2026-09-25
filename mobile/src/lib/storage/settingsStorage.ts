import AsyncStorage from "@react-native-async-storage/async-storage";

import { STORAGE_KEYS } from "./keys";

// Plain (unencrypted) settings boundary: ONLY non-secret preferences pass through here — today
// the theme choice (SPEC-01 AC-33). The other registry keys have their own writers in this
// folder (`sessionSecureStorage` for the encrypted session, `freshInstall` for the launch flag).
// Adding a key is a deliberate, reviewed decision — AsyncStorage is unencrypted — and secret
// keys must never be listed here (`guardrails.test.ts` checks it against `keys.ts`).
export const ALLOWED_SETTING_KEYS = [STORAGE_KEYS.theme.key, STORAGE_KEYS.language.key] as const;

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
