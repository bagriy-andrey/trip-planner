# mobile/ — Expo + React Native app (`@tripplanner/mobile`)

Read `.claude/skills/mobile-architecture` before adding files; `expo-react-native` before writing them.

## Layout
- `app/` — expo-router routes only (thin). `src/features/<name>/` — feature modules with a public `index.ts`.
- `src/components/` shared UI · `src/lib/` api-client, storage, theme · `src/platform/` ALL platform-specific code.

## Rules
- Backend is Supabase: only `lib/supabase` + feature `api/` modules call `supabase-js`; map rows with `@tripplanner/shared` Zod schemas. Never use the `service_role` key in the app.
- Backend state → TanStack Query. Auth session → LargeSecureStore pattern (AES key in `expo-secure-store`, ciphertext in AsyncStorage: SecureStore's ~2 KB limit is smaller than a Supabase session); other secrets → `expo-secure-store` only (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`; clear on fresh install — iOS Keychain survives reinstall).
- Local storage: AsyncStorage for cache/prefs, `expo-sqlite` for offline trip data. Not MMKV by default (UserDefaults → privacy-manifest risk).
- New dep touching storage/files/device info → check its `PrivacyInfo.xcprivacy` and mirror reasons in `ios.privacyManifests`.
- No `Platform.OS` in feature code; iOS-only modules need an Android fallback in `src/platform/`.
- Request permissions in context with a pre-prompt; every permission needs a usage string in `app.config.ts`.
- Tests: Jest (`jest-expo`) + React Native Testing Library — see `react-native-testing` skill.
- Verify on a real device / release build before calling perf work done.

## Status
Expo SDK 57 skeleton (SPEC-01 / PLAN-01): screens S1–S12 wired with static placeholders (no data, no Supabase yet), theme light/dark/system (one AsyncStorage key), i18n ru/en (i18next), `typedRoutes`, privacy manifest mirrored in `app.privacy.ts` (audit: `docs/release/privacy-manifest-audit.md`).
- Works: `pnpm -r typecheck`, `pnpm -r test` (jest-expo + guardrail tests: route contract, static rules), `npx expo config --type public`. Gotchas: `insights.md`.
- Known issue: the dev client crashes at launch on the iOS 27 simulator (SIGTRAP, UIScene lifecycle adoption in the SDK 57 CNG `AppDelegate`) — `npx expo run:ios` on an iOS 27 sim is not a working path yet.
- Repo uses pnpm 11 (`packageManager: pnpm@11.7.0`); `pnpm-workspace.yaml` `allowBuilds` / `minimumReleaseAgeExclude` are temporary and may be deleted later.
