# Privacy manifest audit (required-reason APIs)

- Date: 2026-09-19
- Scope: Expo SDK 57 skeleton (`mobile/`, PLAN-01 Step 10), iOS.
- Result: `iosPrivacyManifests` in `mobile/app.privacy.ts` mirrors the union below into `ios.privacyManifests`.
  Apple does not reliably parse manifests of statically linked pods, so the app-level manifest repeats them.
- Latest entry: 2026-09-21, SPEC-03 trips CRUD (`@react-native-community/datetimepicker` 9.1.0, `@tanstack/react-query`) - see "Audit 2026-09-21 (SPEC-03 ...)" at the end. Union unchanged. Earlier: 2026-09-21, SPEC-02 email auth (`expo-secure-store`, `expo-crypto`, `aes-js`). Union unchanged.
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

## Audit 2026-09-21 (SPEC-02 email auth, PLAN-02 Step 5)

Scope: the native/JS dependencies added by SPEC-02 Step 1. Same procedure as above (pnpm store walked by real paths under `node_modules/.pnpm`; linked pods from `npx expo-modules-autolinking resolve --platform apple --json`; iOS source grep for the required-reason symbols listed in step 3; podspec check).

| Package | Version | Kind | Linked pod | `PrivacyInfo.xcprivacy` | Required-reason API in iOS sources | Verdict |
|---|---|---|---|---|---|---|
| `expo-secure-store` | 57.0.4 | native (Expo module) | `ExpoSecureStore`, `debugOnly: false` | none (no `*.xcprivacy` anywhere in the package, no `resource_bundles` in the podspec) | none (Keychain access via Security framework is not a required-reason API) | no manifest needed |
| `expo-crypto` | 57.0.3 | native (Expo module) | `ExpoCrypto`, `debugOnly: false` | none (same checks) | none (CryptoKit digest/AES, no file/defaults/uptime/disk APIs) | no manifest needed |
| `aes-js` | 3.1.2 | pure JS | none (not linked) | not applicable | not applicable | no manifest needed |

- Store contents: one copy each (`expo-secure-store@57.0.4_expo@57.0.24`, `expo-crypto@57.0.3_expo@57.0.24`, `aes-js@3.1.2`). The set of `PrivacyInfo.xcprivacy` files in the store is the same as in the 2026-09-19 audit (no new package brings one).
- Result: no new `NSPrivacyAccessedAPITypes` categories or reason codes. `iosPrivacyManifests` in `mobile/app.privacy.ts` is unchanged apart from a comment recording this audit; existing entries (FileTimestamp C617.1/0A2A.1/3B52.1, UserDefaults CA92.1, SystemBootTime 35F9.1, DiskSpace E174.1/85F4.1) are kept.
- Stop-signal check: neither new native package touches a required-reason API without a manifest. No new stop-signal. The two `debugOnly` findings from 2026-09-19 (`expo-dev-launcher`, `expo-dev-menu`) still apply and are unchanged.
- Permissions: no `NS*UsageDescription` is added (SecureStore/Crypto request no system permission); `ios.infoPlist` stays empty of them.
- The new modules are native, so the dev client must be rebuilt once (`npx expo run:ios`).

### Data collection (App Store Connect declaration)

From SPEC-02 the app collects email and display name, linked to the user's identity (purpose: authentication). The App Store Connect data-collection declaration (App Privacy questionnaire; and `NSPrivacyCollectedDataTypes` if declared in the app manifest) is therefore no longer empty. This is an obligation of the release spec; the open item above ("skeleton has no data collection") is superseded by this line. `NSPrivacyTracking` stays `false`.

## Audit 2026-09-21 (SPEC-03 trips CRUD, PLAN-03 Step 2)

Scope: the dependencies added by SPEC-03 Step 1. Same procedure as above (pnpm store walked by real paths under `node_modules/.pnpm`; linked pods checked; iOS source grep for the required-reason symbols from step 3, widened with `NSFileManager`, `NSProcessInfo`, `NSURLResource`, `contentModificationDate`, `NSFileSystem*`; podspec check).

| Package | Version | Kind | Linked pod | `PrivacyInfo.xcprivacy` | Required-reason API in iOS sources | Verdict |
|---|---|---|---|---|---|---|
| `@react-native-community/datetimepicker` | 9.1.0 | native (RN autolinking, not an Expo module) | `RNDateTimePicker` (`ios/**/*.{h,m,mm,cpp}`; `ios/fabric` only with the new architecture) | none (`find -L` over the package finds no `*.xcprivacy`; the podspec declares no `resource_bundles`) | none (no hit for any of the symbols above in `ios/*.m`, `ios/*.h`, `ios/fabric/**`; it wraps `UIDatePicker`) | no manifest needed |
| `@tanstack/react-query` (+ `@tanstack/query-core`) | 5.103.1 | pure JS | none (not linked) | not applicable | not applicable | no manifest needed |

- Actual `PrivacyInfo.xcprivacy` contents of the module: there is no file, so nothing to copy. Required-reason codes contributed by the module: none.
- Store contents: one copy of `datetimepicker@9.1.0`, one of `@tanstack/react-query@5.103.1`. The set of `PrivacyInfo.xcprivacy` files in the store is identical to the 2026-09-19 audit (async-storage 2.2.0, expo-constants 57.0.18/57.0.19, expo-file-system 57.0.7, expo-localization 57.0.2, expo-system-ui 57.0.4, plus the `react-native` ones); no new package brings one.
- Result: no new `NSPrivacyAccessedAPITypes` categories or reason codes. `iosPrivacyManifests` in `mobile/app.privacy.ts` is unchanged apart from a comment recording this audit. Existing entries (FileTimestamp C617.1/0A2A.1/3B52.1, UserDefaults CA92.1, SystemBootTime 35F9.1, DiskSpace E174.1/85F4.1) are kept.
- Stop-signal check: the module does not touch a required-reason API, with or without a manifest. No new stop-signal. The two `debugOnly` findings from 2026-09-19 (`expo-dev-launcher`, `expo-dev-menu`) still apply, unchanged.
- Permissions: no `NS*UsageDescription` is added (a date picker requests no system permission); `ios.infoPlist` stays free of them.
- Config plugin: `npx expo install` hints at `plugins: ["@react-native-community/datetimepicker"]`. Its `app.plugin.js` (`plugin/build/withDateTimePickerStyles.js`) only writes Android `styles.xml` theme attributes for the date/time picker dialogs; it has no iOS effect and adds no privacy manifest or usage string. It is therefore irrelevant to the privacy audit; register it in `app.config.ts` only if Android picker theming is wanted (Android is not a first-phase target).
- The module is native, so a new dev-client build is required (already done in SPEC-03 Step 1).

### Data collection (App Store Connect declaration)

From SPEC-03 the app stores user content: place and trip titles (and the other trip fields) tied to the user's account on the backend. Add a "user content" category (Other User Content, linked to the user's identity, purpose: app functionality) to the App Store Connect data-collection declaration (App Privacy questionnaire; and `NSPrivacyCollectedDataTypes` if declared in the app manifest), alongside the email and name from SPEC-02. This is an obligation of the release spec; `NSPrivacyTracking` stays `false`.
