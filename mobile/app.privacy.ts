import type { ExpoConfig } from "expo/config";

type IosPrivacyManifests = NonNullable<
  NonNullable<ExpoConfig["ios"]>["privacyManifests"]
>;

// Mirror of the required-reason APIs used by native dependencies (Apple does not
// reliably parse manifests of statically linked pods, so the app-level manifest
// must repeat them). Values are copied from the installed PrivacyInfo.xcprivacy
// files, NOT assumed. Audit trail (packages, versions, date, per-file table):
// docs/release/privacy-manifest-audit.md — re-run it on every SDK bump / new
// native dependency.
//
// Sources per category (audit 2026-09-19, Expo SDK 57):
// - FileTimestamp: C617.1 react-native (+ RCT-Folly, boost, glog, cxxreact),
//   @react-native-async-storage/async-storage 2.2.0; 0A2A.1 + 3B52.1
//   expo-file-system 57.0.7.
// - UserDefaults CA92.1: react-native, expo-constants, expo-localization,
//   expo-system-ui.
// - SystemBootTime 35F9.1: react-native (React-timing), boost.
// - DiskSpace: E174.1 + 85F4.1 expo-file-system 57.0.7.
//
// Re-audit 2026-09-21 (SPEC-02): expo-secure-store 57.0.4 and expo-crypto 57.0.3
// ship NO PrivacyInfo.xcprivacy and their iOS sources touch no required-reason
// API (Keychain / CryptoKit are not on Apple's list), so the union above is
// unchanged. aes-js 3.1.2 is pure JS (no manifest). No NS*UsageDescription.
export const iosPrivacyManifests: IosPrivacyManifests = {
  NSPrivacyAccessedAPITypes: [
    {
      NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
      NSPrivacyAccessedAPITypeReasons: ["C617.1", "0A2A.1", "3B52.1"],
    },
    {
      NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
      NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
    },
    {
      NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategorySystemBootTime",
      NSPrivacyAccessedAPITypeReasons: ["35F9.1"],
    },
    {
      NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryDiskSpace",
      NSPrivacyAccessedAPITypeReasons: ["E174.1", "85F4.1"],
    },
  ],
};
