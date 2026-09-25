import { cityOfAirport, primaryAirportOfCity } from "../places/airportSearch";
import { findCityById } from "../places/search";
import { isValidCityName, normalizeCityName } from "./cityName";
import type { Profile, ProfileField, ProfilePatch } from "./types";

const CURRENT_KEY = {
  citizenship: "citizenship",
  residence: "residence",
  homeCity: "homeCityId",
  homeAirport: "homeAirport",
  homeCurrency: "homeCurrency",
} as const satisfies Record<ProfileField, keyof Profile>;

/**
 * The ONE place of the link rules between profile fields (AC-20, AC-23..AC-25). Returns the patch to
 * write, or `null` when nothing must be written (the same value chosen again).
 */
export function applyProfileChoice(
  current: Profile,
  field: ProfileField,
  value: string | null,
): ProfilePatch | null {
  // "Not specified" on the city row clears a directory city AND an own city name.
  if (field === "homeCity" && value === null) return clearHomeCity(current);
  if (value === current[CURRENT_KEY[field]]) return null;

  switch (field) {
    case "citizenship":
      return { citizenship: value };
    case "homeAirport":
      return { homeAirport: value };
    case "homeCurrency":
      return { homeCurrency: value };
    case "residence": {
      const city = current.homeCityId === null ? undefined : findCityById(current.homeCityId);
      if (city !== undefined && city.countryCode !== value) return { residence: value, homeCityId: null };
      return { residence: value };
    }
    case "homeCity": {
      if (value === null) return clearHomeCity(current);
      const patch: ProfilePatch = { homeCityId: value };
      // A directory city replaces an own city name (they never coexist).
      if (current.homeCityName !== null) patch.homeCityName = null;
      const city = findCityById(value);
      if (city === undefined) return patch;
      if (current.residence === null) patch.residence = city.countryCode;
      const primary = primaryAirportOfCity(city.id);
      if (
        primary !== undefined &&
        (current.homeAirport === null || cityOfAirport(current.homeAirport) === current.homeCityId)
      ) {
        patch.homeAirport = primary.iata;
      }
      return patch;
    }
  }
}

/** Clears the city row: writes only the city columns that actually hold a value. */
function clearHomeCity(current: Profile): ProfilePatch | null {
  const patch: ProfilePatch = {};
  if (current.homeCityId !== null) patch.homeCityId = null;
  if (current.homeCityName !== null) patch.homeCityName = null;
  return Object.keys(patch).length === 0 ? null : patch;
}

/**
 * The user typed a city that is not in the directory. Only the name is stored: the country of residence
 * and the home airport are NOT touched and the name is not checked against a country. Returns `null`
 * when nothing must be written (invalid text, or the same own city again).
 */
export function applyCustomCity(current: Profile, raw: string): ProfilePatch | null {
  const name = normalizeCityName(raw);
  if (!isValidCityName(name)) return null;
  if (current.homeCityId === null && current.homeCityName === name) return null;
  const patch: ProfilePatch = { homeCityName: name };
  if (current.homeCityId !== null) patch.homeCityId = null;
  return patch;
}
