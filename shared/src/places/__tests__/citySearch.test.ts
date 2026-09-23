import { describe, expect, it } from "vitest";
import { findCityById, searchCities, searchPlaces } from "../search";

describe("searchCities", () => {
  it("returns Porto but not Portugal for a Cyrillic prefix", () => {
    const ids = searchCities("Пор").map((c) => c.id);
    expect(ids).toContain("city-porto");
    expect(ids).not.toContain("country-pt");
  });
  it("returns only cities and respects the limit", () => {
    const hits = searchCities("a", 4);
    expect(hits.length).toBeLessThanOrEqual(4);
    for (const hit of hits) expect(hit.kind).toBe("city");
    expect(searchCities("a", 2)).toHaveLength(2);
  });
  it("filters kind before the limit (countries do not crowd cities out)", () => {
    const all = searchPlaces("ро", 1000).filter((p) => p.kind === "city").slice(0, 4);
    expect(searchCities("ро")).toEqual(all);
  });
  it("is deterministic and empty for blank / no match", () => {
    expect(searchCities("por")).toEqual(searchCities("por"));
    expect(searchCities("  ")).toEqual([]);
    expect(searchCities("zzzz")).toEqual([]);
    expect(searchCities("por", 0)).toEqual([]);
  });
});

describe("findCityById", () => {
  it("finds a city, rejects a country and unknown ids", () => {
    expect(findCityById("city-porto")?.timeZone).toBe("Europe/Lisbon");
    expect(findCityById("country-pt")).toBeUndefined();
    expect(findCityById("nope")).toBeUndefined();
  });
});
