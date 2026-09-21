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
- Still NO migrations, tables, RLS policies, pgTAP tests or Edge Functions (no data model yet); auth users live in the built-in `auth` schema only.
- Local stack on Rancher Desktop: `supabase start -x vector` (plain `supabase start` fails on the `vector` mount). Mail catcher is Mailpit on `http://127.0.0.1:54324`.
