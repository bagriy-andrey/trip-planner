# Insights

Append-only. Managed by the `engineering-insights` skill. Add only substantive, non-obvious learnings.

## What Works
## What Doesn't Work
## Codebase Patterns
## Tool & Library Notes
- 2026-09-21: Supabase CLI 2.117 local stack: the mail catcher is now Mailpit on port 54324 (config section `[local_smtp]`; `supabase status` still prints an `INBUCKET_URL` alias); `supabase status` lists `PUBLISHABLE_KEY`/`SECRET_KEY` next to the legacy `ANON_KEY`/`SERVICE_ROLE_KEY` — the mobile app uses `ANON_KEY` as `EXPO_PUBLIC_SUPABASE_ANON_KEY` and must never receive the secret/service_role key. Under an AI agent `supabase status` prints JSON: use `--agent no` or `-o env`.
- 2026-09-21: The CLI template ships `max_frequency = "1s"` for auth email sends; SPEC-02 needs 60 s, so `config.toml` sets it (and `otp_expiry = 600`) explicitly — don't rely on template defaults for anything a spec pins. The `email_sent` rate-limit comment in the generated config says it only applies with a custom SMTP server enabled, so the built-in mailer's limit can't be tuned locally.
- 2026-09-21: Recovery flow on the wire: `POST /auth/v1/recover` sends the mail rendered from `templates/recovery.html`, which must contain the 6-digit `{{ .Token }}` (not `{{ .ConfirmationURL }}` — a mobile app has no web page to land on); `POST /auth/v1/verify` with `type=recovery` + email + token consumes it AND returns a session.
## Recurring Errors & Fixes
- 2026-09-21: Rancher Desktop breaks the `vector` container's docker.sock mount (`error while creating mount source path`), so plain `supabase start` fails — use `supabase start -x vector` (logs/analytics container only; nothing the app or auth needs).
## Session Notes
## Open Questions
