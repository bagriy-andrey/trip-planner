# Privacy manifest audit (required-reason APIs)

- Date: 2026-09-19
- Scope: Expo SDK 57 skeleton (`mobile/`, PLAN-01 Step 10), iOS.
- Result: `iosPrivacyManifests` in `mobile/app.privacy.ts` mirrors the union below into `ios.privacyManifests`.
  Apple does not reliably parse manifests of statically linked pods, so the app-level manifest repeats them.
- Re-run on every Expo SDK bump and on every new native dependency (a new native module also means a new dev-client build).

## How it was done

1. Walked the whole pnpm store (`node_modules/.pnpm`, real paths, no symlinks) for `PrivacyInfo.xcprivacy` (and any other `*.xcprivacy`; none besides `PrivacyInfo.xcprivacy`).
2. Listed the pods that actually get linked: `npx expo-modules-autolinking resolve --platform apple --json` (from `mobile/`), plus the non-Expo native libraries.
3. Grepped the iOS/C++ sources of every linked native package for required-reason API symbols (`NSUserDefaults`/`UserDefaults`, `systemUptime`, `mach_absolute_time`, file creation/modification dates, `stat`/`fstat`/`lstat`/`getattrlist`, `attributesOfItemAtPath`, `attributesOfFileSystem`, `volumeAvailableCapacity*`, `statfs`/`statvfs`, `activeInputModes`) to find packages that touch these APIs without shipping a manifest.
4. Checked podspec `resource_bundles` for the manifest-bearing packages.

## Manifest files found

`NSPrivacyTracking` is `false` and there are no tracking domains / collected data types in any of them.

| Package | Version | File (in package) | Category | Reason codes |
|---|---|---|---|---|
| `@react-native-async-storage/async-storage` | 2.2.0 | `ios/PrivacyInfo.xcprivacy` | FileTimestamp | C617.1 |
| `expo-constants` | 57.0.19 (also 57.0.18 in store, unused; identical) | `ios/PrivacyInfo.xcprivacy` | UserDefaults | CA92.1 |
| `expo-file-system` | 57.0.7 | `ios/PrivacyInfo.xcprivacy` | FileTimestamp | 0A2A.1, 3B52.1 |
| `expo-file-system` | 57.0.7 | (same file) | DiskSpace | E174.1, 85F4.1 |
| `expo-localization` | 57.0.2 | `ios/PrivacyInfo.xcprivacy` | UserDefaults | CA92.1 |
| `expo-system-ui` | 57.0.4 | `ios/PrivacyInfo.xcprivacy` | UserDefaults | CA92.1 |
| `react-native` | 0.86.3 | `React/Resources/PrivacyInfo.xcprivacy` | FileTimestamp; UserDefaults | C617.1; CA92.1 |
| `react-native` | 0.86.3 | `ReactCommon/cxxreact/PrivacyInfo.xcprivacy` | FileTimestamp | C617.1 |
| `react-native` | 0.86.3 | `ReactCommon/react/timing/PrivacyInfo.xcprivacy` | SystemBootTime | 35F9.1 |
| `react-native` (RCT-Folly) | 0.86.3 | `third-party-podspecs/RCT-Folly/PrivacyInfo.xcprivacy` | FileTimestamp | C617.1 |
| `react-native` (boost) | 0.86.3 | `third-party-podspecs/boost/PrivacyInfo.xcprivacy` | FileTimestamp; SystemBootTime | C617.1; 35F9.1 |
| `react-native` (glog) | 0.86.3 | `third-party-podspecs/glog/PrivacyInfo.xcprivacy` | FileTimestamp | C617.1 |

The store contains many copies of the `react-native` manifests (one per peer-dependency resolution); all copies of a given file are byte-identical.

## Mirrored into `ios.privacyManifests`

| Category | Reason codes | Source |
|---|---|---|
| `NSPrivacyAccessedAPICategoryFileTimestamp` | C617.1, 0A2A.1, 3B52.1 | react-native, async-storage (C617.1); expo-file-system (0A2A.1, 3B52.1) |
| `NSPrivacyAccessedAPICategoryUserDefaults` | CA92.1 | react-native, expo-constants, expo-localization, expo-system-ui |
| `NSPrivacyAccessedAPICategorySystemBootTime` | 35F9.1 | react-native (React-timing), boost |
| `NSPrivacyAccessedAPICategoryDiskSpace` | E174.1, 85F4.1 | expo-file-system |

AsyncStorage is pinned at 2.2.0 by SDK 57; its installed manifest was read and declares exactly FileTimestamp / C617.1 (no UserDefaults), so the expectation in the plan held.

## Linked native packages without a manifest

None of these reference a required-reason API symbol in their iOS/C++ sources (source grep, step 3), so no manifest is needed:
`@expo/dom-webview`, `@expo/log-box`, `@expo/ui`, `expo`, `expo-asset`, `expo-blur`, `expo-dev-client`, `expo-dev-menu-interface`, `expo-font`, `expo-glass-effect`, `expo-json-utils`, `expo-keep-awake`, `expo-linking`, `expo-manifests`, `expo-modules-core`, `expo-modules-jsi`, `expo-router`, `expo-splash-screen`, `expo-symbols`, `expo-updates-interface`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets`, `react-native-screens`, `react-native-safe-area-context`, `@react-native-masked-view/masked-view`.

## Stop-signal check

Two packages touch `UserDefaults` and ship no manifest:

| Package | Version | Files | Verdict |
|---|---|---|---|
| `expo-dev-launcher` | 57.0.20 | `EXDevLauncherController.m`, `EXDevLauncherRecentlyOpenedAppsRegistry.swift`, `EXDevLauncherErrorRegistry.swift`, `DevLauncherViewModel.swift`, `DevLauncherViews.swift` | not a release risk: `debugOnly: true` |
| `expo-dev-menu` | 57.0.18 | `DevMenuManager.swift`, `DevMenuFABView.swift`, `DevMenuPreferences.swift` | not a release risk: `debugOnly: true` |

`expo-modules-autolinking resolve` reports `debugOnly: true` for both (set in their `expo-module.config.json`), so they are compiled only for the Debug configuration and are absent from Release/App Store archives. No release-blocking stop-signal. Caveat: this holds only while builds for submission are Release configuration (EAS `production` profile); a Debug or `developmentClient` build is never for the store.

## Open items (for the release spec, not this step)

- The app's own `NSPrivacyCollectedDataTypes` / `NSPrivacyTracking` declarations are not set here (skeleton has no data collection); decide in the release spec together with the App Store privacy questionnaire.
- The `Info.plist` contains no `NS*UsageDescription` (verified via `npx expo config --type public`); the skeleton requests no permissions.
