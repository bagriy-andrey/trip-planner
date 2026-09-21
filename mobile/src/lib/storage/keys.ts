import { THEME_STORAGE_KEY } from "@/lib/theme/preference";

/**
 * Registry of EVERY AsyncStorage key the app writes. AsyncStorage is unencrypted, so a key is
 * added here only as a deliberate, reviewed decision: `guardrails.test.ts` pins this registry to
 * exactly three entries and checks that no `secret` key is ever written in plain form.
 */
export interface StorageKeyInfo {
  key: string;
  purpose: string;
  /** Secret values may reach AsyncStorage only as ciphertext (see `sessionSecureStorage.ts`). */
  secret: boolean;
}

export const STORAGE_KEYS = {
  theme: {
    key: THEME_STORAGE_KEY,
    purpose: "Theme preference: light | dark | system (SPEC-01).",
    secret: false,
  },
  session: {
    key: "tripplanner.auth.session",
    purpose: "AES-CTR ciphertext of the auth session; the key lives in SecureStore (AC-7).",
    secret: true,
  },
  firstLaunch: {
    key: "tripplanner.app.launched",
    purpose: "Fresh-install marker: absent means Keychain leftovers must be wiped (AC-6).",
    secret: false,
  },
} as const satisfies Record<string, StorageKeyInfo>;

/** expo-secure-store entries (the Keychain, NOT AsyncStorage). */
export const SECURE_STORE_KEYS = {
  sessionEncryptionKey: "tripplanner.auth.session.key",
} as const;
