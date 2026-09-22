import { describe, expect, it } from "vitest";
import {
  cityOfAirport,
  findAirportByCode,
  primaryAirportOfCity,
  searchAirports,
} from "../../index";

describe("searchAirports (AC-16, AC-17)", () => {
  it('"Жир" matches Girona by its city name', () => {
    const hits = searchAirports("Жир");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.iata).toBe("GRO");
  });

  it('"Barcel" returns BCN first, then the rest of Barcelona\'s airports', () => {
    const hits = searchAirports("Barcel");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.iata).toBe("BCN");
    expect(hits.every((h) => h.cityId === "city-barcelona")).toBe(true);
    // Barcelona has more than one airport in the directory (a multi-airport city).
    expect(hits.length).toBeGreaterThan(1);
  });

  it('"GRO" (exact IATA) returns Girona first regardless of case', () => {
    const hits = searchAirports("GRO");
    expect(hits[0]?.iata).toBe("GRO");
    const lower = searchAirports("gro");
    expect(lower[0]?.iata).toBe("GRO");
  });

  it('"rcel" (mid-word, not a prefix) matches nothing', () => {
    expect(searchAirports("rcel")).toEqual([]);
  });

  it("never returns more than the limit (default 4)", () => {
    const hits = searchAirports("A");
    expect(hits.length).toBeLessThanOrEqual(4);
  });

  it("is deterministic: repeated calls return the same list, in the same order", () => {
    const first = searchAirports("Lon").map((a) => a.id);
    const second = searchAirports("Lon").map((a) => a.id);
    expect(second).toEqual(first);
  });

  it("returns [] for a blank query or a non-positive limit", () => {
    expect(searchAirports("")).toEqual([]);
    expect(searchAirports("   ")).toEqual([]);
    expect(searchAirports("Lon", 0)).toEqual([]);
  });
});

describe("findAirportByCode / primaryAirportOfCity / cityOfAirport (AC-18)", () => {
  it("findAirportByCode is case-insensitive and returns undefined for an unknown code", () => {
    expect(findAirportByCode("bcn")?.iata).toBe("BCN");
    expect(findAirportByCode("BCN")?.iata).toBe("BCN");
    expect(findAirportByCode("ZZZ")).toBeUndefined();
  });

  it("primaryAirportOfCity returns the one isPrimary airport of a city", () => {
    const primary = primaryAirportOfCity("city-london");
    expect(primary?.iata).toBe("LHR");
  });

  it("primaryAirportOfCity returns undefined for an unknown city", () => {
    expect(primaryAirportOfCity("city-atlantis")).toBeUndefined();
  });

  it("cityOfAirport resolves the owning city id", () => {
    expect(cityOfAirport("GRO")).toBe("city-girona");
    expect(cityOfAirport("ZZZ")).toBeUndefined();
  });

  it("all functions are synchronous (no Promise returned)", () => {
    expect(searchAirports("Lon")).not.toBeInstanceOf(Promise);
    expect(findAirportByCode("BCN")).not.toBeInstanceOf(Promise);
    expect(primaryAirportOfCity("city-london")).not.toBeInstanceOf(Promise);
    expect(cityOfAirport("BCN")).not.toBeInstanceOf(Promise);
  });
});
