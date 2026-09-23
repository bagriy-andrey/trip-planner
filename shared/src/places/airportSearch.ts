import { AIRPORTS } from "./airports";
import { PLACE_DIRECTORY } from "./directory";
import { foldForSearch } from "./fold";
import type { AirportRecord, CityRecord, PlaceRecord } from "./schema";

const RECORDS: readonly AirportRecord[] = AIRPORTS;
const PLACES: readonly PlaceRecord[] = PLACE_DIRECTORY;

const CITY_BY_ID: ReadonlyMap<string, CityRecord> = new Map(
  PLACES.filter((place): place is CityRecord => place.kind === "city").map((city) => [
    city.id,
    city,
  ]),
);

/** Default number of suggestions (mirrors `PLACE_SUGGESTION_LIMIT`, AC-16/AC-17). */
export const AIRPORT_SUGGESTION_LIMIT = 4;

/** The airport with this IATA code, or `undefined`. An unknown code is a normal outcome. */
export function findAirportByCode(iata: string): AirportRecord | undefined {
  const code = iata.toUpperCase();
  return RECORDS.find((airport) => airport.iata === code);
}

/** The `isPrimary` airport of `cityId`, or `undefined` when the city has none. */
export function primaryAirportOfCity(cityId: string): AirportRecord | undefined {
  return RECORDS.find((airport) => airport.cityId === cityId && airport.isPrimary);
}

/** The city id that owns the airport identified by `iata`, or `undefined`. */
export function cityOfAirport(iata: string): string | undefined {
  return findAirportByCode(iata)?.cityId;
}

function normalizeQuery(query: string): string {
  return foldForSearch(query).trim().replace(/\s+/g, " ");
}

/** Length of the shortest of the airport's own name / its city's name that starts with `query`. */
function matchedNameLength(airport: AirportRecord, query: string): number | undefined {
  const city = CITY_BY_ID.get(airport.cityId);
  const names = city ? [airport.ru, airport.en, city.ru, city.en] : [airport.ru, airport.en];
  let best: number | undefined;
  for (const name of names) {
    const folded = foldForSearch(name);
    if (folded.startsWith(query) && (best === undefined || folded.length < best)) {
      best = folded.length;
    }
  }
  return best;
}

/**
 * Suggestions for the airport field (S9/S9b). SYNCHRONOUS, pure and deterministic: a linear pass
 * over the directory on every call, no index built at startup (Non-functional, mirrors
 * `searchPlaces`). Matches, in order of precedence:
 *   1. an EXACT IATA code (case-insensitive) — always first, regardless of name matches;
 *   2. the start of the airport's own name (ru or en, folded);
 *   3. the start of the airport's CITY name (ru or en, folded) — this is what makes "Barcel" also
 *      surface Reus/Girona-less other Barcelona-owned airports, and "Жир" surface Girona by its
 *      city name even though the airport's own name starts with "Аэропорт".
 *
 * Ties after an exact-code hit: the city's primary airport first, then by the length of the
 * matched name (closer to an exact hit), then by `id` — fully deterministic (AC-17). At most
 * `limit` results (default 4); a blank query, a `limit` below 1 or no match yields `[]`.
 */
export function searchAirports(query: string, limit: number = AIRPORT_SUGGESTION_LIMIT): AirportRecord[] {
  const folded = normalizeQuery(query);
  if (folded === "" || !(limit >= 1)) return [];

  const upper = query.trim().toUpperCase();
  const exactCode = RECORDS.find((airport) => airport.iata === upper);

  const hits: { airport: AirportRecord; length: number }[] = [];
  for (const airport of RECORDS) {
    if (exactCode && airport.id === exactCode.id) continue;
    const length = matchedNameLength(airport, folded);
    if (length !== undefined) hits.push({ airport, length });
  }
  hits.sort((a, b) => {
    if (a.airport.isPrimary !== b.airport.isPrimary) return a.airport.isPrimary ? -1 : 1;
    if (a.length !== b.length) return a.length - b.length;
    return a.airport.id < b.airport.id ? -1 : a.airport.id > b.airport.id ? 1 : 0;
  });

  const ordered = exactCode ? [exactCode, ...hits.map((h) => h.airport)] : hits.map((h) => h.airport);
  return ordered.slice(0, Math.floor(limit));
}
