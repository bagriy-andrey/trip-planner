# e2e/ — Maestro flows (`@tripplanner/e2e`)

- One flow per core journey in `flows/*.yaml`; select by accessibility label/text.
- Deterministic: seeded test account, no live third-party APIs. Platform-neutral so flows run on Android later.
- Run via `./scripts/e2e.sh <flow> [--locale ru|en] [--metro-url URL]` (flows hold no literal UI text; the script maps locale strings — keep it in sync with `mobile/src/lib/i18n/locales/`). See `react-native-testing` skill.

## Status
Flows authored: `skeleton-smoke` (signs up a fresh account and CREATES a trip through S8 to reach S7: a new account has no trips and the mocks are gone), `theme-persistence`, `auth-email` (sign-up, sign-in, sign-out; password recovery is manual checklist M7), `trip-crud` (SPEC-03 AC-80: sign up, create, list, archive, History, delete permanently; creates and deletes real local data, needs the trips migration applied). The sign-up/sign-in and trip steps hit the REAL local Supabase, so `supabase start -x vector` must be up and `mobile/.env` filled (`supabase/README.md`); `e2e.sh` generates a fresh test account per run. NOT yet run: Maestro isn't installed on the dev machine (the iOS 27 launch crash is fixed by a config plugin — see `mobile/AGENTS.md` Status). Unverified assumptions are listed in `insights.md`.
