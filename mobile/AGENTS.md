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
Not scaffolded yet — first SPEC will create the Expo app (`npx create-expo-app`) and wire the workspace.
