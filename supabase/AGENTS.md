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
Not scaffolded yet (`supabase init` is part of the first SPEC).
