// THE Supabase boundary (AC-8): the only file in the app that imports `@supabase/supabase-js`
// and the only place a network call is made (`fetch(` below). Screens and components never see
// it; feature `api/` modules and `lib/session` reach it through `@/lib/supabase`.

import { createClient } from "@supabase/supabase-js";

import { STORAGE_KEYS, sessionSecureStorage } from "@/lib/storage";

import { readSupabaseConfig } from "./config";

export type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

/** Requests that take longer than this fail as a connection problem instead of hanging (AC-19). */
export const REQUEST_TIMEOUT_MS = 15_000;

/** Wraps `fetch` with an abort timer; a caller-supplied signal keeps working. */
export function createFetchWithTimeout(
  timeoutMs: number,
  baseFetch: typeof fetch = (input, init) => fetch(input, init),
): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const outer = init?.signal;
    if (outer) {
      if (outer.aborted) controller.abort();
      else outer.addEventListener("abort", () => controller.abort(), { once: true });
    }
    try {
      return await baseFetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };
}

// Metro inlines only STATIC `process.env.EXPO_PUBLIC_*` reads, so each variable is named here
// explicitly instead of passing the whole `process.env` object. A missing value throws a
// `ConfigError` right at initialisation (AC-47).
const { url, anonKey } = readSupabaseConfig({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: sessionSecureStorage,
    storageKey: STORAGE_KEYS.session.key,
    autoRefreshToken: true,
    persistSession: true,
    // No deep links in the auth flow (password reset is a code, not a link).
    detectSessionInUrl: false,
  },
  global: { fetch: createFetchWithTimeout(REQUEST_TIMEOUT_MS) },
});
