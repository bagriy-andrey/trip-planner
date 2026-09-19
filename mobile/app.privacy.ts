import type { ExpoConfig } from "expo/config";

type IosPrivacyManifests = NonNullable<
  NonNullable<ExpoConfig["ios"]>["privacyManifests"]
>;

// Mirror of the required-reason APIs used by native dependencies (Apple does not
// reliably parse manifests of statically linked pods).
// TODO(Step 10): fill from the audit of installed PrivacyInfo.xcprivacy files
// (expected: AsyncStorage -> NSPrivacyAccessedAPICategoryFileTimestamp / C617.1).
export const iosPrivacyManifests: IosPrivacyManifests = {};
