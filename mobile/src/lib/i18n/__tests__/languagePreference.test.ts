import {
  DEFAULT_LANGUAGE_PREFERENCE,
  LANGUAGE_PREFERENCES,
  LANGUAGE_STORAGE_KEY,
  parseLanguagePreference,
  resolveLanguage,
} from "../languagePreference";
import { placeLanguageOf } from "../placeLanguage";
import { SUPPORTED_LOCALES } from "../resolveLocale";

describe("language preference", () => {
  it("offers 'system' first, then every supported locale", () => {
    expect(LANGUAGE_PREFERENCES[0]).toBe("system");
    expect([...LANGUAGE_PREFERENCES].slice(1).sort()).toEqual([...SUPPORTED_LOCALES].sort());
  });

  it("defaults to following the device", () => {
    expect(DEFAULT_LANGUAGE_PREFERENCE).toBe("system");
    expect(LANGUAGE_STORAGE_KEY).toBe("tripplanner.settings.language");
  });

  it.each(["system", "en", "ru", "uk"])("parses %s", (value) => {
    expect(parseLanguagePreference(value)).toBe(value);
  });

  it.each([null, undefined, "", "de", "EN", 1, {}])("rejects the untrusted value %j", (value) => {
    expect(parseLanguagePreference(value)).toBeNull();
  });

  it("resolves 'system' to the device locale and a choice to itself", () => {
    expect(resolveLanguage("system", "uk")).toBe("uk");
    expect(resolveLanguage("system", "en")).toBe("en");
    expect(resolveLanguage("ru", "uk")).toBe("ru");
    expect(resolveLanguage("uk", "en")).toBe("uk");
  });
});

describe("placeLanguageOf", () => {
  it("keeps ru and shows English place names for en and uk (no Ukrainian directory yet)", () => {
    expect(placeLanguageOf("ru")).toBe("ru");
    expect(placeLanguageOf("en")).toBe("en");
    expect(placeLanguageOf("uk")).toBe("en");
  });
});
