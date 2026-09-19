# e2e/ — Maestro flows (`@tripplanner/e2e`)

- One flow per core journey in `flows/*.yaml`; select by accessibility label/text.
- Deterministic: seeded test account, no live third-party APIs. Platform-neutral so flows run on Android later.
- Run via `./scripts/e2e.sh <flow> [--locale ru|en] [--metro-url URL]` (flows hold no literal UI text; the script maps locale strings — keep it in sync with `mobile/src/lib/i18n/locales/`). See `react-native-testing` skill.

## Status
Flows authored: `skeleton-smoke`, `theme-persistence`. NOT yet run: Maestro isn't installed on the dev machine, and the dev client crashes at launch on the iOS 27 simulator (see `mobile/AGENTS.md` Status). Unverified assumptions are listed in `insights.md`.
