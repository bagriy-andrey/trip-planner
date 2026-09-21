import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

import { SECURE_STORE_KEYS, STORAGE_KEYS } from "../keys";
import { clearStoredSession, sessionSecureStorage } from "../sessionSecureStorage";

const SESSION_KEY = STORAGE_KEYS.session.key;
const AES_KEY_NAME = SECURE_STORE_KEYS.sessionEncryptionKey;

const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiJ9.ACCESS-TOKEN-PAYLOAD.signature";
const REFRESH_TOKEN = "REFRESH-TOKEN-abc123";
// Well over SecureStore's ~2 KB limit, with non-ASCII and an emoji (display names are free text).
const SESSION_JSON = JSON.stringify({
  access_token: ACCESS_TOKEN,
  refresh_token: REFRESH_TOKEN,
  user: { email: "anna@example.com", user_metadata: { display_name: "Анна 🌍" } },
  padding: "x".repeat(3000),
});

beforeEach(async () => {
  await AsyncStorage.clear();
});

async function storedBlob(): Promise<string | null> {
  return AsyncStorage.getItem(SESSION_KEY);
}

describe("sessionSecureStorage: round trip (AC-7)", () => {
  it("returns exactly what was written, including a value far over 2 KB", async () => {
    await sessionSecureStorage.setItem(SESSION_KEY, SESSION_JSON);
    await expect(sessionSecureStorage.getItem(SESSION_KEY)).resolves.toBe(SESSION_JSON);
  });

  it("keeps working across a second write (the key is reused, the blob replaced)", async () => {
    await sessionSecureStorage.setItem(SESSION_KEY, "first");
    const keyAfterFirst = await SecureStore.getItemAsync(AES_KEY_NAME);
    await sessionSecureStorage.setItem(SESSION_KEY, "second");
    expect(await SecureStore.getItemAsync(AES_KEY_NAME)).toBe(keyAfterFirst);
    await expect(sessionSecureStorage.getItem(SESSION_KEY)).resolves.toBe("second");
  });

  it("never leaves a token, an email or JSON in plain form in AsyncStorage", async () => {
    await sessionSecureStorage.setItem(SESSION_KEY, SESSION_JSON);
    const everything = JSON.stringify(
      await AsyncStorage.multiGet((await AsyncStorage.getAllKeys()) as string[]),
    );
    expect(everything).not.toContain(ACCESS_TOKEN);
    expect(everything).not.toContain("ACCESS-TOKEN-PAYLOAD");
    expect(everything).not.toContain(REFRESH_TOKEN);
    expect(everything).not.toContain("anna@example.com");
    expect(everything).not.toContain("access_token");
    expect(await AsyncStorage.getAllKeys()).toEqual([SESSION_KEY]);
  });

  it("puts only a 256-bit key (never session data) into the Keychain, device-only", async () => {
    await sessionSecureStorage.setItem(SESSION_KEY, SESSION_JSON);
    const aesKey = await SecureStore.getItemAsync(AES_KEY_NAME);
    expect(aesKey).toMatch(/^[0-9a-f]{64}$/);
    expect(aesKey).not.toContain("ACCESS");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(AES_KEY_NAME, aesKey, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  });

  it("draws the key (32 bytes) and a per-write counter (16 bytes) from expo-crypto", async () => {
    await sessionSecureStorage.setItem(SESSION_KEY, "v");
    expect(Crypto.getRandomBytesAsync).toHaveBeenCalledWith(32);
    expect(Crypto.getRandomBytesAsync).toHaveBeenCalledWith(16);
  });

  it("ignores keys other than the session key", async () => {
    await sessionSecureStorage.setItem("some-other-key", "secret");
    await expect(AsyncStorage.getAllKeys()).resolves.toEqual([]);
    await AsyncStorage.setItem("some-other-key", "keep");
    await expect(sessionSecureStorage.getItem("some-other-key")).resolves.toBeNull();
    await sessionSecureStorage.removeItem("some-other-key");
    await expect(AsyncStorage.getItem("some-other-key")).resolves.toBe("keep");
  });

  it("throws a fixed, value-free error when the write itself fails", async () => {
    jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error(`disk full ${ACCESS_TOKEN}`));
    const failure = await sessionSecureStorage.setItem(SESSION_KEY, SESSION_JSON).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe("Session storage write failed");
    expect((failure as Error).message).not.toContain(ACCESS_TOKEN);
  });
});

