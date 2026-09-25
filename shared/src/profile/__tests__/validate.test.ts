import { describe, expect, it } from "vitest";
import { PROFILE_WRITE_ERROR } from "../errorCodes";
import { validateProfilePatch } from "../validate";
import { EMPTY_PROFILE } from "../types";
import type { Profile } from "../types";

const errorsOf = (current: Profile, patch: Parameters<typeof validateProfilePatch>[1]) => {
  const result = validateProfilePatch(current, patch);
  return result.ok ? [] : result.errors;
};

describe("PROFILE_WRITE_ERROR", () => {
  it("is pinned", () => {
    expect(Object.values(PROFILE_WRITE_ERROR)).toEqual([
      "citizenship.unknown",
      "residence.unknown",
      "homeCity.unknown",
      "homeAirport.unknown",
      "homeCurrency.unknown",
      "homeCity.countryMismatch",
      "homeCity.residenceMissing",
      "homeCity.nameInvalid",
      "homeCity.nameConflict",
    ]);
  });
});

describe("validateProfilePatch: own city name", () => {
  it("accepts a normalised name and clearing it", () => {
    expect(validateProfilePatch(EMPTY_PROFILE, { homeCityName: "Nowy Sącz" })).toEqual({ ok: true });
    expect(validateProfilePatch({ ...EMPTY_PROFILE, homeCityName: "Nowy Sącz" }, { homeCityName: null })).toEqual({
      ok: true,
    });
  });
  it("rejects a name that is too short, too long or not normalised", () => {
    expect(errorsOf(EMPTY_PROFILE, { homeCityName: "K" })).toEqual(["homeCity.nameInvalid"]);
    expect(errorsOf(EMPTY_PROFILE, { homeCityName: "a".repeat(81) })).toEqual(["homeCity.nameInvalid"]);
    expect(errorsOf(EMPTY_PROFILE, { homeCityName: " Krakow" })).toEqual(["homeCity.nameInvalid"]);
    expect(errorsOf(EMPTY_PROFILE, { homeCityName: "Kra\nkow" })).toEqual(["homeCity.nameInvalid"]);
  });
  it("does not check an own name against the residence country", () => {
    expect(validateProfilePatch({ ...EMPTY_PROFILE, residence: "PL" }, { homeCityName: "Berlin-Mitte" })).toEqual({
      ok: true,
    });
  });
  it("rejects a directory city and an own name together", () => {
    const withName = { ...EMPTY_PROFILE, residence: "PL", homeCityName: "Nowy Sącz" };
    expect(errorsOf(withName, { homeCityId: "city-krakow" })).toEqual(["homeCity.nameConflict"]);
    expect(validateProfilePatch(withName, { homeCityId: "city-krakow", homeCityName: null })).toEqual({ ok: true });
  });
});

describe("validateProfilePatch", () => {
  it("accepts known values and nulls", () => {
    expect(validateProfilePatch(EMPTY_PROFILE, { citizenship: "PL" })).toEqual({ ok: true });
    expect(validateProfilePatch(EMPTY_PROFILE, { homeCurrency: null, homeAirport: null })).toEqual({ ok: true });
  });

  it("rejects an unknown code in the patch", () => {
    expect(errorsOf(EMPTY_PROFILE, { citizenship: "XK" })).toEqual(["citizenship.unknown"]);
    expect(errorsOf(EMPTY_PROFILE, { residence: "ZZ" })).toEqual(["residence.unknown"]);
    expect(errorsOf(EMPTY_PROFILE, { homeAirport: "ZZZ" })).toEqual(["homeAirport.unknown"]);
    expect(errorsOf(EMPTY_PROFILE, { homeCurrency: "ZZZ" })).toEqual(["homeCurrency.unknown"]);
    expect(errorsOf({ ...EMPTY_PROFILE, residence: "PL" }, { homeCityId: "city-unknown" })).toEqual([
      "homeCity.unknown",
    ]);
  });

  it("does not block on an unknown value that is stored but not in the patch", () => {
    const stored: Profile = { ...EMPTY_PROFILE, citizenship: "XK", homeCurrency: "ZZZ", homeAirport: "ZZZ" };
    expect(validateProfilePatch(stored, { residence: "PL" })).toEqual({ ok: true });
  });

  it("requires the residence country to match the city country", () => {
    expect(errorsOf({ ...EMPTY_PROFILE, residence: "DE" }, { homeCityId: "city-krakow" })).toEqual([
      "homeCity.countryMismatch",
    ]);
    expect(errorsOf({ ...EMPTY_PROFILE, residence: "PL", homeCityId: "city-krakow" }, { residence: "DE" })).toEqual([
      "homeCity.countryMismatch",
    ]);
    expect(validateProfilePatch(EMPTY_PROFILE, { residence: "PL", homeCityId: "city-krakow" })).toEqual({ ok: true });
  });

  it("requires a residence for a directory city", () => {
    expect(errorsOf(EMPTY_PROFILE, { homeCityId: "city-krakow" })).toEqual(["homeCity.residenceMissing"]);
    expect(errorsOf({ ...EMPTY_PROFILE, residence: "PL", homeCityId: "city-krakow" }, { residence: null })).toEqual([
      "homeCity.residenceMissing",
    ]);
  });

  it("skips consistency when the patch touches neither city nor residence", () => {
    const odd: Profile = { ...EMPTY_PROFILE, homeCityId: "city-krakow" };
    expect(validateProfilePatch(odd, { homeCurrency: "PLN" })).toEqual({ ok: true });
  });
});
