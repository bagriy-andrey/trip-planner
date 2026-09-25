import type { ExpoConfig } from "expo/config";

// The Expo CLI transpiles only this file, then loads it as plain Node CJS/ESM, so an
// extensionless `import "./app.constants"` fails to resolve at `expo config` time.
// Node >= 22.18 strips types from an explicit `.ts` path; tsc gets the types from the
// `typeof import` annotations (a static `.ts` import would need `allowImportingTsExtensions`).
const { APP_NAME, APP_SCHEME, APP_SLUG } =
  require("./app.constants.ts") as typeof import("./app.constants");
const { iosPrivacyManifests } =
  require("./app.privacy.ts") as typeof import("./app.privacy");

// Dark app background: also the native splash/root color, so there is no white flash.
const BACKGROUND_COLOR = "#0B0D11";

export default (): ExpoConfig => ({
  name: APP_NAME,
  slug: APP_SLUG,
  scheme: APP_SCHEME,
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  backgroundColor: BACKGROUND_COLOR,
  icon: "./assets/icon.png",
  // iOS metadata localization (CFBundleDisplayName only) so iOS treats the app as localized.
  locales: {
    ru: "./locales/ru.json",
    en: "./locales/en.json",
    uk: "./locales/uk.json",
  },
  experiments: {
    typedRoutes: true,
  },
  ios: {
    supportsTablet: false,
    // TEMPORARY placeholder: the final bundle identifier is chosen in the release
    // spec (Q12). Do not ship or register this value.
    bundleIdentifier: "com.anonymous.tripplanner",
    privacyManifests: iosPrivacyManifests,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: BACKGROUND_COLOR,
    },
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: BACKGROUND_COLOR,
      },
    ],
    "expo-localization",
    // iOS 27 needs the UIScene life cycle; the SDK 57 prebuild template lacks it.
    "./plugins/withIosSceneLifecycle",
  ],
});
