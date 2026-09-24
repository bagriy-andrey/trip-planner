import { describe, expect, it } from "vitest";
import { applyProfileChoice } from "../links";
import { EMPTY_PROFILE } from "../types";
import type { Profile } from "../types";

const p = (over: Partial<Profile>): Profile => ({ ...EMPTY_PROFILE, ...over });

describe("applyProfileChoice: plain fields and repeated choice", () => {
  it("writes the single field", () => {
    expect(applyProfileChoice(EMPTY_PROFILE, "citizenship", "PL")).toEqual({ citizenship: "PL" });
    expect(applyProfileChoice(EMPTY_PROFILE, "homeAirport", "KRK")).toEqual({ homeAirport: "KRK" });
    expect(applyProfileChoice(EMPTY_PROFILE, "homeCurrency", "PLN")).toEqual({ homeCurrency: "PLN" });
    expect(applyProfileChoice(p({ homeCurrency: "PLN" }), "homeCurrency", null)).toEqual({ homeCurrency: null });
  });

  it("returns null when the same value is chosen again (AC-20)", () => {
    expect(applyProfileChoice(p({ citizenship: "PL" }), "citizenship", "PL")).toBeNull();
    expect(applyProfileChoice(p({ homeCityId: "city-krakow" }), "homeCity", "city-krakow")).toBeNull();
    expect(applyProfileChoice(EMPTY_PROFILE, "residence", null)).toBeNull();
    expect(applyProfileChoice(p({ homeAirport: "KRK" }), "homeAirport", "KRK")).toBeNull();
  });
});

describe("applyProfileChoice: home city (AC-23, AC-24)", () => {
  it("fills residence and the primary airport from an empty profile", () => {
    expect(applyProfileChoice(EMPTY_PROFILE, "homeCity", "city-krakow")).toEqual({
      homeCityId: "city-krakow",
      residence: "PL",
      homeAirport: "KRK",
    });
  });

  it("replaces the airport of the previous city", () => {
    const current = p({ residence: "PL", homeCityId: "city-krakow", homeAirport: "KRK" });
    expect(applyProfileChoice(current, "homeCity", "city-warsaw")).toEqual({
      homeCityId: "city-warsaw",
      homeAirport: "WAW",
    });
  });

  it("keeps a manually chosen foreign airport", () => {
    const current = p({ residence: "CZ", homeCityId: "city-krakow", homeAirport: "WAW" });
    expect(applyProfileChoice(current, "homeCity", "city-prague")).toEqual({ homeCityId: "city-prague" });
  });

  it("keeps the airport when the new city is where it already is", () => {
    const current = p({ residence: "PL", homeCityId: "city-krakow", homeAirport: "WAW" });
    expect(applyProfileChoice(current, "homeCity", "city-warsaw")).toEqual({ homeCityId: "city-warsaw" });
  });

  it("leaves residence alone when already set, and clears only the city on null", () => {
    expect(applyProfileChoice(p({ residence: "PL" }), "homeCity", "city-krakow")).toEqual({
      homeCityId: "city-krakow",
      homeAirport: "KRK",
    });
    expect(applyProfileChoice(p({ residence: "PL", homeCityId: "city-krakow", homeAirport: "KRK" }), "homeCity", null))
      .toEqual({ homeCityId: null });
  });
});

describe("applyProfileChoice: residence (AC-25)", () => {
  it("clears a city of another country and keeps the airport", () => {
    const current = p({ residence: "PL", homeCityId: "city-krakow", homeAirport: "KRK" });
    expect(applyProfileChoice(current, "residence", "DE")).toEqual({ residence: "DE", homeCityId: null });
  });

  it("clearing the country clears the city", () => {
    const current = p({ residence: "PL", homeCityId: "city-krakow" });
    expect(applyProfileChoice(current, "residence", null)).toEqual({ residence: null, homeCityId: null });
  });

  it("keeps a city of the same country or without a city", () => {
    expect(applyProfileChoice(p({ residence: "DE", homeCityId: "city-krakow" }), "residence", "PL")).toEqual({
      residence: "PL",
    });
    expect(applyProfileChoice(EMPTY_PROFILE, "residence", "PL")).toEqual({ residence: "PL" });
  });

  it("does not clear a city that is not in the directory", () => {
    expect(applyProfileChoice(p({ residence: "PL", homeCityId: "city-unknown" }), "residence", "DE")).toEqual({
      residence: "DE",
    });
  });
});
