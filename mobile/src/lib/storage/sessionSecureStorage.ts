import AsyncStorage from "@react-native-async-storage/async-storage";
import { Counter, ModeOfOperation, utils } from "aes-js";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

import { SECURE_STORE_KEYS, STORAGE_KEYS } from "./keys";

// LargeSecureStore for the Supabase session (AC-7). A session is larger than SecureStore's
// ~2 KB value limit, so: the AES-256 key lives in the Keychain (expo-secure-store,
// WHEN_UNLOCKED_THIS_DEVICE_ONLY) and only ciphertext reaches AsyncStorage. No access/refresh
// token ever touches AsyncStorage in plain form.
//
// Stored format: `v1.<iv hex>.<ciphertext hex>`. Every write draws a fresh random 16-byte CTR
// counter (re-using a counter under one key would leak the XOR of two sessions). CTR has no
// integrity check, so the plaintext carries a fixed marker: a wrong key, garbage or tampered
// prefix decrypts to something without the marker and is treated as "no value" (AC-3).
//
// The stored value is untrusted input. Reading NEVER throws and never touches the network
// (AC-9): any failure means "no session" and wipes the leftovers.

const KEY_BYTES = 32;
const IV_BYTES = 16;
const FORMAT = "v1";
const MARKER = "tp-session:";
const KEY_HEX_LENGTH = KEY_BYTES * 2;
const HEX = /^[0-9a-f]+$/;

const SESSION_KEY = STORAGE_KEYS.session.key;
const SECURE_KEY = SECURE_STORE_KEYS.sessionEncryptionKey;
const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/** The subset of the supabase-js storage contract this module implements. */
export interface SessionStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

function isHex(value: string, expectedLength?: number): boolean {
  if (!HEX.test(value) || value.length % 2 !== 0) return false;
  return expectedLength === undefined || value.length === expectedLength;
}

// aes-js' own UTF-8 helpers mangle 4-byte characters (an emoji in `display_name` would corrupt
// the session), and TextEncoder/TextDecoder are not guaranteed on every Hermes target — so the
// codec goes through encodeURIComponent/decodeURIComponent, which are.
function utf8ToBytes(text: string): Uint8Array {
  const encoded = encodeURIComponent(text);
  const bytes: number[] = [];
  for (let i = 0; i < encoded.length; i += 1) {
    if (encoded[i] === "%") {
      bytes.push(parseInt(encoded.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(encoded.charCodeAt(i));
    }
  }
  return Uint8Array.from(bytes);
}

/** Throws `URIError` on invalid UTF-8 (callers treat any throw as "no session"). */
function bytesToUtf8(bytes: Uint8Array): string {
  let escaped = "";
  for (const byte of bytes) escaped += `%${byte.toString(16).padStart(2, "0")}`;
  return decodeURIComponent(escaped);
}

function markerBytes(): Uint8Array {
  return utf8ToBytes(MARKER);
}

function encrypt(key: Uint8Array, iv: Uint8Array, plaintext: string): string {
  const cipher = new ModeOfOperation.ctr(key, new Counter(iv));
  const bytes = cipher.encrypt(utf8ToBytes(MARKER + plaintext));
  return `${FORMAT}.${utils.hex.fromBytes(iv)}.${utils.hex.fromBytes(bytes)}`;
}

/** Returns the plaintext, or `null` for anything malformed, foreign or encrypted under another key. */
function decrypt(key: Uint8Array, stored: string): string | null {
  const parts = stored.split(".");
  if (parts.length !== 3 || parts[0] !== FORMAT) return null;
  const [, ivHex, cipherHex] = parts;
  if (ivHex === undefined || cipherHex === undefined) return null;
  if (!isHex(ivHex, IV_BYTES * 2) || !isHex(cipherHex)) return null;
  const marker = markerBytes();
  const cipher = new ModeOfOperation.ctr(key, new Counter(utils.hex.toBytes(ivHex)));
  const plain = cipher.decrypt(utils.hex.toBytes(cipherHex));
  if (plain.length < marker.length) return null;
  for (let i = 0; i < marker.length; i += 1) {
    if (plain[i] !== marker[i]) return null;
  }
  return bytesToUtf8(plain.slice(marker.length));
}

async function readEncryptionKey(): Promise<Uint8Array | null> {
  const hex = await SecureStore.getItemAsync(SECURE_KEY);
  if (hex === null || !isHex(hex, KEY_HEX_LENGTH)) return null;
  return utils.hex.toBytes(hex);
}

async function ensureEncryptionKey(): Promise<Uint8Array> {
  const existing = await readEncryptionKey();
  if (existing) return existing;
  const fresh = await Crypto.getRandomBytesAsync(KEY_BYTES);
  await SecureStore.setItemAsync(SECURE_KEY, utils.hex.fromBytes(fresh), SECURE_OPTIONS);
  return fresh;
}

/** Removes the ciphertext AND the Keychain key. Never throws; each half is attempted regardless. */
export async function clearStoredSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing more can be done; the key deletion below still runs.
  }
  try {
    await SecureStore.deleteItemAsync(SECURE_KEY);
  } catch {
    // Same: a failure to delete must not surface to the caller.
  }
}

export const sessionSecureStorage: SessionStorage = {
  async getItem(key) {
    if (key !== SESSION_KEY) return null;
    try {
      const stored = await AsyncStorage.getItem(SESSION_KEY);
      if (stored === null) return null;
      const encryptionKey = await readEncryptionKey();
      const plaintext = encryptionKey ? decrypt(encryptionKey, stored) : null;
      if (plaintext === null) await clearStoredSession();
      return plaintext;
    } catch {
      await clearStoredSession();
      return null;
    }
  },

  async setItem(key, value) {
    if (key !== SESSION_KEY) return;
    try {
      const encryptionKey = await ensureEncryptionKey();
      const iv = await Crypto.getRandomBytesAsync(IV_BYTES);
      const ciphertext = encrypt(encryptionKey, iv, value);
      await AsyncStorage.setItem(SESSION_KEY, ciphertext);
    } catch {
      // A fixed message: the original error is dropped so nothing session-related can leak.
      throw new Error("Session storage write failed");
    }
  },

  async removeItem(key) {
    if (key !== SESSION_KEY) return;
    await clearStoredSession();
  },
};

/**
 * The user of the locally stored session, for an offline cold start (AC-9): when the access
 * token has expired and the refresh cannot reach the network, the session is still good and the
 * app must open signed in. Local only — never touches the network, never throws. `null` when
 * there is no readable session or it carries no refresh token (nothing could ever renew it).
 * The user is untrusted JSON: the caller validates its shape.
 */
export async function readStoredSessionUser(): Promise<{ user: unknown } | null> {
  const raw = await sessionSecureStorage.getItem(SESSION_KEY);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    if (!("refresh_token" in parsed) || typeof parsed.refresh_token !== "string") return null;
    if (parsed.refresh_token === "" || !("user" in parsed)) return null;
    return { user: parsed.user };
  } catch {
    return null;
  }
}
