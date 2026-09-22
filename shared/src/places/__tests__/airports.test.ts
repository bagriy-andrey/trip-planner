import { describe, expect, it } from "vitest";
import {
  AIRPORTS,
  AIRPORT_CODE_PATTERN,
  PLACE_DIRECTORY,
  airportRecordSchema,
  isValidTimeZone,
  type AirportRecord,
  type CityRecord,
  type PlaceRecord,
} from "../../index";

const airports: readonly AirportRecord[] = AIRPORTS;
const places: readonly PlaceRecord[] = PLACE_DIRECTORY;
const cities: readonly CityRecord[] = places.filter((p): p is CityRecord => p.kind === "city");
const cityById = new Map(cities.map((c) => [c.id, c]));
const countryCodes = new Set(
  places.filter((p) => p.kind === "country").map((c) => c.countryCode),
);

describe("airport directory volume and shape (AC-11, AC-12)", () => {
  it("has at least 300 records", () => {
    expect(airports.length).toBeGreaterThanOrEqual(300);
  });

  it("every record parses with airportRecordSchema (shape, kind, IATA)", () => {
    for (const airport of airports) {
      const result = airportRecordSchema.safeParse(airport);
      expect(result.success, `airport ${airport.id}`).toBe(true);
    }
    for (const airport of airports) {
      expect(airport.kind).toBe("airport");
    }
  });

  it("has unique ids and unique IATA codes", () => {
    const ids = airports.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    const codes = airports.map((a) => a.iata);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("gives every city with an airportCode at least one airport", () => {
    const citiesWithAirportCode = cities.filter((c) => c.airportCode !== undefined);
    expect(citiesWithAirportCode.length).toBeGreaterThan(0);
    for (const city of citiesWithAirportCode) {
      const own = airports.filter((a) => a.cityId === city.id);
      expect(own.length, city.id).toBeGreaterThan(0);
    }
  });

  it("gives a city WITHOUT an airportCode zero airports", () => {
    const citiesWithoutAirportCode = cities.filter((c) => c.airportCode === undefined);
    for (const city of citiesWithoutAirportCode) {
      const own = airports.filter((a) => a.cityId === city.id);
      expect(own.length, city.id).toBe(0);
    }
  });
});

describe("primary airport invariant (AC-13, AC-14)", () => {
  it("has exactly one isPrimary airport per city", () => {
    const byCity = new Map<string, AirportRecord[]>();
    for (const airport of airports) {
      const list = byCity.get(airport.cityId) ?? [];
      list.push(airport);
      byCity.set(airport.cityId, list);
    }
    for (const [cityId, list] of byCity) {
      const primaries = list.filter((a) => a.isPrimary);
      expect(primaries.length, cityId).toBe(1);
    }
  });

  it("has at least one multi-airport city", () => {
    const counts = new Map<string, number>();
    for (const airport of airports) counts.set(airport.cityId, (counts.get(airport.cityId) ?? 0) + 1);
    const multi = [...counts.values()].filter((n) => n > 1);
    expect(multi.length).toBeGreaterThan(0);
  });

  it("cross-checks city.airportCode against the iata of that city's primary airport", () => {
    for (const city of cities) {
      const primary = airports.find((a) => a.cityId === city.id && a.isPrimary);
      if (city.airportCode === undefined) {
        expect(primary, city.id).toBeUndefined();
      } else {
        expect(primary, city.id).toBeDefined();
        expect(primary?.iata, city.id).toBe(city.airportCode);
      }
    }
  });
});

describe("airport data integrity (AC-15)", () => {
  it("has every IATA code as exactly three upper-case Latin letters", () => {
    for (const airport of airports) {
      expect(airport.iata, airport.id).toMatch(AIRPORT_CODE_PATTERN);
      expect(airport.iata, airport.id).toMatch(/^[A-Z]{3}$/);
    }
  });

  it("points every airport at a cityId that exists in PLACE_DIRECTORY", () => {
    for (const airport of airports) {
      expect(cityById.has(airport.cityId), `${airport.id}: ${airport.cityId}`).toBe(true);
    }
  });

  it("gives every airport a countryCode known to PLACE_DIRECTORY", () => {
    for (const airport of airports) {
      expect(countryCodes.has(airport.countryCode), `${airport.id}: ${airport.countryCode}`).toBe(
        true,
      );
    }
  });

  it("gives every airport a time zone accepted by Intl.DateTimeFormat", () => {
    for (const airport of airports) {
      expect(isValidTimeZone(airport.timeZone), `${airport.id}: ${airport.timeZone}`).toBe(true);
    }
  });

  it("has non-empty ru and en names on every airport", () => {
    for (const airport of airports) {
      expect(airport.ru.length, airport.id).toBeGreaterThan(0);
      expect(airport.en.length, airport.id).toBeGreaterThan(0);
    }
  });
});

describe("required 'fake geography' trap airports (AC-15a)", () => {
  const EXISTING_CITY_IDS_BEFORE_STEP_2 = [
    "city-lisbon","city-porto","city-madrid","city-barcelona","city-paris","city-nice","city-rome",
    "city-milan","city-venice","city-florence","city-berlin","city-munich","city-london","city-dublin",
    "city-amsterdam","city-brussels","city-zurich","city-geneva","city-vienna","city-prague",
    "city-budapest","city-warsaw","city-athens","city-dubrovnik","city-istanbul","city-moscow",
    "city-saint-petersburg","city-copenhagen","city-stockholm","city-oslo","city-helsinki",
    "city-reykjavik","city-dubai","city-doha","city-tel-aviv","city-cairo","city-marrakesh",
    "city-cape-town","city-nairobi","city-tbilisi","city-yerevan","city-bangkok","city-phuket",
    "city-bali","city-ho-chi-minh-city","city-kuala-lumpur","city-male","city-delhi","city-beijing",
    "city-shanghai","city-tokyo","city-seoul","city-sydney","city-auckland","city-new-york",
    "city-los-angeles","city-san-francisco","city-miami","city-chicago","city-honolulu","city-toronto",
    "city-vancouver","city-mexico-city","city-cancun","city-rio-de-janeiro","city-sao-paulo",
    "city-buenos-aires","city-lima","city-bogota","city-santiago",
  ];

  it("did not touch any pre-existing city id", () => {
    const ids = new Set(cities.map((c) => c.id));
    for (const id of EXISTING_CITY_IDS_BEFORE_STEP_2) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it.each([
    ["GRO", "city-girona"],
    ["HHN", "city-hahn"],
    ["BVA", "city-beauvais"],
    ["BGY", "city-bergamo"],
    ["TRF", "city-sandefjord"],
  ])("%s belongs to its own new city %s, not the metro it's marketed under", (iata, cityId) => {
    const airport = airports.find((a) => a.iata === iata);
    expect(airport, iata).toBeDefined();
    expect(airport?.cityId, iata).toBe(cityId);
    expect(airport?.isPrimary, iata).toBe(true);
    const city = cityById.get(cityId);
    expect(city, cityId).toBeDefined();
    expect(city?.airportCode).toBe(iata);
  });
});
