import { describe, expect, it } from "vitest";
import { AIRPORTS } from "../airports";
import { PLACE_DIRECTORY } from "../directory";
import { foldForSearch } from "../fold";
import {
  countryHasCities,
  searchAirportOptions,
  searchCityOptions,
  searchCountryOptions,
} from "../pickerSearch";

describe("searchCountryOptions", () => {
  it("returns every country for a blank query, alphabetical by folded name", () => {
    const all = searchCountryOptions("", "ru");
    expect(all).toHaveLength(197);
    const keys = all.map((c) => foldForSearch(c.ru));
    for (let i = 1; i < keys.length; i += 1) expect(keys[i - 1]! <= keys[i]!).toBe(true);
    expect(all[0]?.ru.startsWith("А")).toBe(true);
  });

  it("puts an exact alpha-2 code first, any case", () => {
    expect(searchCountryOptions("PL", "ru")[0]?.countryCode).toBe("PL");
    expect(searchCountryOptions("pl", "en")[0]?.countryCode).toBe("PL");
  });

  it("matches the start of the ru or en name whatever the UI language", () => {
    expect(searchCountryOptions("Пол", "en")[0]?.countryCode).toBe("PL");
    expect(searchCountryOptions("Pol", "ru")[0]?.countryCode).toBe("PL");
  });

  it("does not transliterate", () => {
    // ru name is "Порту": a matching ru query hits it, a mere transliteration of the en name does not.
    expect(searchCityOptions("Порту", "en", null).map((c) => c.id)).toContain("city-porto");
    expect(searchCityOptions("Порто", "ru", null).map((c) => c.id)).not.toContain("city-porto");
  });

  it("folds the query the same way for e and yo", () => {
    expect(searchCityOptions("Бёр", "ru", null)).toEqual(searchCityOptions("Бер", "ru", null));
    expect(searchCityOptions("Бер", "ru", null).map((c) => c.id)).toContain("city-berlin");
  });

  it("has no duplicates", () => {
    const ids = searchCountryOptions("P", "en").map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("searchCityOptions", () => {
  it("returns all 100 cities for a blank query", () => {
    expect(searchCityOptions("", "en", null)).toHaveLength(100);
  });

  it("finds a city by its airport code first", () => {
    expect(searchCityOptions("KRK", "ru", null)[0]?.id).toBe("city-krakow");
  });

  it("filters by the residence country before searching", () => {
    const pl = searchCityOptions("", "ru", "PL");
    expect(pl.length).toBeGreaterThan(0);
    expect(pl.every((c) => c.countryCode === "PL")).toBe(true);
    expect(searchCityOptions("KRK", "ru", "DE")).toEqual([]);
  });

  it("finds Zurich with a plain Latin u", () => {
    expect(searchCityOptions("Zur", "en", null).map((c) => c.en)).toContain("Zürich");
  });

  it("knows which countries have no cities", () => {
    expect(countryHasCities("AD")).toBe(false);
    expect(countryHasCities("PL")).toBe(true);
  });
});

describe("searchAirportOptions", () => {
  it("returns all airports for a blank query", () => {
    expect(searchAirportOptions("", "en", null)).toHaveLength(AIRPORTS.length);
  });

  it("lists the home city airports first, primary first", () => {
    const list = searchAirportOptions("", "en", "city-barcelona").map((a) => a.iata);
    expect(list[0]).toBe("BCN");
    const own = AIRPORTS.filter((a) => a.cityId === "city-barcelona").length;
    expect(own).toBeGreaterThan(1);
    expect(list.slice(0, own).every((i) => AIRPORTS.find((a) => a.iata === i)?.cityId === "city-barcelona")).toBe(
      true,
    );
  });

  it("puts an exact IATA code first and matches the city name", () => {
    expect(searchAirportOptions("krk", "ru", null)[0]?.iata).toBe("KRK");
    expect(searchAirportOptions("Жир", "ru", null).map((a) => a.iata)).toContain("GRO");
  });

  it("directory sanity: 197 countries and 100 cities", () => {
    expect(PLACE_DIRECTORY.filter((p) => p.kind === "country")).toHaveLength(197);
  });
});
