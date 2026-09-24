/** `["hotels", tripId]` is a trip's hotel list AND the prefix of every by-id key of that trip. */
export const hotelKeys = {
  all: ["hotels"] as const,
  ofTrip: (tripId: string) => ["hotels", tripId] as const,
  one: (tripId: string, id: string) => ["hotels", tripId, id] as const,
};
