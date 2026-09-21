// Build-time Supabase settings. The ONLY environment variables the app may read are the two
// public ones below (AC-46): the project URL and the anon/publishable key. Both are embedded in
// the bundle by design, so neither is a secret; nothing else may ever be given an EXPO_PUBLIC_
// name. Pure function of an env object, so it is testable without native modules.

export const SUPABASE_URL_ENV = "EXPO_PUBLIC_SUPABASE_URL";
export const SUPABASE_ANON_KEY_ENV = "EXPO_PUBLIC_SUPABASE_ANON_KEY";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/** Thrown at client initialisation when the build has no (valid) project settings (AC-47). */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export type SupabaseEnv = Readonly<Record<string, string | undefined>>;

function missing(name: string): ConfigError {
  // The message names the variable only — never a value (the key must not reach logs).
  return new ConfigError(
    `Supabase is not configured: ${name} is missing or empty. ` +
      "Copy mobile/.env.example to mobile/.env and fill it from `supabase status`, then restart Metro.",
  );
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/** Reads and validates the two public settings; throws `ConfigError` with a readable message. */
export function readSupabaseConfig(env: SupabaseEnv): SupabaseConfig {
  const url = env[SUPABASE_URL_ENV]?.trim();
  if (!url) throw missing(SUPABASE_URL_ENV);
  const anonKey = env[SUPABASE_ANON_KEY_ENV]?.trim();
  if (!anonKey) throw missing(SUPABASE_ANON_KEY_ENV);
  if (!isHttpUrl(url)) {
    throw new ConfigError(`Supabase is not configured: ${SUPABASE_URL_ENV} is not a valid http(s) URL.`);
  }
  return { url, anonKey };
}
