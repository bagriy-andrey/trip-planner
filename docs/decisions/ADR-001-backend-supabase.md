# ADR-001: Supabase as the shared backend (iOS → web → Android)

Date: 2026-09-18 · Status: accepted · Supersedes: initial Fastify + Drizzle scaffold

## Context
One product, several clients over time: iOS app first, then a separate web UI, then Android
(the Expo app covers Android). All clients must share one backend and one auth. Solo developer,
evening work, no deadline. Needs: Apple/Google/email sign-in, Postgres data, cover-image storage,
scheduled reminders, in-app account deletion (App Store), and offline reading on mobile.

## Decision
Use **Supabase** (Postgres + Auth + Storage + Edge Functions) as the backend for every client.
- Clients talk to Supabase through `supabase-js`, wrapped in each client's `lib/supabase`.
- Authorization is enforced in the database with Row Level Security — not in client code.
- Server-side code is limited to Edge Functions (Deno): account deletion, reminder scheduling,
  cover-photo lookup, other trusted operations that need the `service_role` key.
- Product logic that must behave identically on every client (conflict detection between
  bookings, timezone/date math, money totals) lives in `shared/` as pure TypeScript.
- Schema changes go only through SQL migrations in `supabase/migrations/`.

## Why not a custom Fastify API
A hand-built API would have to re-implement auth providers, storage, and ops before delivering
any product value, and every new client would still need its own data layer. `supabase-js` runs
unchanged in React Native, browsers and Node, which is exactly the multi-client shape we have.

## Consequences
- (+) Same SDK and auth on iOS, Android and web; far less backend code to write and run.
- (+) Postgres is standard: data and SQL are portable if we outgrow Supabase.
- (−) Security depends on correct RLS policies → every table needs RLS + a policy test.
- (−) Vendor coupling for auth/storage; mitigated by keeping domain logic in `shared/`
  and treating `lib/supabase` as the only client-side touch point.
- (−) True offline-first (local DB synced with Postgres) is not included. Plan: MVP = offline
  read cache + write queue; a sync engine (e.g. PowerSync, which integrates with Supabase)
  is evaluated in its own SPEC before committing.
- Escape hatch: if a heavy custom backend is needed later, add an `api/` service for that logic
  only; `shared/` and the Postgres schema carry over.
