# Insights

Append-only. Managed by the `engineering-insights` skill. Add only substantive, non-obvious learnings.

## What Works
## What Doesn't Work
## Codebase Patterns
## Tool & Library Notes
- 2026-09-18: Storage libs differ in App Store privacy-manifest impact — AsyncStorage declares only FileTimestamp (C617.1); `react-native-mmkv` uses `UserDefaults` (a required-reason API; verify its installed version ships a `PrivacyInfo.xcprivacy` before adopting); Apple doesn't reliably parse manifests of static CocoaPods, so mirror reasons in `ios.privacyManifests`. Also: iOS Keychain (`expo-secure-store`) data survives app reinstall — clear tokens on fresh install.
- 2026-09-18: A Supabase auth session is larger than `expo-secure-store`'s ~2048-byte value limit — don't store it there directly. Use the LargeSecureStore pattern: AES-256 key in SecureStore, encrypted session in AsyncStorage (backend decision: `docs/decisions/ADR-001-backend-supabase.md`).
## Recurring Errors & Fixes
- 2026-09-19: `app.config.ts` can't `import "./sibling"` a `.ts` file — Expo CLI transpiles only the config file itself, then plain Node resolves imports (`Cannot find module './app.constants'` from `expo config`). Extensionless static imports fail; `import "./x.ts"` fails `tsc` (needs `allowImportingTsExtensions`). What works with no tsconfig change: `require("./x.ts") as typeof import("./x")` (Node >=22.18 strips types). Jest passes either way, so only `npx expo config` catches it.
- 2026-09-19: In Jest 29, `jest.restoreAllMocks()` does NOT reset `jest.spyOn(AsyncStorage, "getItem").mockRejectedValue(...)` — the async-storage jest mock's methods are already `jest.fn`s, so the rejecting implementation leaks into later tests in the file. Use `mockRejectedValueOnce` to simulate failures against the AsyncStorage mock.
## Session Notes
## Open Questions
