import { APP_NAME } from "../../../../app.constants";
import enMeta from "../../../../locales/en.json";
import ruMeta from "../../../../locales/ru.json";
import ukMeta from "../../../../locales/uk.json";
import { en } from "../locales/en";
import { ru } from "../locales/ru";
import { uk } from "../locales/uk";

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

type Entry = { path: string; key: string; value: string };

function flatten(node: unknown, prefix: string[] = []): Entry[] {
  if (typeof node === "string") {
    const path = prefix.join(".");
    return [{ path, key: prefix[prefix.length - 1] ?? "", value: node }];
  }
  if (typeof node === "object" && node !== null) {
    return Object.entries(node).flatMap(([key, child]) => flatten(child, [...prefix, key]));
  }
  throw new Error(`Non-string, non-object value at ${prefix.join(".")}`);
}

const ruEntries = flatten(ru);
const enEntries = flatten(en);
const ukEntries = flatten(uk);

const withoutPluralSuffix = (path: string) => path.replace(PLURAL_SUFFIX, "");
const pluralGroups = (entries: Entry[]) => {
  const groups = new Map<string, string[]>();
  for (const { path } of entries) {
    if (!PLURAL_SUFFIX.test(path)) continue;
    const base = withoutPluralSuffix(path);
    groups.set(base, [...(groups.get(base) ?? []), PLURAL_SUFFIX.exec(path)?.[1] ?? ""]);
  }
  return groups;
};
const placeholders = (value: string) =>
  [...value.matchAll(/{{\s*(\w+)\s*}}/g)].map((match) => match[1] ?? "").sort();

describe.each([
  ["ru", ruEntries],
  ["en", enEntries],
  ["uk", ukEntries],
] as const)("%s strings", (_locale, entries) => {
  it("has no empty values", () => {
    expect(entries.filter(({ value }) => value.trim() === "").map(({ path }) => path)).toEqual([]);
  });

  it("has no value equal to its own key", () => {
    const leaked = entries.filter(({ path, value }) => value === path);
    expect(leaked.map(({ path }) => path)).toEqual([]);
  });
});

describe("ru/en parity (AC-34)", () => {
  // Plural categories legitimately differ per language (ru: one/few/many/other,
  // en: one/other), so keys are compared with the plural suffix stripped.
  const keySet = (entries: Entry[]) => [...new Set(entries.map(({ path }) => withoutPluralSuffix(path)))].sort();

  it("has identical key sets in every namespace", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ru).sort());
    expect(keySet(enEntries)).toEqual(keySet(ruEntries));
  });

  it("has the same key sets in uk as in ru", () => {
    expect(Object.keys(uk).sort()).toEqual(Object.keys(ru).sort());
    expect(keySet(ukEntries)).toEqual(keySet(ruEntries));
  });

  it("uses the same interpolation variables for each key", () => {
    const vars = (entries: Entry[]) => {
      const byKey = new Map<string, string[]>();
      for (const { path, value } of entries) {
        const base = withoutPluralSuffix(path);
        byKey.set(base, [...new Set([...(byKey.get(base) ?? []), ...placeholders(value)])].sort());
      }
      return byKey;
    };
    expect(vars(enEntries)).toEqual(vars(ruEntries));
    expect(vars(ukEntries)).toEqual(vars(ruEntries));
  });

  it.each([
    ["ru", ruEntries],
    ["en", enEntries],
    ["uk", ukEntries],
  ] as const)("%s defines every CLDR plural category its language needs", (locale, entries) => {
    const required = new Intl.PluralRules(locale).resolvedOptions().pluralCategories;
    for (const [base, categories] of pluralGroups(entries)) {
      expect({ base, categories: [...categories].sort() }).toEqual({
        base,
        categories: [...required].sort(),
      });
    }
  });

  it("marks the same keys as plural in both locales", () => {
    expect([...pluralGroups(enEntries).keys()].sort()).toEqual([...pluralGroups(ruEntries).keys()].sort());
    expect([...pluralGroups(ukEntries).keys()].sort()).toEqual([...pluralGroups(ruEntries).keys()].sort());
  });
});

describe("mock-era city names (SPEC-03 AC-66)", () => {
  it.each([
    ["ru", ru, ruEntries],
    ["en", en, enEntries],
    ["uk", uk, ukEntries],
  ] as const)("%s has no `trips.cities` block and no `cities.*` key anywhere", (_locale, locale, entries) => {
    expect(Object.keys(locale.trips)).not.toContain("cities");
    expect(entries.filter(({ path }) => /(^|\.)cities(\.|$)/.test(path)).map(({ path }) => path)).toEqual([]);
  });
});

describe("iOS metadata locales", () => {
  it("shows the single-source app name in every locale", () => {
    expect(ruMeta.CFBundleDisplayName).toBe(APP_NAME);
    expect(enMeta.CFBundleDisplayName).toBe(APP_NAME);
    expect(ukMeta.CFBundleDisplayName).toBe(APP_NAME);
  });
});
