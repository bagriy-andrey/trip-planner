import { describe, expect, it } from "vitest";
import {
  AIRPORT_CODE_PATTERN,
  PLACE_DIRECTORY,
  PLACE_REGIONS,
  findPlaceById,
  foldForSearch,
  isValidTimeZone,
  placeRecordSchema,
  type CityRecord,
  type CountryRecord,
  type PlaceRecord,
} from "../../index";

const places: readonly PlaceRecord[] = PLACE_DIRECTORY;
const cities = places.filter((p): p is CityRecord => p.kind === "city");
const countries = places.filter((p): p is CountryRecord => p.kind === "country");

describe("place directory integrity (AC-10, AC-11)", () => {
  it("has 150-300 records", () => {
    expect(places.length).toBeGreaterThanOrEqual(150);
    expect(places.length).toBeLessThanOrEqual(300);
  });

  it("holds every country of the world (~195) plus a set of popular cities", () => {
    expect(countries.length).toBeGreaterThanOrEqual(190);
    expect(cities.length).toBeGreaterThanOrEqual(50);
  });

  it("every record parses with the record schema (shape, alpha-2, IATA, zone)", () => {
    for (const place of places) {
      const result = placeRecordSchema.safeParse(place);
      expect(result.success, `record ${place.id}`).toBe(true);
    }
  });

  it("has unique ids of the form country-<iso2 lower> / city-<kebab>", () => {
    const ids = places.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const country of countries) {
      expect(country.id).toBe(`country-${country.countryCode.toLowerCase()}`);
    }
    for (const city of cities) {
      expect(city.id).toMatch(/^city-[a-z]+(-[a-z]+)*$/);
    }
  });

  it("has non-empty, trimmed ru and en names on every record", () => {
    for (const place of places) {
      for (const name of [place.ru, place.en]) {
        expect(name.trim(), place.id).toBe(name);
        expect(name.length, place.id).toBeGreaterThan(0);
      }
    }
  });

  it("has a Cyrillic ru name and a Latin en name on every record", () => {
    for (const place of places) {
      expect(place.ru, place.id).toMatch(/^[А-Яа-яЁё][А-Яа-яЁё\s\-—’]*$/);
      expect(place.en, place.id).toMatch(/^[A-Za-zÀ-ž][A-Za-zÀ-ž\s\-’]*$/);
    }
  });

  it("has every IATA code as exactly three UPPER-CASE LATIN letters (catches 0P0 for OPO)", () => {
    const withAirport = cities.filter((c) => c.airportCode !== undefined);
    expect(withAirport.length).toBeGreaterThan(0);
    for (const city of withAirport) {
      expect(city.airportCode, city.id).toMatch(AIRPORT_CODE_PATTERN);
      expect(city.airportCode, city.id).toMatch(/^[A-Z]{3}$/);
    }
    // an IATA code identifies one airport: no two cities share it
    const codes = withAirport.map((c) => c.airportCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("has a time zone accepted by Intl.DateTimeFormat on every city", () => {
    for (const city of cities) {
      expect(isValidTimeZone(city.timeZone), `${city.id}: ${city.timeZone}`).toBe(true);
      expect(() => new Intl.DateTimeFormat("en", { timeZone: city.timeZone })).not.toThrow();
    }
  });

  it("spells each zone as an IANA id (Area/Location), since Intl also accepts wrong case", () => {
    for (const city of cities) {
      expect(city.timeZone, city.id).toMatch(/^[A-Z][A-Za-z]+(\/[A-Z][A-Za-z_]+)+$/);
    }
  });

  it("gives every country a known region id and a unique ISO alpha-2 code", () => {
    for (const country of countries) {
      expect(PLACE_REGIONS, country.id).toContain(country.region);
    }
    const codes = countries.map((c) => c.countryCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("uses every region id at least once (no dead ids in the contract)", () => {
    for (const region of PLACE_REGIONS) {
      expect(countries.some((c) => c.region === region), region).toBe(true);
    }
  });

  it("points every city at a country that is in the directory", () => {
    const known = new Set(countries.map((c) => c.countryCode));
    for (const city of cities) {
      expect(known.has(city.countryCode), `${city.id}: ${city.countryCode}`).toBe(true);
    }
  });

  it("never lists the same name twice, so a suggestion is never shown double", () => {
    for (const key of ["ru", "en"] as const) {
      const folded = places.map((p) => foldForSearch(p[key]));
      expect(new Set(folded).size, key).toBe(folded.length);
    }
  });

  it("findPlaceById finds a record and returns undefined for an unknown id", () => {
    expect(findPlaceById("city-porto")?.en).toBe("Porto");
    expect(findPlaceById("country-pt")?.ru).toBe("Португалия");
    expect(findPlaceById("city-atlantis")).toBeUndefined();
  });
});

describe("place directory content spot checks (hand-verified data)", () => {
  const cityOf = (id: string): CityRecord => {
    const found = cities.find((c) => c.id === id);
    if (!found) throw new Error(`no city ${id}`);
    return found;
  };

  it.each([
    ["city-porto", "OPO", "PT", "Europe/Lisbon"],
    ["city-lisbon", "LIS", "PT", "Europe/Lisbon"],
    ["city-london", "LHR", "GB", "Europe/London"],
    ["city-paris", "CDG", "FR", "Europe/Paris"],
    ["city-zurich", "ZRH", "CH", "Europe/Zurich"],
    ["city-istanbul", "IST", "TR", "Europe/Istanbul"],
    ["city-dubai", "DXB", "AE", "Asia/Dubai"],
    ["city-tokyo", "HND", "JP", "Asia/Tokyo"],
    ["city-new-york", "JFK", "US", "America/New_York"],
    ["city-sao-paulo", "GRU", "BR", "America/Sao_Paulo"],
    ["city-sydney", "SYD", "AU", "Australia/Sydney"],
    ["city-delhi", "DEL", "IN", "Asia/Kolkata"],
  ])("%s -> %s, %s, %s", (id, iata, country, zone) => {
    const city = cityOf(id);
    expect(city.airportCode).toBe(iata);
    expect(city.countryCode).toBe(country);
    expect(city.timeZone).toBe(zone);
  });
});
