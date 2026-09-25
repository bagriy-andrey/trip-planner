import { DEFAULT_LOCALE, SUPPORTED_LOCALES, resolveLocale } from "../resolveLocale";

describe("resolveLocale", () => {
  it.each([
    [["ru-RU"], "ru"],
    [["ru"], "ru"],
    [["ru_RU"], "ru"],
    [["RU-ru"], "ru"],
    [["en-US"], "en"],
    [["en"], "en"],
    [["en-GB", "ru-RU"], "en"],
    [["de-DE"], "en"],
    [["uk-UA"], "uk"],
    [["uk"], "uk"],
    [["zh-Hans-CN"], "en"],
    [[], "en"],
    [[""], "en"],
  ] as const)("%j -> %s", (tags, expected) => {
    expect(resolveLocale(tags)).toBe(expected);
  });

  it("uses only the first (device) language, per AC-36", () => {
    expect(resolveLocale(["de-DE", "ru-RU"])).toBe("en");
  });

  it("falls back to a supported default", () => {
    expect(SUPPORTED_LOCALES).toContain(DEFAULT_LOCALE);
    expect(resolveLocale([])).toBe(DEFAULT_LOCALE);
  });
});
