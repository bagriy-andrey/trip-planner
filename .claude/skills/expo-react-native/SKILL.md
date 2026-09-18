---
name: expo-react-native
description: "Expo + React Native best practices for mobile/ — expo-router navigation, EAS/dev-client workflow, list & image performance, animations, safe areas/keyboard, secure storage, permissions, notifications, deep links, maps/location, offline/network, and common RN anti-patterns. Use when writing or reviewing any file under mobile/. Trigger terms: Expo, React Native, expo-router, FlatList, FlashList, Reanimated, expo-secure-store, permissions, push notifications, deep link, maps, location."
---

# Expo + React Native best practices

Apply together with `react-best-practices` (hooks/state rules still hold) and
`mobile-architecture` (where code goes).

## Project & tooling
- **Expo managed workflow + development builds** (`expo-dev-client`), not Expo
  Go, once any native module beyond the Expo SDK is needed. Prefer Expo SDK
  modules (`expo-*`) over bare community libs — they are cross-platform and
  upgrade with the SDK. Check `npx expo install --check` after adding deps;
  install native deps with `npx expo install`, not `pnpm add`.
- Config in `app.config.ts` (typed, env-aware). Bundle id / package name,
  permissions strings (`ios.infoPlist`), and scheme are set there — never
  edit generated `ios/`/`android/` by hand (Continuous Native Generation).
- TypeScript strict. Typed routes on (`experiments.typedRoutes`).

## Navigation (expo-router)
- File-based routes in `app/`; groups `(tabs)`, `(auth)` for layout scoping.
- Auth gating in a layout (`<Redirect>` / protected routes), not per-screen.
- Pass IDs in params, not objects; load data in the destination screen.
- Configure deep-link `scheme` + universal links early — trip sharing needs them.

## Performance
- Long lists: `FlashList` (or `FlatList` with `keyExtractor`, `getItemLayout`
  when fixed height, `windowSize` tuned). Never `ScrollView` + `.map` for
  unbounded data. Memoize row components; stable callbacks.
- Images: `expo-image` (caching, placeholders), correctly sized remote assets —
  never load full-resolution photos into lists.
- Animations: `react-native-reanimated` on the UI thread; avoid animating via
  JS-thread `setState`. Gestures via `react-native-gesture-handler`.
- Avoid inline object/array/function props on hot list rows; avoid anonymous
  components in render; keep `useEffect` for real side effects only.
- Measure on a **real device, release build** before optimizing; dev-mode
  perf is misleading.

## Layout & input
- `SafeAreaProvider` at root; use `useSafeAreaInsets`, never magic notch numbers.
- Keyboard: one shared `KeyboardAvoidingView`/keyboard-controller wrapper.
- Touch targets ≥44pt; support Dynamic Type / font scaling (don't disable
  `allowFontScaling` without reason); labels via `accessibilityLabel`/`role`.

## Data, storage, network
- Supabase auth session: `expo-secure-store` values are limited to ~2 KB and a Supabase session
  is larger → use the LargeSecureStore pattern (random AES-256 key in SecureStore, encrypted
  session in AsyncStorage). Wire `AppState` to start/stop token auto-refresh.
- Other tokens & secrets: `expo-secure-store` ONLY. Never AsyncStorage for secrets;
  never put secrets in `EXPO_PUBLIC_*` env (those are bundled into the app).
  - iOS Keychain data SURVIVES app uninstall/reinstall (same bundle ID): keep a
    "first launch" flag in AsyncStorage and clear stored tokens when it's absent.
  - Use `keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY` for auth tokens so
    they don't migrate via backups/device transfer. On Android, exclude
    SecureStore data from Auto Backup (else restore yields undecryptable values).
  - Values can be size-limited on iOS (~2 KB historically): store tokens, not blobs.
- Non-sensitive cache/prefs: **AsyncStorage by default** (its privacy manifest
  declares only FileTimestamp). Large/relational/offline trip data: `expo-sqlite`.
  **Do NOT default to MMKV**: it uses `UserDefaults`, a required-reason API — only
  adopt it after confirming its installed version ships a `PrivacyInfo.xcprivacy`.
- Storage-library gate: before adding ANY dependency that touches local storage,
  files, or device info, open `node_modules/<pkg>/ios/**/PrivacyInfo.xcprivacy`,
  note its `NSPrivacyAccessedAPITypes` + reason codes, and mirror them in
  `ios.privacyManifests` in `app.config.ts` (Apple doesn't reliably parse manifests
  of static CocoaPods, so app-level duplication is the safe path).
- No app-level encryption of local files is needed: iOS Data Protection encrypts
  app files at rest automatically. Don't roll custom crypto for cache/SQLite.
- TanStack Query for backend state with `NetInfo`-aware `onlineManager` and
  `focusManager` wired to `AppState`; persist the cache if trips must open offline.
- Map every Supabase row to a domain type with the shared Zod schema at the `api/` boundary.

## Native capabilities
- **Permissions:** request in context, right before use, with a pre-prompt
  explaining why; handle "denied" and "never ask again" with a Settings
  deep-link. Usage-description strings are required for App Store review.
- **Location/maps:** `expo-location` foreground only unless a spec requires
  background; `react-native-maps` (Apple Maps on iOS, Google on Android —
  verify behavior on both).
- **Notifications:** `expo-notifications`; token registration goes through the
  server; handle foreground/background/tap paths.
- **Calendar/contacts/files:** use the Expo modules; ask minimal scope.

## Anti-patterns
- Web-isms: `div`/CSS assumptions, `window`, `localStorage`, hover states.
- Styling via giant inline objects re-created per render → `StyleSheet.create`
  or a styling lib chosen once for the project.
- `console.log` left in; unhandled promise rejections; `any` on API data.
- Platform forks in feature code (see `mobile-architecture` parity rule).
- Storing derived backend data in global state; duplicating query data in state.
