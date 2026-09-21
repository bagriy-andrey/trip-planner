import AsyncStorage from "@react-native-async-storage/async-storage";

import { STORAGE_KEYS } from "./keys";
import { clearStoredSession } from "./sessionSecureStorage";

// The iOS Keychain survives app deletion, AsyncStorage does not (AC-6). So "no first-launch
// flag" == "fresh install": any Keychain leftovers (the session's AES key) and any ciphertext
// are wiped BEFORE the session is first read, then the flag is written. If AsyncStorage cannot
// be read the install is treated as fresh (fail closed: an unreadable store holds no usable
// session anyway).

const FLAG_VALUE = "1";

/** Returns `true` when leftovers were cleared (fresh install). Never throws. */
export async function ensureFreshInstallCleared(): Promise<boolean> {
  let alreadyLaunched = false;
  try {
    alreadyLaunched = (await AsyncStorage.getItem(STORAGE_KEYS.firstLaunch.key)) !== null;
  } catch {
    alreadyLaunched = false;
  }
  if (alreadyLaunched) return false;

  await clearStoredSession();
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.firstLaunch.key, FLAG_VALUE);
  } catch {
    // Without the flag the next launch clears again — harmless for a session that never persisted.
  }
  return true;
}
