import {
  CURRENCY_NAMES,
  countryHasCities,
  searchAirportOptions,
  searchCityOptions,
  searchCountryOptions,
  searchCurrencyOptions,
} from "@tripplanner/shared";
import type { PlaceLanguage, Profile, ProfileField } from "@tripplanner/shared";

import type { PickerItem } from "@/components";

/** Rows of the picker sheet for one profile field; `query` blank = the whole list. */
export function itemsFor(field: ProfileField, query: string, lang: PlaceLanguage, profile: Profile): PickerItem[] {
  switch (field) {
    case "citizenship":
    case "residence":
      return searchCountryOptions(query, lang).map((country) => ({
        key: country.countryCode,
        name: country[lang],
        code: country.countryCode,
        flagCountryCode: country.countryCode,
      }));
    case "homeCity":
      return searchCityOptions(query, lang, profile.residence).map((city) => ({
        key: city.id,
        name: city[lang],
        code: city.countryCode,
        flagCountryCode: city.countryCode,
      }));
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
      return profile.homeCityId;
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
