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
Expo SDK 57 app. SPEC-01 / PLAN-01 skeleton: screens S1–S12 on realistic mock data in `src/mocks/` (trips, flights, hotels — the mock module is what the future `api/` layer replaces), theme light/dark/system (one AsyncStorage key), i18n ru/en (i18next), `typedRoutes`, privacy manifest mirrored in `app.privacy.ts` (audit: `docs/release/privacy-manifest-audit.md`).
- Real email auth (SPEC-02 / PLAN-02): Supabase client boundary `src/lib/supabase` (the only place that imports `supabase-js`/calls the network; needs `EXPO_PUBLIC_SUPABASE_URL` + `_ANON_KEY` from `.env`, see `.env.example`), LargeSecureStore session in `src/lib/storage`, `src/lib/session` provider (`useSession`) + `Stack.Protected` gating in the root layout, `src/features/auth` screens S2 sign-in / S3 sign-up / S10 forgot password / S10b reset password (route `/reset-password`) validated with `@tripplanner/shared` schemas; profile and tab headers show the real name and email. Apple/Google buttons are still "soon". Name and email come from the session; `MOCK_USER` only backs the connected-account / currency settings rows. No TanStack Query yet (no server data state; trips are still mocks). Not built: account deletion, email confirmation, change password (Follow-ups in SPEC-02).
- Works: `pnpm -r typecheck`, `pnpm -r test` (jest-expo, 593 tests + guardrail tests: route contract, static rules, `backend-only-behind-the-boundary`: `supabase-js`/network only inside `src/lib/supabase`), `npx expo config --type public`. Gotchas: `insights.md`.
- iOS 27 simulator: the CNG `AppDelegate` used to crash at launch (SIGTRAP, UIScene lifecycle). Fixed by the local config plugin `plugins/withIosSceneLifecycle.js` (registered in `app.config.ts`; verified on an iOS 27 sim, then `expo prebuild --clean`); delete it once the SDK template adopts scenes. Details: `insights.md`.
- Repo uses pnpm 11 (`packageManager: pnpm@11.7.0`); `pnpm-workspace.yaml` `allowBuilds` / `minimumReleaseAgeExclude` are temporary and may be deleted later.
