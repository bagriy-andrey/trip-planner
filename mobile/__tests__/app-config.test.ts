import type { ExpoConfig } from "expo/config";

import createConfig from "../app.config";
import { APP_NAME, APP_SCHEME, APP_SLUG } from "../app.constants";

describe("app.config.ts", () => {
  const config: ExpoConfig = createConfig();

  it("takes identity from app.constants", () => {
    expect(config.name).toBe(APP_NAME);
    expect(config.slug).toBe(APP_SLUG);
    expect(config.scheme).toBe(APP_SCHEME);
  });

  it("is portrait-only and phone-only on iOS", () => {
    expect(config.orientation).toBe("portrait");
    expect(config.ios?.supportsTablet).toBe(false);
  });

  it("declares exactly the ru, en and uk app-metadata locales", () => {
    expect(Object.keys(config.locales ?? {}).sort()).toEqual(["en", "ru", "uk"]);
  });

  it("declares no permission usage strings", () => {
    const infoPlist = config.ios?.infoPlist ?? {};
    const usageKeys = Object.keys(infoPlist).filter((key) =>
      /^NS.*UsageDescription$/.test(key),
    );
    expect(usageKeys).toEqual([]);
  });
});
