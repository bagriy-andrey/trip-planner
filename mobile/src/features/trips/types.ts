import { coverIndexOf, deriveTripStatus, resolveDestinationName } from "@tripplanner/shared";
import type { CalendarDate, PlaceLanguage, Trip } from "@tripplanner/shared";

import { coverColors } from "@/lib/theme";

/**
 * How a trip is presented: drives the chip tone and label (S4/S5/S7). `upcoming` is not derived
 * from a trip alone — it is the ONE trip of the active list that gets the accent chip (AC-23).
 */
export type TripStatusKind = "upcoming" | "planned" | "draft" | "completed" | "archived";

/** Everything a trip card needs to render, built from the domain `Trip`. */
export interface TripCardData {
  id: string;
  /** The place exactly as the user saved it (`resolveDestinationName`), never translated; not the user-given title. */
  placeName: string;
  /** Null for a draft trip without dates. */
  startDate: CalendarDate | null;
  endDate: CalendarDate | null;
  status: TripStatusKind;
  /** Picks the colour of the cover; from the immutable trip id only (AC-38). */
  coverIndex: number;
}

export interface TripCardContext {
  today: CalendarDate;
  /** `pickUpcomingTripId(activeTrips)`; `null` on the history list and when no trip has dates. */
  upcomingId: string | null;
}

/** The presentation of one trip in a list. Pure: the clock is injected. */
export function toTripCardData(trip: Trip, { today, upcomingId }: TripCardContext): TripCardData {
  const derived = deriveTripStatus(trip, today);
  return {
    id: trip.id,
    placeName: resolveDestinationName(trip),
    startDate: trip.startDate,
    endDate: trip.endDate,
    status: derived === "planned" && trip.id === upcomingId ? "upcoming" : derived,
    coverIndex: coverIndexOf(trip.id, coverColors.length),
  };
}
