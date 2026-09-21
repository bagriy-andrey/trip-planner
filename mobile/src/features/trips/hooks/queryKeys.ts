/**
 * Query keys of the trips data. `["trips"]` is the list AND the prefix of every by-id key, so
 * invalidating it reaches both; the mutations still invalidate both explicitly (AC-42).
 */
export const tripKeys = {
  all: ["trips"] as const,
  one: (id: string) => ["trips", id] as const,
};
