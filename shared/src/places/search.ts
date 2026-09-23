import { PLACE_DIRECTORY } from "./directory";
import { foldForSearch } from "./fold";
import type { CityRecord, PlaceRecord } from "./schema";

/** Default number of suggestions (AC-12). */
export const PLACE_SUGGESTION_LIMIT = 4;

const PLACES: readonly PlaceRecord[] = PLACE_DIRECTORY;

/** The record with this id, or `undefined`. An unknown id is a normal outcome, not an error (Q3). */
export function findPlaceById(id: string): PlaceRecord | undefined {
  return PLACES.find((place) => place.id === id);
}

/** Folded, trimmed, whitespace-collapsed query: what is compared against folded names. */
function normalizeQuery(query: string): string {
  return foldForSearch(query).trim().replace(/\s+/g, " ");
}

/**
 * Length of the shortest name (ru / en) of `place` that STARTS WITH the folded `query`, or
 * `undefined` when neither does. Only the beginning of the whole name counts (AC-12): "por" does not
 * match "Sporting". Compared in the same alphabet only (Q6): "Porto" never matches "Порту".
 */
function matchedNameLength(place: PlaceRecord, query: string): number | undefined {
  let best: number | undefined;
  for (const name of [place.ru, place.en]) {
    const folded = foldForSearch(name);
    if (folded.startsWith(query) && (best === undefined || folded.length < best)) {
      best = folded.length;
    }
  }
  return best;
}

/**
 * Suggestions for the "where to" field. SYNCHRONOUS, pure and deterministic: a linear pass over the
 * directory on every call (no index is built at startup — spec Non-functional). Case- and
 * diacritics-insensitive, prefix-only, against the ru and en name at once.
 *
 * Order: the shorter matched name first (closer to an exact hit), ties by `id`. At most `limit`
 * results (default 4); a blank query, a `limit` below 1 or no match yields `[]`.
 */
export function searchPlaces(query: string, limit: number = PLACE_SUGGESTION_LIMIT): PlaceRecord[] {
  const folded = normalizeQuery(query);
  if (folded === "" || !(limit >= 1)) return [];

  const hits: { place: PlaceRecord; length: number }[] = [];
  for (const place of PLACES) {
    const length = matchedNameLength(place, folded);
    if (length !== undefined) hits.push({ place, length });
  }
  hits.sort(
    (a, b) => a.length - b.length || (a.place.id < b.place.id ? -1 : a.place.id > b.place.id ? 1 : 0),
  );
  return hits.slice(0, Math.floor(limit)).map((hit) => hit.place);
}

/**
 * Like `searchPlaces` (same pass, same order) but only CITIES: the kind filter runs BEFORE the limit,
 * so countries can't push cities out of the suggestions. Cities carry the time zone a hotel needs.
 */
export function searchCities(query: string, limit: number = PLACE_SUGGESTION_LIMIT): CityRecord[] {
  const folded = normalizeQuery(query);
  if (folded === "" || !(limit >= 1)) return [];

  const hits: { place: CityRecord; length: number }[] = [];
  for (const place of PLACES) {
    if (place.kind !== "city") continue;
    const length = matchedNameLength(place, folded);
    if (length !== undefined) hits.push({ place, length });
  }
  hits.sort(
    (a, b) => a.length - b.length || (a.place.id < b.place.id ? -1 : a.place.id > b.place.id ? 1 : 0),
  );
  return hits.slice(0, Math.floor(limit)).map((hit) => hit.place);
}

/** The city record with this id; `undefined` for an unknown id or a non-city id. */
export function findCityById(id: string): CityRecord | undefined {
  const place = findPlaceById(id);
  return place !== undefined && place.kind === "city" ? place : undefined;
}
