import { AIRPORTS } from "./airports";
import { PLACE_DIRECTORY } from "./directory";
import { foldForSearch } from "./fold";
import type { AirportRecord, CityRecord, CountryRecord, PlaceLanguage, PlaceRecord } from "./schema";

/*
 * Picker (bottom sheet) search: NO result limit, unlike `searchPlaces` / `searchAirports`.
 * Match = the folded query is the START of the ru OR en name (any UI language), no transliteration.
 * An exact code hit goes first; the rest keep the order of the blank-query list. Alphabetical order
 * compares folded names by code point, never through the locale-aware collator (runtime-neutral).
 */

const PLACES: readonly PlaceRecord[] = PLACE_DIRECTORY;
const COUNTRIES: readonly CountryRecord[] = PLACES.filter(
  (place): place is CountryRecord => place.kind === "country",
);
const CITIES: readonly CityRecord[] = PLACES.filter(
  (place): place is CityRecord => place.kind === "city",
);
const CITY_BY_ID: ReadonlyMap<string, CityRecord> = new Map(CITIES.map((city) => [city.id, city]));
const AIRPORT_LIST:readonly AirportRecord[] = AIRPORTS;

function normalizeQuery(query: string): string {
  return foldForSearch(query).trim().replace(/\s+/g, " ");
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortedByName<T extends { id: string; ru: string; en: string }>(
  items: readonly T[],
  lang: PlaceLanguage,
): T[] {
  const keyed = items.map((item) => ({ item, key: foldForSearch(item[lang]) }));
  keyed.sort((a, b) => compareText(a.key, b.key) || compareText(a.item.id, b.item.id));
  return keyed.map((entry) => entry.item);
}

function startsWithName(names: readonly string[], q: string): boolean {
  return names.some((name) => foldForSearch(name).startsWith(q));
}

/** Blank query: `list` as is. Otherwise exact-code hits first, then name-prefix hits, no duplicates. */
function filterList<T>(
  list: readonly T[],
  query: string,
  isExactCode: (item: T, code: string) => boolean,
  names: (item: T) => readonly string[],
): T[] {
  const q = normalizeQuery(query);
  if (q === "") return [...list];
  const code = query.trim().toUpperCase();
  const exact = list.filter((item) => isExactCode(item, code));
  const taken = new Set<T>(exact);
  const rest = list.filter((item) => !taken.has(item) && startsWithName(names(item), q));
  return [...exact, ...rest];
}

export function searchCountryOptions(query: string, lang: PlaceLanguage): CountryRecord[] {
  return filterList(
    sortedByName(COUNTRIES, lang),
    query,
    (country, code) => country.countryCode === code,
    (country) => [country.ru, country.en],
  );
}

/** Cities, limited to `residenceCountry` (alpha-2) when it is set; the filter runs BEFORE the search. */
export function searchCityOptions(
  query: string,
  lang: PlaceLanguage,
  residenceCountry: string | null,
): CityRecord[] {
  const pool = residenceCountry === null ? CITIES : CITIES.filter((c) => c.countryCode === residenceCountry);
  return filterList(
    sortedByName(pool, lang),
    query,
    (city, code) => city.airportCode !== undefined && city.airportCode === code,
    (city) => [city.ru, city.en],
  );
}

/** Airports of `homeCityId` first (primary first, then by name), then the rest by name. */
export function searchAirportOptions(
  query: string,
  lang: PlaceLanguage,
  homeCityId: string | null,
): AirportRecord[] {
  const byName = sortedByName(AIRPORT_LIST, lang);
  const isOwn = (a: AirportRecord): boolean => homeCityId !== null && a.cityId === homeCityId;
  const own = byName.filter(isOwn);
  const ordered = [
    ...own.filter((a) => a.isPrimary),
    ...own.filter((a) => !a.isPrimary),
    ...byName.filter((a) => !isOwn(a)),
  ];
  return filterList(
    ordered,
    query,
    (airport, code) => airport.iata === code,
    (airport) => {
      const city = CITY_BY_ID.get(airport.cityId);
      return city ? [airport.ru, airport.en, city.ru, city.en] : [airport.ru, airport.en];
    },
  );
}

/** Whether the directory lists at least one city of this country (AC-26). */
export function countryHasCities(countryCode: string): boolean {
  return CITIES.some((city) => city.countryCode === countryCode);
}
