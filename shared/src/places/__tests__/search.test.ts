import { describe, expect, it } from "vitest";
import { PLACE_DIRECTORY, searchPlaces } from "../../index";

const ids = (query: string, limit?: number): string[] =>
  searchPlaces(query, limit).map((place) => place.id);

describe("searchPlaces (AC-12, AC-13)", () => {
  it('"Пор" finds Portugal and Porto, the shorter name first', () => {
    expect(ids("Пор")).toEqual(["city-porto", "country-pt"]);
  });

  it('"por" finds the same records', () => {
    expect(ids("por")).toEqual(["city-porto", "country-pt"]);
  });

  it("matches only the START of a name: no hits in the middle of a word", () => {
    // "Порту" is inside "Португалия"? no — but "ртуг" / "ort" are in the middle of names.
    expect(ids("ртуг")).toEqual([]);
    expect(ids("ort")).toEqual([]);
    expect(ids("гал")).toEqual([]);
    // "пор" occurs in no other name: all the results start with it
    for (const place of searchPlaces("Пор")) {
      expect(place.ru.toLowerCase().startsWith("пор") || place.en.toLowerCase().startsWith("пор")).toBe(true);
    }
  });

  it("matches the start of the WHOLE name only, not of a later word", () => {
    // "New York" / "Новая Зеландия": the second word does not start a match
    expect(ids("york")).toEqual([]);
    expect(ids("зеландия")).toEqual([]);
    expect(ids("new y")).toEqual(["city-new-york"]);
  });

  it("is case-insensitive", () => {
    expect(ids("ПОР")).toEqual(ids("пор"));
    expect(ids("PoRt")).toEqual(ids("port"));
  });

  it("is diacritics-insensitive in both directions (Q6)", () => {
    expect(ids("zurich")).toEqual(["city-zurich"]);
    expect(ids("Zürich")).toEqual(["city-zurich"]);
    expect(ids("sao p")).toEqual(["city-sao-paulo"]);
    expect(ids("cote d'iv")).toEqual(["country-ci"]);
    expect(ids("Côte d’Iv")).toEqual(["country-ci"]);
    expect(ids("иемен")).toEqual(["country-ye"]);
  });

  it('does not transliterate between alphabets: "Porto" does not find "Порту" and vice versa', () => {
    expect(ids("Порту")).toEqual(["city-porto", "country-pt"]);
    expect(ids("Porto")).toEqual(["city-porto"]);
    expect(ids("Portu")).toEqual(["country-pt"]);
    // each finds it by ITS OWN name; the Latin query is not converted to Cyrillic:
    expect(searchPlaces("Porto").map((p) => p.ru)).toEqual(["Порту"]);
    // a Cyrillic-only name is never reached by a Latin prefix that is merely its transliteration
    expect(ids("Lissabon")).toEqual([]);
    expect(ids("Лисабон")).toEqual([]);
  });

  it("returns at most 4 results by default, and honours an explicit limit", () => {
    const all = PLACE_DIRECTORY.filter((p) => p.en.toLowerCase().startsWith("s")).length;
    expect(all).toBeGreaterThan(4);
    expect(searchPlaces("s")).toHaveLength(4);
    expect(searchPlaces("s", 2)).toHaveLength(2);
    expect(searchPlaces("s", 10)).toHaveLength(10);
    expect(searchPlaces("s", 0)).toEqual([]);
    expect(searchPlaces("s", -3)).toEqual([]);
    expect(searchPlaces("s", Number.NaN)).toEqual([]);
  });

  it("returns nothing for a query that matches nothing", () => {
    expect(ids("1")).toEqual([]);
    expect(ids("123")).toEqual([]);
    expect(ids("qqqq")).toEqual([]);
    expect(ids("日本")).toEqual([]);
  });

  it("returns nothing for an empty or blank query", () => {
    expect(ids("")).toEqual([]);
    expect(ids("   ")).toEqual([]);
  });

  it("ignores leading/trailing and repeated spaces of the query", () => {
    expect(ids("  por  ")).toEqual(ids("por"));
    expect(ids("new   york")).toEqual(["city-new-york"]);
  });

  it("is synchronous (returns a plain array, not a promise)", () => {
    const result = searchPlaces("por");
    expect(Array.isArray(result)).toBe(true);
    expect((result as unknown as { then?: unknown }).then).toBeUndefined();
  });

  it("is deterministic: same input, same order, every time", () => {
    const first = ids("s");
    for (let i = 0; i < 5; i += 1) {
      expect(ids("s")).toEqual(first);
    }
  });

  it("orders by the shorter matched name, then by id", () => {
    // "s" is a Latin prefix: every hit is matched through its English name
    const result = searchPlaces("s", 300);
    const keys = result.map((place) => [place.en.length, place.id] as const);
    const sorted = [...keys].sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
    expect(keys).toEqual(sorted);
  });

  it("finishes well inside the 5 ms budget on this machine (R-8 smoke check)", () => {
    // Warm up, then time a batch: an average far below the budget, not a flaky exact bound.
    for (let i = 0; i < 20; i += 1) searchPlaces("por");
    const runs = 200;
    const startedAt = Date.now();
    for (let i = 0; i < runs; i += 1) searchPlaces("s");
    const perCall = (Date.now() - startedAt) / runs;
    expect(perCall).toBeLessThan(5);
  });
});
