import { cityOfAirport, primaryAirportOfCity } from "../places/airportSearch";
import { findCityById } from "../places/search";
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
      if (value === null) return { homeCityId: null };
      const patch: ProfilePatch = { homeCityId: value };
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
