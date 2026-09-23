/**
 * Query keys of the segments data. `["segments", tripId]` is a trip's whole route AND the prefix
 * of every by-id key of that trip, so invalidating it reaches both; mutations still invalidate
 * both explicitly (AC-75).
 */
export const segmentKeys = {
  all: ["segments"] as const,
  ofTrip: (tripId: string) => ["segments", tripId] as const,
  one: (tripId: string, id: string) => ["segments", tripId, id] as const,
};
