# Insights

Append-only. Managed by the `engineering-insights` skill. Add only substantive, non-obvious learnings.

## What Works
## What Doesn't Work
## Codebase Patterns
- 2026-09-19: Flows hold no literal UI text: `scripts/e2e.sh --locale ru|en` passes `LOCALE` plus one `-e KEY=value` per string, so one YAML serves both languages (Maestro `text:` is a full-string regex, hence `.*Краков.*` for trip cards whose label is "city, dates, status", and pre-escaped `\?`). The table in the script mirrors `mobile/src/lib/i18n/locales/*` by hand: when a string changes, change it there. Tab label == screen title on S4/S5/S6, so tabs are only tapped from a screen where the label is the tab alone and asserted with `selected: true`.
- 2026-09-19: `config.yaml` in `e2e/flows/` is only the Maestro workspace config; it cannot carry `appId`. Each flow repeats `appId` (= `ios.bundleIdentifier`, temporary placeholder) and `e2e.sh` fails fast on drift.
## Tool & Library Notes
- 2026-09-19: Maestro `launchApp` takes launch args under `arguments:` (not `launchArguments`). NOT YET VERIFIED (the flows were authored with no Maestro and no working simulator): (1) that iOS honours `"-AppleLanguages": "(en)"` for the dev-client build (PLAN-01 R-9); fallback is switching the simulator language by hand (Settings > General > Language & Region) and rerunning, moving AC-35 to the manual checklist; (2) that Maestro exposes RN `accessibilityState.checked` on a `radio` (theme flow asserts `checked: true`; RN iOS puts it into `accessibilityValue` as "radio button, checked", so if the selector never matches, fall back to the screenshots the flow saves in `.maestro/screenshots/`); (3) that `selected: true` matches the active tab button (RN sets the iOS Selected trait); (4) that tapping a nested consent link on S3 hits the link, not the paragraph centre; (5) the dev-client system prompts ("Open", "Continue") handled by optional taps.
## Recurring Errors & Fixes
## Session Notes
## Open Questions
