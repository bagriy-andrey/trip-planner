# supabase/ — local stand

Local Supabase (Postgres + Auth + Storage) for development. Nothing here talks to a hosted project.
Conventions for changing the backend: `AGENTS.md`. Auth behaviour is pinned in `config.toml`
(SPEC-02 AC-48/51/52) — change it there, never in a dashboard.

## Run

Requires Docker and the Supabase CLI (`supabase --version`; written against 2.117.0).

```sh
supabase start        # first run pulls images; local only
supabase status       # prints the API URL and keys
supabase stop         # stop the stack (data is kept in a Docker volume)
```

Rancher Desktop (Docker socket under `~/.rd/`): `supabase start` fails while starting the
`vector` container (`error while creating mount source path .../docker.sock`). Start without it:

```sh
supabase start -x vector
```

When the CLI runs under an AI agent, `supabase status` prints JSON; use `supabase status --agent no`
for the table or `supabase status -o env` for `KEY=value` lines.

## What the mobile app needs (`mobile/.env`)

Only two public values, both from `supabase status`:

| `mobile/.env` variable | From `supabase status` |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Project URL / `API_URL` (`http://127.0.0.1:54321`) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `ANON_KEY` (JWT, legacy anon key) |

Never put `SERVICE_ROLE_KEY` / `SECRET_KEY` in `mobile/` or in any `EXPO_PUBLIC_*` variable.
A physical device cannot reach `127.0.0.1` on your machine; use the LAN IP of the machine instead.

## Mail (Mailpit, port 54324)

Local Auth does not send real email. Every message lands in **Mailpit** (formerly Inbucket;
`config.toml` section `[local_smtp]`, the status output still exposes an `INBUCKET_URL` alias):

- Web UI: <http://127.0.0.1:54324>
- JSON API: `curl -s http://127.0.0.1:54324/api/v1/messages` and `.../api/v1/message/latest`

The password-reset email (`templates/recovery.html`) contains the six-digit code (`{{ .Token }}`),
valid for 10 minutes. Requests for the same address are throttled to one per 60 seconds
(`max_frequency`).

## Manual check with curl

```sh
URL=http://127.0.0.1:54321
KEY=<ANON_KEY from supabase status>
# Sign-up: with email confirmation off the response already carries a session.
curl -s -X POST $URL/auth/v1/signup -H "apikey: $KEY" -H 'Content-Type: application/json' \
  -d '{"email":"me+1@example.com","password":"password12"}'
# Reset: the code arrives in Mailpit.
curl -s -X POST $URL/auth/v1/recover -H "apikey: $KEY" -H 'Content-Type: application/json' \
  -d '{"email":"me+1@example.com"}'
```

## Scope

No migrations, tables, RLS or Edge Functions yet — `migrations/` does not exist. `email_sent` in
`config.toml` is raised for local development only; the production value is chosen together with a
real SMTP provider in the release spec.
