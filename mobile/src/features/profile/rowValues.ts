import { findAirportByCode, findCityById, PLACE_DIRECTORY } from "@tripplanner/shared";
import type { PlaceLanguage, Profile, ProfileField } from "@tripplanner/shared";

export type RowValue =
  | { kind: "empty" }
  | { kind: "country"; code: string; name: string }
  | { kind: "rawCode"; code: string; spoken?: string }
  | { kind: "city"; name: string }
  | { kind: "unknownCity" }
  | { kind: "text"; text: string };

function countryValue(code: string | null, lang: PlaceLanguage): RowValue {
  if (code === null) return { kind: "empty" };
  const country = PLACE_DIRECTORY.find((place) => place.kind === "country" && place.countryCode === code);
  // A country outside the directory is shown as its raw code, without a flag (AC-27).
  return country === undefined ? { kind: "rawCode", code } : { kind: "country", code, name: country[lang] };
}

/** What a profile row shows. Formatting lives here, never in the components. */
export function rowValueOf(field: ProfileField, profile: Profile, lang: PlaceLanguage): RowValue {
  switch (field) {
    case "citizenship":
      return countryValue(profile.citizenship, lang);
    case "residence":
      return countryValue(profile.residence, lang);
    case "homeCity": {
      if (profile.homeCityId === null) {
        // The user's own city text is shown as typed (there is no directory record, so no flag).
        return profile.homeCityName === null ? { kind: "empty" } : { kind: "city", name: profile.homeCityName };
      }
      const city = findCityById(profile.homeCityId);
      return city === undefined ? { kind: "unknownCity" } : { kind: "city", name: city[lang] };
    }
    case "homeAirport": {
      if (profile.homeAirport === null) return { kind: "empty" };
      const airport = findAirportByCode(profile.homeAirport);
      return airport === undefined
        ? { kind: "rawCode", code: profile.homeAirport }
        : { kind: "rawCode", code: profile.homeAirport, spoken: airport[lang] };
    }
    case "homeCurrency":
      return profile.homeCurrency === null ? { kind: "empty" } : { kind: "rawCode", code: profile.homeCurrency };
  }
}
