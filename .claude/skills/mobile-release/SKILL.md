---
name: mobile-release
description: "Delivery and publishing checklist for the app — EAS Build/Submit, signing, environments, TestFlight, App Store review requirements (privacy manifest, permission strings, account deletion, Sign in with Apple, screenshots/metadata), versioning, OTA updates, and the later Google Play/Android path. Use when preparing a build, TestFlight or App Store submission, changing app.config.ts / eas.json, adding a permission or third-party SDK, or reviewing release-readiness. Trigger terms: EAS, TestFlight, App Store, release, submit, provisioning, signing, privacy manifest, expo-updates, Google Play."
---

# Mobile release

Used by the `release-manager` agent and by anyone touching release config.

## Pipeline (EAS)
- `eas.json` profiles: `development` (dev client, internal), `preview`
  (internal/TestFlight-internal), `production` (store). Env vars per profile;
  secrets via EAS secrets — never committed, never `EXPO_PUBLIC_*`.
- Version: `expo.version` = marketing version (semver); build number
  auto-incremented by EAS (`appVersionSource: remote`).
- `eas build -p ios --profile production` → `eas submit -p ios` → TestFlight.
- OTA (`expo-updates`): JS/asset-only changes; anything touching native code,
  permissions, or `app.config.ts` native fields needs a new binary. Use
  runtime-version policy so an OTA never lands on an incompatible binary.

## App Store readiness checklist (iOS)
- [ ] Bundle identifier + Apple Developer team set; distribution cert/profile
      managed by EAS.
- [ ] Every permission has a specific, honest `NS*UsageDescription`; no unused
      permissions requested.
- [ ] **Privacy manifest** (`PrivacyInfo.xcprivacy`) covers required-reason APIs
      used by the app AND its SDKs; App Privacy "nutrition labels" in App Store
      Connect match actual data collection (incl. analytics/crash SDKs).
      Verification procedure: list every `node_modules/*/ios/**/PrivacyInfo.xcprivacy`
      of the app's direct + transitive native deps, collect their
      `NSPrivacyAccessedAPITypes` (UserDefaults, FileTimestamp, SystemBootTime,
      DiskSpace, ActiveKeyboard) + reason codes, and confirm each appears in
      `ios.privacyManifests` (`app.config.ts`). A dep touching these APIs with no
      manifest of its own = blocking. Watch for `react-native-mmkv` (UserDefaults).
- [ ] **Local storage hygiene:** tokens only in `expo-secure-store`
      (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`), cleared on fresh install (Keychain
      survives reinstall on iOS); no secrets in AsyncStorage/SQLite/`EXPO_PUBLIC_*`.
- [ ] **Encryption export compliance:** `ios.config.usesNonExemptEncryption` set
      deliberately (standard HTTPS/Keychain only → typically `false`); confirm on
      the first TestFlight upload.
- [ ] **Account deletion** removes backend data too: an Edge Function deletes the
      `auth.users` row with the service-role client (clients can't), and FK cascades
      remove all user rows/storage objects — tested end-to-end; third-party processors covered.
- [ ] **Account deletion** available in-app if accounts can be created.
- [ ] **Sign in with Apple** offered if any third-party/social login is offered.
- [ ] Privacy policy URL + support URL live; terms if subscriptions/UGC.
- [ ] If user-generated content: report/block mechanisms.
- [ ] In-app purchases/subscriptions (if any) via StoreKit/IAP only for digital goods.
- [ ] Icons (1024 no alpha), launch screen, screenshots per required device
      size, description, keywords, age rating, review notes + demo account.
- [ ] Tested on a real device from a **release** build via TestFlight; no crashes
      on cold start, offline, permission-denied paths.
- [ ] Accessibility pass: VoiceOver labels, Dynamic Type, contrast, dark mode.
- [ ] Backend production env (hosted Supabase): all migrations applied, RLS enabled +
      policy-tested on every table, no `service_role` key in the app bundle, Auth
      providers/redirect URLs configured, backups on, monitoring/crash reporting on.

## Android later (Google Play) — keep it cheap
- Keep `app.config.ts` Android fields filled in early (package name, adaptive
  icon) even before shipping.
- Play Console: data safety form, target API level requirement, 20-tester
  closed-testing requirement for new personal accounts — plan lead time.
- Before the Android launch, run every SPEC's `Platforms:` iOS-only items as
  the Android backlog, and run the Maestro flows on an Android emulator.

## Release gate
Before submitting: `pnpm -r typecheck && pnpm -r test`, `/pr-self-review` clean,
Maestro core flows green, changelog + version bumped, release notes drafted.
