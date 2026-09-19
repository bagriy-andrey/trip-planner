import { parseThemePreference, resolveColorScheme } from "../preference";

describe("parseThemePreference (AC-31)", () => {
  it.each(["light", "dark", "system"])("accepts %s", (value) => {
    expect(parseThemePreference(value)).toBe(value);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["empty string", ""],
    ["localized label", "Светлая"],
    ["JSON object string", '{"a":1}'],
    ["wrong case", "Dark"],
    ["number", 1],
    ["boolean", true],
    ["object", { a: 1 }],
  ])("rejects %s", (_label, value) => {
    expect(parseThemePreference(value)).toBeNull();
  });
});

describe("resolveColorScheme (AC-14)", () => {
  it("default dark preference stays dark when the system is light", () => {
    expect(resolveColorScheme("dark", "light")).toBe("dark");
  });

  it("explicit light stays light when the system is dark", () => {
    expect(resolveColorScheme("light", "dark")).toBe("light");
  });

  it("system follows a light device", () => {
    expect(resolveColorScheme("system", "light")).toBe("light");
  });

  it("system follows a dark device", () => {
    expect(resolveColorScheme("system", "dark")).toBe("dark");
  });

  it.each([null, undefined, "unspecified" as const])(
    "system falls back to dark when the device reports %s",
    (system) => {
      expect(resolveColorScheme("system", system)).toBe("dark");
    },
  );
});
