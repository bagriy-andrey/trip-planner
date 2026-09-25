import { findPlaceById, resolveDestinationName } from "@tripplanner/shared";
import type { CalendarDate, PlaceLanguage, Trip, TripFieldErrorId } from "@tripplanner/shared";

/** What the form holds while the user edits it: raw text, not yet validated. */
export interface TripFormState {
  destination: string;
  /** Directory id of the picked suggestion; `null` is free text (`custom`). */
  placeId: string | null;
  title: string;
  startDate: CalendarDate | null;
  endDate: CalendarDate | null;
  /** "No dates yet": hides the pickers and sends no dates, but keeps them for un-ticking. */
  noDates: boolean;
}

/** An empty create form. Dates start unset and "no dates" is off: the pickers are offered first. */
export const EMPTY_TRIP_FORM: TripFormState = {
  destination: "",
  placeId: null,
  title: "",
  startDate: null,
  endDate: null,
  noDates: false,
};

export type TripFormField = "destination" | "title" | "dates";
export type TripFormErrors = Partial<Record<TripFormField, TripFieldErrorId>>;

/**
 * The four edit states (AC-48): a directory place or free text, and dates present or the
 * "no dates" checkbox. A stored `placeId` the directory no longer knows (or knows as another
 * kind) is treated as free text: nothing is highlighted as "picked from the directory".
 */
export function formStateFromTrip(trip: Trip, lang: PlaceLanguage): TripFormState {
  const { place } = trip;
  const pickedId =
    place.kind !== "custom" && findPlaceById(place.placeId)?.kind === place.kind
      ? place.placeId
      : null;
  return {
    destination: resolveDestinationName(trip),
    placeId: pickedId,
    title: trip.title ?? "",
    startDate: trip.startDate,
    endDate: trip.endDate,
    noDates: trip.startDate === null && trip.endDate === null,
  };
}