describe("sessionSecureStorage: unreadable values mean 'no session' and get wiped (AC-3)", () => {
  async function seedValid(): Promise<string> {
    await sessionSecureStorage.setItem(SESSION_KEY, SESSION_JSON);
    const blob = await storedBlob();
    if (blob === null) throw new Error("seed failed");
    return blob;
  }

  async function expectWiped(): Promise<void> {
    expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();
    expect(await SecureStore.getItemAsync(AES_KEY_NAME)).toBeNull();
  }

  it("returns null for an empty store, without touching anything", async () => {
    await expect(sessionSecureStorage.getItem(SESSION_KEY)).resolves.toBeNull();
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it("garbage in AsyncStorage: null, and leftovers are cleared", async () => {
    await seedValid();
    await AsyncStorage.setItem(SESSION_KEY, "this is not ciphertext");
    await expect(sessionSecureStorage.getItem(SESSION_KEY)).resolves.toBeNull();
    await expectWiped();
  });

  it.each([
    ["wrong version", (b: string) => b.replace(/^v1/, "v9")],
    ["missing part", (b: string) => b.split(".").slice(0, 2).join(".")],
    ["extra part", (b: string) => `${b}.00`],
    ["non-hex counter", (b: string) => b.replace(/^v1\.[0-9a-f]{2}/, "v1.zz")],
    ["short counter", (b: string) => b.replace(/^(v1\.)[0-9a-f]{4}/, "$1")],
    ["odd-length ciphertext", (b: string) => `${b}0`],
    ["empty ciphertext", (b: string) => `${b.split(".").slice(0, 2).join(".")}.`],
    [
      "flipped ciphertext prefix (marker destroyed)",
      (b: string) => {
        const [v, iv, ct = ""] = b.split(".");
        return `${v}.${iv}.${ct.startsWith("00") ? "ff" : "00"}${ct.slice(2)}`;
      },
    ],
  ])("malformed blob (%s): null and cleared", async (_name, corrupt) => {
    const blob = await seedValid();
    await AsyncStorage.setItem(SESSION_KEY, corrupt(blob));
    await expect(sessionSecureStorage.getItem(SESSION_KEY)).resolves.toBeNull();
    await expectWiped();
  });

  it("ciphertext whose Keychain key is gone: null, blob cleared", async () => {
    await seedValid();
    await SecureStore.deleteItemAsync(AES_KEY_NAME);
    await expect(sessionSecureStorage.getItem(SESSION_KEY)).resolves.toBeNull();
    await expectWiped();
  });

  it("ciphertext encrypted under a foreign key: null, cleared", async () => {
    await seedValid();
    await SecureStore.setItemAsync(AES_KEY_NAME, "ab".repeat(32));
    await expect(sessionSecureStorage.getItem(SESSION_KEY)).resolves.toBeNull();
    await expectWiped();
  });

  it("a corrupt Keychain key value: null, cleared", async () => {
    await seedValid();
    await SecureStore.setItemAsync(AES_KEY_NAME, "not-a-key");
    await expect(sessionSecureStorage.getItem(SESSION_KEY)).resolves.toBeNull();
    await expectWiped();
  });

  it("AsyncStorage failing on read: null, never throws", async () => {
    await seedValid();
    jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("boom"));
    await expect(sessionSecureStorage.getItem(SESSION_KEY)).resolves.toBeNull();
  });

  it("Keychain failing on read: null, never throws", async () => {
    await seedValid();
    jest.spyOn(SecureStore, "getItemAsync").mockRejectedValueOnce(new Error("locked"));
    await expect(sessionSecureStorage.getItem(SESSION_KEY)).resolves.toBeNull();
  });

  it("clearing survives a failing store and still attempts the other half", async () => {
    await seedValid();
    jest.spyOn(AsyncStorage, "removeItem").mockRejectedValueOnce(new Error("boom"));
    await expect(clearStoredSession()).resolves.toBeUndefined();
    expect(await SecureStore.getItemAsync(AES_KEY_NAME)).toBeNull();
  });
});

describe("sessionSecureStorage: removal", () => {
  it("removeItem deletes both the ciphertext and the Keychain key", async () => {
    await sessionSecureStorage.setItem(SESSION_KEY, SESSION_JSON);
    await sessionSecureStorage.removeItem(SESSION_KEY);
    expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();
    expect(await SecureStore.getItemAsync(AES_KEY_NAME)).toBeNull();
    await expect(sessionSecureStorage.getItem(SESSION_KEY)).resolves.toBeNull();
  });
});

describe("sessionSecureStorage: restore needs no network (AC-9)", () => {
  it("reads and writes without a single fetch / XHR", async () => {
    const fetchSpy = jest.fn();
    const original = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    try {
      await sessionSecureStorage.setItem(SESSION_KEY, SESSION_JSON);
      await expect(sessionSecureStorage.getItem(SESSION_KEY)).resolves.toBe(SESSION_JSON);
      await sessionSecureStorage.getItem(SESSION_KEY);
      await sessionSecureStorage.removeItem(SESSION_KEY);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = original;
    }
  });
});
