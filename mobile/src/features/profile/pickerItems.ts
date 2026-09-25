import {
  CURRENCY_NAMES,
  countryHasCities,
  foldForSearch,
  isValidCityName,
  normalizeCityName,
  searchAirportOptions,
  searchCityOptions,
  searchCountryOptions,
  searchCurrencyOptions,
} from "@tripplanner/shared";
import type { PlaceLanguage, Profile, ProfileField } from "@tripplanner/shared";

import type { PickerItem } from "@/components";

/** Picker keys of an own city (typed text, not a directory id): `custom:<name>`. */
const CUSTOM_KEY_PREFIX = "custom:";

export function customKeyOf(name: string): string {
  return CUSTOM_KEY_PREFIX + name;
}

/** The own-city text behind a picker key, or `null` for a directory key. */
export function customNameOf(key: string): string | null {
  return key.startsWith(CUSTOM_KEY_PREFIX) ? key.slice(CUSTOM_KEY_PREFIX.length) : null;
}

/**
 * Rows of the picker sheet for one profile field; `query` blank = the whole list. `addLabel` names the
 * "use what I typed" row of the city sheet: a typed city that is not in the directory can be added.
 */
export function itemsFor(
  field: ProfileField,
  query: string,
  lang: PlaceLanguage,
  profile: Profile,
  addLabel: (name: string) => string = (name) => name,
): PickerItem[] {
  switch (field) {
    case "citizenship":
    case "residence":
      return searchCountryOptions(query, lang).map((country) => ({
        key: country.countryCode,
        name: country[lang],
        code: country.countryCode,
        flagCountryCode: country.countryCode,
      }));
    case "homeCity": {
      const listed: PickerItem[] = searchCityOptions(query, lang, profile.residence).map((city) => ({
        key: city.id,
        name: city[lang],
        code: city.countryCode,
        flagCountryCode: city.countryCode,
      }));
      const typed = normalizeCityName(query);
      if (typed === "") {
        // The saved own city stays visible (and selected) when the whole list is shown.
        return profile.homeCityName === null
          ? listed
          : [{ key: customKeyOf(profile.homeCityName), name: profile.homeCityName, code: "" }, ...listed];
      }
      const exists = listed.some((row) => foldForSearch(row.name) === foldForSearch(typed));
      if (exists || !isValidCityName(typed)) return listed;
      return [{ key: customKeyOf(typed), name: addLabel(typed), code: "", kind: "add" }, ...listed];
    }
    case "homeAirport":
      return searchAirportOptions(query, lang, profile.homeCityId).map((airport) => ({
        key: airport.iata,
        name: airport[lang],
        code: airport.iata,
        a11yName: airport[lang],
      }));
    case "homeCurrency":
      return searchCurrencyOptions(query, lang).map((code) => ({
        key: code,
        name: CURRENCY_NAMES[code][lang],
        code,
      }));
  }
}

/** The stored value of a field, as the picker's selected key. */
export function selectedKeyOf(field: ProfileField, profile: Profile): string | null {
  switch (field) {
    case "citizenship":
      return profile.citizenship;
    case "residence":
      return profile.residence;
    case "homeCity":
      if (profile.homeCityId !== null) return profile.homeCityId;
      return profile.homeCityName === null ? null : customKeyOf(profile.homeCityName);
    case "homeAirport":
      return profile.homeAirport;
    case "homeCurrency":
      return profile.homeCurrency;
  }
}

/** A blank query shows the "no cities" hint instead of a list when the residence has none (AC-26). */
export function emptyWhenBlankFor(field: ProfileField, profile: Profile): boolean {
  return field === "homeCity" && profile.residence !== null && !countryHasCities(profile.residence);
}
