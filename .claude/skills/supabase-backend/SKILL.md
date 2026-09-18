---
name: supabase-backend
description: "Supabase backend conventions for supabase/ — SQL migrations, Row Level Security policies, auth (Apple/Google/email), storage buckets, Edge Functions (Deno), generated DB types, account deletion, local dev with the Supabase CLI, and how mobile/web clients use supabase-js safely. Use when writing or reviewing anything under supabase/, designing tables or policies, or wiring a client to Supabase. Trigger terms: Supabase, RLS, policy, migration, edge function, service_role, auth.uid, storage bucket, supabase-js, pgTAP."
---

# Supabase backend (`supabase/`)

The backend for every client (iOS, Android, later web) — see `docs/decisions/ADR-001-backend-supabase.md`.
Combine with `postgresql-table-design` (schema quality) and `security`.

## Layout
```
supabase/
  config.toml
  migrations/     # timestamped SQL — the ONLY way schema/policies change
  functions/      # Edge Functions (Deno/TypeScript), one folder each
  tests/          # pgTAP tests (RLS!) — run with `supabase test db`
  seed.sql        # local/dev data only
```
Generated DB types: `supabase gen types typescript --local > shared/src/db/database.types.ts`
(re-generate after every migration; types only, no runtime code).

## Non-negotiable rules
1. **RLS enabled on every table in `public`**, in the same migration that creates it. No table
   without at least one policy; default deny. Policies key off `auth.uid()`
   (e.g. `user_id = (select auth.uid())` — wrap in `select` for planning performance).
2. **`service_role` key never leaves the server side** (Edge Functions env / CI). Clients get the
   anon/publishable key only. Never put either in a place you'd mind being public without RLS
   protecting the data — the anon key is public by design, RLS is the actual protection.
3. **Schema changes only via migrations** (`supabase migration new <name>`), never by editing the
   hosted dashboard. Don't edit an already-applied migration; add a new one.
4. **Time:** `timestamptz` in UTC plus a `*_tz text` (IANA id) column where local wall time matters
   (flights, check-in/out). Never store local time strings. Currency: `char(3)` per record.
5. **Each record has `source` (`manual | imported_pending | imported_confirmed`)** — see the product
   doc; import features depend on it.
6. **Foreign keys cascade from `trips`** so deleting a trip/user leaves no orphans (needed for
   account deletion). Beware cascades/triggers that can make user deletion fail — test it.
7. Constraints in SQL (`check`, `not null`, FKs) — the DB is the last line of defense, not Zod.

## Auth
- Providers: Apple, Google, email/password. **Apple is mandatory if any third-party login exists.**
  On iOS use native Apple sign-in and exchange the identity token with `signInWithIdToken`.
- **Account deletion (App Store requirement):** clients cannot delete `auth.users`. Provide an Edge
  Function that authenticates the caller from their JWT and calls
  `supabase.auth.admin.deleteUser(user.id)` with the service-role client; user data must go via
  FK cascade. Test the full deletion path.
- Expo/React Native session persistence: `expo-secure-store` values are limited to ~2048 bytes and
  a Supabase session is larger. Use the **LargeSecureStore pattern**: a random AES-256 key in
  SecureStore, encrypted session JSON in AsyncStorage. Set `autoRefreshToken`, `persistSession`,
  `detectSessionInUrl: false`, and tie token refresh to `AppState` (start/stop auto-refresh).

## Edge Functions (Deno)
- One function = one trusted operation. Validate the JWT (`Authorization` header) and the request
  body (Zod, imported from `shared/` — it must stay runtime-neutral) before doing anything.
- Secrets via `supabase secrets set` / env; never in code or `EXPO_PUBLIC_*`.
- Idempotent handlers for scheduled jobs (reminders): retries must not double-send.
- Scheduled work: `pg_cron` + `pg_net` or Supabase scheduled functions; compute reminders from
  event times (UTC), not fixed clock times.

## Storage
- Buckets private by default; access through policies on `storage.objects` scoped to the owner's
  folder (`<user_id>/…`). Public buckets only for truly public assets.
- Store the URL/path AND attribution/source for third-party cover photos (license terms).

## Client usage (`mobile/`, later `web/`)
- One Supabase client instance per app in `lib/supabase`; feature `api/` modules call it and map
  DB rows → domain types with Zod schemas from `shared/`. Components never call `supabase-js`.
- Select only needed columns; use TanStack Query for caching; handle `error` on every call.
- Realtime/subscriptions only where a spec needs them.

## Local dev & testing
- `supabase start` (Docker) → local Postgres/Auth/Storage; `supabase db reset` re-applies
  migrations + seed; `supabase test db` runs pgTAP.
- **Every RLS policy has a test:** user A can't read/write user B's rows; anon gets nothing.
- Edge Functions: Deno tests next to the function; mock outbound HTTP.
- Never run destructive commands (`db reset`, `db push`) against a hosted project without the
  user's explicit go-ahead.
