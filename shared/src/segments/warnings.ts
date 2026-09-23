/**
 * Stable identifiers of route-level warnings `buildRoute` (see `route.ts`) can raise, and the data
 * each one carries. These are identifiers, NOT user-facing texts (same contract shape as
 * `SEGMENT_FIELD_ERROR`): clients map an id to their own localized string. A warning is always
 * informational — nothing in this module (or `route.ts`) ever blocks saving on one (stop-list #16).
 */
export const SEGMENT_WARNING = {
  layoverRisky: "layover.risky",
  airportMismatch: "airport.mismatch",
  segmentsOverlap: "segments.overlap",
  segmentOutsideTripDates: "segment.outsideTripDates",
  routeNotClosed: "route.notClosed",
} as const;

export type SegmentWarningId = (typeof SEGMENT_WARNING)[keyof typeof SEGMENT_WARNING];

/** A layover shorter than `RISKY_LAYOVER_MS` (route.ts) between two segments at the same airport. */
export type LayoverRiskyWarning = {
  id: "layover.risky";
  beforeSegmentId: string;
  afterSegmentId: string;
  durationMs: number;
};

/** The previous segment's arrival airport and the next segment's departure airport differ (AC-51/52). */
export type AirportMismatchWarning = {
  id: "airport.mismatch";
  beforeSegmentId: string;
  afterSegmentId: string;
  arrivalAirportCode: string;
  departureAirportCode: string;
};

/** The next segment departs before the previous one arrives (negative gap, AC-54). */
export type SegmentsOverlapWarning = {
  id: "segments.overlap";
  beforeSegmentId: string;
  afterSegmentId: string;
};

/** A segment's departure or arrival falls outside the trip's own date range (AC-55). */
export type SegmentOutsideTripDatesWarning = {
  id: "segment.outsideTripDates";
  segmentId: string;
  field: "departure" | "arrival";
};

/** The route doesn't return to its starting city (AC-56); carries where it would need to resume (AC-57). */
export type RouteNotClosedWarning = {
  id: "route.notClosed";
  cityId: string;
  airportCode: string;
};

export type RouteWarning =
  | LayoverRiskyWarning
  | AirportMismatchWarning
  | SegmentsOverlapWarning
  | SegmentOutsideTripDatesWarning
  | RouteNotClosedWarning;

const KNOWN_IDS: ReadonlySet<string> = new Set(Object.values(SEGMENT_WARNING));

export function isSegmentWarningId(value: unknown): value is SegmentWarningId {
  return typeof value === "string" && KNOWN_IDS.has(value);
}
