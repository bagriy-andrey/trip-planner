/** `["cars", tripId]` is a trip's rental list AND the prefix of every by-id key of that trip. */
export const carKeys = {
  all: ["cars"] as const,
  ofTrip: (tripId: string) => ["cars", tripId] as const,
  one: (tripId: string, id: string) => ["cars", tripId, id] as const,
};
