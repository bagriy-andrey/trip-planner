# Insights

Append-only. Managed by the `engineering-insights` skill. Add only substantive, non-obvious learnings.

## What Works
## What Doesn't Work
## Codebase Patterns
## Tool & Library Notes
- 2026-09-18: Storage libs differ in App Store privacy-manifest impact — AsyncStorage declares only FileTimestamp (C617.1); `react-native-mmkv` uses `UserDefaults` (a required-reason API; verify its installed version ships a `PrivacyInfo.xcprivacy` before adopting); Apple doesn't reliably parse manifests of static CocoaPods, so mirror reasons in `ios.privacyManifests`. Also: iOS Keychain (`expo-secure-store`) data survives app reinstall — clear tokens on fresh install.
## Recurring Errors & Fixes
## Session Notes
## Open Questions
