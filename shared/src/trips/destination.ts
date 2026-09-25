import type { Trip } from "./schemas";

/**
 * The name to show for a trip's place: the stored `destination`, exactly as the user saved it. A user's
 * own record is never translated into the UI language (2026-09-25): switching the app language changes
 * the app's own text only. `destination` is the snapshot kept for exactly that; `place` still says
 * which directory record it came from, for search and the time zone.
 */
export function resolveDestinationName(trip: Pick<Trip, "destination">): string {
  return trip.destination;
}
