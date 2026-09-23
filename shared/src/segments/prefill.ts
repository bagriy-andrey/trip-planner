import { primaryAirportOfCity } from "../places/airportSearch";
import type { AirportRecord } from "../places/schema";
import type { CalendarDate } from "../trips/calendarDate";
import type { Trip } from "../trips/schemas";
import type { RouteView } from "./route";
import type { Segment } from "./schemas";
import { instantToZonedParts } from "./time";

export type FirstSegmentPrefill = {
  /** The trip's own city's main airport; `null` for a country/free-text trip (AC-38). */
  fromAirport: AirportRecord | null;
  /** The trip's start date; `null` when the trip has no dates (never guessed). */
  departureDate: CalendarDate | null;
};

/**
 * What S9 pre-fills for the FIRST segment of a trip, before any segment exists (AC-38): a city trip
 * with its own airport pre-fills the departure airport field; a country trip or free-text
 * destination pre-fills nothing (there is no single airport to guess); a trip with no dates
 * pre-fills no date either.
 */
export function firstSegmentPrefill(trip: Pick<Trip, "place" | "startDate">): FirstSegmentPrefill {
  const { place } = trip;
  const fromAirport = place.kind === "city" ? (primaryAirportOfCity(place.placeId) ?? null) : null;
  return { fromAirport, departureDate: trip.startDate };
}

export type NextSegmentPrefill = {
  fromAirport: AirportRecord;
  /** The route's very first departure airport, to nudge the chain closed; `null` once it already is. */
  toAirport: AirportRecord | null;
  departureDate: CalendarDate | null;
};

/**
 * What S9b pre-fills after "Save and add next" (AC-41…AC-43): the departure airport field
 * continues from where the just saved segment landed; the date comes from its arrival (in the
 * arrival airport's own zone — a landing just after local midnight still lands on the NEXT local
 * day, AC-42) or, lacking an arrival time, from its departure; the destination field nudges toward
 * closing the loop (the route's start airport)
 * unless the route is already closed, in which case there is nothing obvious left to suggest.
 */
export function nextSegmentPrefill(route: RouteView, justSaved: Segment): NextSegmentPrefill {
  const fromAirport = justSaved.to;
  const departureDate =
    justSaved.arrivalAt !== null
      ? instantToZonedParts(justSaved.arrivalAt, justSaved.to.timeZone).date
      : instantToZonedParts(justSaved.departureAt, justSaved.from.timeZone).date;
  const toAirport = route.closed ? null : (route.chain[0]?.segment.from ?? justSaved.from);

  return { fromAirport, toAirport, departureDate };
}
