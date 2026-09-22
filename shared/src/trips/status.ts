import { compareCalendarDates, daysBetween, isCalendarDate, type CalendarDate } from "./calendarDate";
import type { Trip } from "./schemas";

/** Derived, never stored (AC-22). There is no `upcoming` here — see `pickUpcomingTripId`. */
export type TripStatus = "archived" | "draft" | "completed" | "planned";

/** What the status of a trip depends on. */
export type TripLifecycle = Pick<Trip, "startDate" | "endDate" | "archivedAt">;

/**
 * Status from the dates, the archive mark and an injected `today` (AC-22, AC-24 — this function
 * never reads the clock):
 * - a non-empty `archivedAt` -> `archived`, over any dates;
 * - no dates -> `draft`;
 * - end date STRICTLY before today -> `completed` (a trip ending today is still active);
 * - otherwise `planned`.
 *
 * "Upcoming" (the accent "in N days" chip) is deliberately not a status: it means "the nearest
 * trip" and is a property of the LIST, decided by `pickUpcomingTripId` (AC-23).
 */
export function deriveTripStatus(trip: TripLifecycle, today: CalendarDate): TripStatus {
  if (trip.archivedAt !== null && trip.archivedAt !== "") return "archived";
  if (trip.startDate === null || trip.endDate === null) return "draft";
  return compareCalendarDates(trip.endDate, today) < 0 ? "completed" : "planned";
}

type SortableTrip = TripLifecycle & Pick<Trip, "id" | "createdAt">;

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Active list order (AC-35): start date ascending, trips without dates last; ties by creation
 * time, then id, so the list never "shivers" between refetches.
 */
function compareActive(a: SortableTrip, b: SortableTrip): number {
  if (a.startDate !== null && b.startDate !== null) {
    const byStart = compareCalendarDates(a.startDate, b.startDate);
    if (byStart !== 0) return byStart;
  } else if (a.startDate !== null) {
    return -1;
  } else if (b.startDate !== null) {
    return 1;
  }
  return compareText(a.createdAt, b.createdAt) || compareText(a.id, b.id);
}

/** Trips of `/trips`: not archived, not completed (drafts included), in `compareActive` order. */
export function selectActiveTrips<T extends SortableTrip>(trips: readonly T[], today: CalendarDate): T[] {
  return trips
    .filter((trip) => {
      const status = deriveTripStatus(trip, today);
      return status === "planned" || status === "draft";
    })
    .sort(compareActive);
}

/**
 * The trip that gets the accent "in N days" chip (AC-23): among the given ACTIVE trips, the one
 * with the earliest start date (trips without dates never qualify); at equal start dates the
 * earliest created wins, then the smallest id. `null` when no trip has dates.
 *
 * Takes the list because "upcoming" is a property of the list, not of a trip. It does not look at
 * `today`: a trip already under way (start in the past, end not yet) is still the nearest one.
 */
export function pickUpcomingTripId(trips: readonly SortableTrip[]): string | null {
  let best: SortableTrip | undefined;
  for (const trip of trips) {
    if (trip.startDate === null || (trip.archivedAt !== null && trip.archivedAt !== "")) continue;
    if (best === undefined || compareActive(trip, best) < 0) best = trip;
  }
  return best?.id ?? null;
}

const EARLIEST: CalendarDate = "0001-01-01";

/** UTC calendar date of an ISO instant (`EARLIEST` when it does not parse). */
function utcDateOfInstant(instant: string): CalendarDate {
  const time = Date.parse(instant);
  if (Number.isNaN(time)) return EARLIEST;
  const day = new Date(time).toISOString().slice(0, 10);
  return isCalendarDate(day) ? day : EARLIEST;
}

/**
 * Where a history trip sits on the "most recent first" axis: the day it ended, or — for an
 * archived trip without dates (Q11) — the day it was archived, so it does not sink to the bottom.
 */
function historyRecency(trip: SortableTrip): CalendarDate {
  if (trip.endDate !== null) return trip.endDate;
  return utcDateOfInstant(trip.archivedAt ?? trip.createdAt);
}

function compareHistory(a: SortableTrip, b: SortableTrip): number {
  return (
    compareCalendarDates(historyRecency(b), historyRecency(a)) ||
    compareText(b.createdAt, a.createdAt) ||
    compareText(a.id, b.id)
  );
}

/** Trips of `/history` (AC-36): completed AND archived, most recent first (Q11). */
export function selectHistoryTrips<T extends SortableTrip>(trips: readonly T[], today: CalendarDate): T[] {
  return trips
    .filter((trip) => {
      const status = deriveTripStatus(trip, today);
      return status === "completed" || status === "archived";
    })
    .sort(compareHistory);
}

/** Nights of a trip: whole calendar days from start to end; 0 when they are the same day (AC-25). */
export function nightsBetween(start: CalendarDate, end: CalendarDate): number {
  return daysBetween(start, end);
}
