# supabase/ — shared backend (Postgres + Auth + Storage + Edge Functions)

Read `.claude/skills/supabase-backend` before any change; `postgresql-table-design` for schema; `security` always.
Decision record: `docs/decisions/ADR-001-backend-supabase.md`.

## Rules
- RLS on every table, same migration as the table; a pgTAP test per policy (owner ok, other user denied, anon denied).
- Migrations only (`supabase migration new`); never edit an applied one; regenerate `shared` DB types after each.
- `service_role` only inside Edge Functions/CI. Edge Functions verify the JWT and Zod-validate input (schemas from `shared/`).
- Deleting a user must leave no data behind (FK cascades) — account deletion is an App Store requirement; test it.
- Time as `timestamptz` UTC + IANA tz column; currency per record; `source` column on bookings.
- Never run `db reset` / `db push` against the hosted project without the user's go-ahead.

## Status
Project initialised by SPEC-02 / PLAN-02, local stack only — nothing is applied to a hosted project.
- Present: `config.toml` with the auth settings pinned explicitly (change them there, never in a dashboard), `templates/recovery.html` (password-reset email carrying the 6-digit `{{ .Token }}`), `README.md` (run, `mobile/.env` values, Mailpit).
- Migrations: three. `migrations/20260923195003_trip_hotels.sql` (SPEC-05 / PLAN-05): the `trip_hotels` table, ownership through the parent trip (same pattern as `trip_segments`), 18 check constraints, `on delete cascade` from `trips`; pgTAP `tests/trip_hotels_rls.test.sql` (27) + `tests/trip_hotels_constraints.test.sql` (38). Earlier: `migrations/20260921193935_trips.sql` (SPEC-03 / PLAN-03): the `trips` table (owned by `auth.users` with `on delete cascade`, check constraints, indexes, `set_updated_at` trigger) and its RLS policies (all `to authenticated`). `migrations/20260922094844_trip_segments.sql` (SPEC-04 / PLAN-04): the `trip_segments` table, ownership derived through the parent trip (no own `user_id`; policies check `trips.user_id` via `trip_id` in `using`/`with check` on every operation), 15 check constraints, `on delete cascade` from `trips`. pgTAP: `tests/trips_rls.test.sql` (25) + `tests/trips_constraints.test.sql` (33) + `tests/trip_segments_rls.test.sql` (27) + `tests/trip_segments_constraints.test.sql` (28) = 113 tests in 4 files (178 in 6 with the hotel files) (`supabase test db`). Applied to the LOCAL stack only; the hosted project is untouched. No Edge Functions, no Storage buckets yet.
- Local stack on Rancher Desktop: `supabase start -x vector` (plain `supabase start` fails on the `vector` mount). Mail catcher is Mailpit on `http://127.0.0.1:54324`.
