// Public surface of the backend boundary. `createClient` is deliberately NOT exported: the
// configured client below is the only one the app may use.
export { supabase } from "./client";
export type { AuthChangeEvent, Session, User } from "./client";
export { ConfigError, readSupabaseConfig } from "./config";
export type { SupabaseConfig } from "./config";
