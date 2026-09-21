import { findPlaceById } from "../places/search";
import type { PlaceLanguage } from "../places/schema";
import type { Trip } from "./schemas";

/**
 * The name to show for a trip's place in the UI language (Q3): for a `city`/`country` whose
 * `placeId` is in the directory (and of the same kind), the directory name in `lang`; otherwise
 * the stored `destination` as is. An unknown `placeId` is NOT an error — the directory may have
 * changed since the trip was saved, and `destination` is the snapshot kept for exactly that.
 */
export function resolveDestinationName(
  trip: Pick<Trip, "destination" | "place">,
  lang: PlaceLanguage,
): string {
  const { place } = trip;
  if (place.kind === "custom") return trip.destination;
  const record = findPlaceById(place.placeId);
  return record !== undefined && record.kind === place.kind ? record[lang] : trip.destination;
}
