import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import { ensureFreshInstallCleared } from "../freshInstall";
import { SECURE_STORE_KEYS, STORAGE_KEYS } from "../keys";
import { sessionSecureStorage } from "../sessionSecureStorage";

const SESSION_KEY = STORAGE_KEYS.session.key;
const FLAG_KEY = STORAGE_KEYS.firstLaunch.key;
const AES_KEY_NAME = SECURE_STORE_KEYS.sessionEncryptionKey;

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});

describe("ensureFreshInstallCleared (AC-6)", () => {
  it("no launch flag: wipes the Keychain key and the ciphertext, then sets the flag", async () => {
    // A previous install left a session; AsyncStorage was wiped with the app, the Keychain was not.
    await sessionSecureStorage.setItem(SESSION_KEY, "{\"access_token\":\"leftover\"}");
    await AsyncStorage.removeItem(FLAG_KEY);

    await expect(ensureFreshInstallCleared()).resolves.toBe(true);

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(AES_KEY_NAME);
    expect(await SecureStore.getItemAsync(AES_KEY_NAME)).toBeNull();
    expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(FLAG_KEY)).not.toBeNull();
    await expect(sessionSecureStorage.getItem(SESSION_KEY)).resolves.toBeNull();
  });

  it("clears an orphaned Keychain key even when there is no blob at all (reinstall)", async () => {
    await SecureStore.setItemAsync(AES_KEY_NAME, "ab".repeat(32));
    await expect(ensureFreshInstallCleared()).resolves.toBe(true);
    expect(await SecureStore.getItemAsync(AES_KEY_NAME)).toBeNull();
  });

  it("flag present: nothing is cleared and the session survives", async () => {
    await ensureFreshInstallCleared();
    await sessionSecureStorage.setItem(SESSION_KEY, "keep-me");
    jest.clearAllMocks();

    await expect(ensureFreshInstallCleared()).resolves.toBe(false);

    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    await expect(sessionSecureStorage.getItem(SESSION_KEY)).resolves.toBe("keep-me");
  });

  it("only clears once: the second launch keeps a session written after the first", async () => {
    await expect(ensureFreshInstallCleared()).resolves.toBe(true);
    await sessionSecureStorage.setItem(SESSION_KEY, "after-first-launch");
    await expect(ensureFreshInstallCleared()).resolves.toBe(false);
    await expect(sessionSecureStorage.getItem(SESSION_KEY)).resolves.toBe("after-first-launch");
  });

  it("an unreadable AsyncStorage counts as fresh (fail closed) and never throws", async () => {
    await SecureStore.setItemAsync(AES_KEY_NAME, "ab".repeat(32));
    jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("boom"));
    await expect(ensureFreshInstallCleared()).resolves.toBe(true);
    expect(await SecureStore.getItemAsync(AES_KEY_NAME)).toBeNull();
  });

  it("a failing flag write does not throw", async () => {
    jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("disk full"));
    await expect(ensureFreshInstallCleared()).resolves.toBe(true);
  });
});
