import { primaryAirportOfCity } from "../places/airportSearch";
import { compareCalendarDates, daysBetween, type CalendarDate } from "../trips/calendarDate";
import type { Trip } from "../trips/schemas";
import type { Segment } from "./schemas";
import { instantToZonedParts } from "./time";
import type { RouteWarning } from "./warnings";

/**
 * Longest gap that still counts as a same-day connection rather than an overnight stopover
 * (AC-49). Lives ONLY here (AC-62) — `mobile/` never compares against a threshold directly.
 */
export const LAYOVER_MAX_MS = 8 * 60 * 60 * 1000;
/** Below this, a layover is flagged `risky` (AC-50). Lives ONLY here (AC-62). */
export const RISKY_LAYOVER_MS = 90 * 60 * 1000;

/** One chained segment (kept as a wrapper so the view can grow fields without breaking `Segment`). */
export type RouteNode = { segment: Segment };

/** The pause between two adjacent (same-airport) segments in the chain. */
export type RouteGap = {
  beforeSegmentId: string;
  afterSegmentId: string;
  /** `"layover"` when `durationMs <= LAYOVER_MAX_MS`, `"stopover"` otherwise. */
  kind: "layover" | "stopover";
  /** Never negative even when the underlying instants overlap (AC-54; see `segments.overlap`). */
  durationMs: number;
  /** `true` only for a `"layover"` shorter than `RISKY_LAYOVER_MS`. */
  risky: boolean;
  /** Whole calendar days the stopover spans in the shared airport's zone; unset when it doesn't (AC-53). */
  days?: number;
  /** The stopover's city (only set for `"stopover"`, for "N days in `<city>`"). */
  cityId?: string;
};

export type RouteView = {
  /** Segments ordered by `departureAt` ascending, ties broken by `id` (AC-47). */
  chain: RouteNode[];
  gaps: RouteGap[];
  /** Stable ids + data, in a deterministic order (AC-59). */
  warnings: RouteWarning[];
  /** Airport codes visited, consecutive duplicates collapsed (AC-60). */
  summary: { codes: string[]; segments: number; layovers: number };
  /** Same CITY (not airport) for the first departure and the last arrival (AC-56). */
  closed: boolean;
  /** Where to resume from when `closed` is `false`: the last city and its main airport (AC-57). */
  openAt?: { cityId: string; airportCode: string };
  /** The chain segment closest to `now`: the next upcoming one, or the last one if all are past (AC-61). */
  nearestSegmentId?: string;
};

export type BuildRouteInput = {
  segments: readonly Segment[];
  trip: Pick<Trip, "startDate" | "endDate">;
  /** INJECTED moment — this module never reads the clock itself (AC-61). */
  now: Date;
};

function compareSegments(a: Segment, b: Segment): number {
  const byDeparture = a.departureAt.getTime() - b.departureAt.getTime();
  if (byDeparture !== 0) return byDeparture;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function isOutsideTripRange(date: CalendarDate, start: CalendarDate | null, end: CalendarDate | null): boolean {
  if (start !== null && compareCalendarDates(date, start) < 0) return true;
  if (end !== null && compareCalendarDates(date, end) > 0) return true;
  return false;
}

/** Gaps + the warnings tied to adjacent-segment comparisons (mismatch, overlap, risky layover). */
function buildGaps(chain: readonly RouteNode[], warnings: RouteWarning[]): RouteGap[] {
  const gaps: RouteGap[] = [];
  for (let i = 0; i < chain.length - 1; i++) {
    const before = chain[i]!.segment;
    const after = chain[i + 1]!.segment;

    // "Same airport" between neighbours is by CODE (AC-51/52) — deliberately not by city. This
    // check runs even when the arrival time below is unknown (AC-51/52 "including when the
    // arrival is unknown") — it only needs the codes, not a duration.
    if (before.to.iata !== after.from.iata) {
      warnings.push({
        id: "airport.mismatch",
        beforeSegmentId: before.id,
        afterSegmentId: after.id,
        arrivalAirportCode: before.to.iata,
        departureAirportCode: after.from.iata,
      });
      continue;
    }

    // Q11: no pause is drawn when the previous segment has no arrival — there is nothing to
    // measure a duration from, even though the airports already match.
    if (before.arrivalAt === null) continue;

    const rawDurationMs = after.departureAt.getTime() - before.arrivalAt.getTime();
    if (rawDurationMs < 0) {
      warnings.push({ id: "segments.overlap", beforeSegmentId: before.id, afterSegmentId: after.id });
    }
    const durationMs = Math.max(0, rawDurationMs);
    const kind: RouteGap["kind"] = durationMs <= LAYOVER_MAX_MS ? "layover" : "stopover";
    const risky = kind === "layover" && durationMs < RISKY_LAYOVER_MS;
    if (risky) {
      warnings.push({ id: "layover.risky", beforeSegmentId: before.id, afterSegmentId: after.id, durationMs });
    }

    let days: number | undefined;
    let cityId: string | undefined;
    if (kind === "stopover") {
      cityId = before.to.cityId;
      const zone = before.to.timeZone;
      const arrivalLocalDate = instantToZonedParts(before.arrivalAt, zone).date;
      const departureLocalDate = instantToZonedParts(after.departureAt, zone).date;
      const span = daysBetween(arrivalLocalDate, departureLocalDate);
      if (span > 0) days = span;
    }

    gaps.push({ beforeSegmentId: before.id, afterSegmentId: after.id, kind, durationMs, risky, days, cityId });
  }
  return gaps;
}

/**
 * `segment.outsideTripDates` — AT MOST ONE per segment (AC-55; nothing when the trip has no dates).
 * A segment that departs AND arrives outside the range used to raise two identical warnings; the
 * user only needs to hear once that the segment sits outside the trip, so `field` names the first
 * offending end (departure wins over arrival).
 */
function buildTripDateWarnings(chain: readonly RouteNode[], trip: BuildRouteInput["trip"]): RouteWarning[] {
  const { startDate, endDate } = trip;
  if (startDate === null && endDate === null) return [];
  const warnings: RouteWarning[] = [];
  for (const { segment } of chain) {
    const departureLocal = instantToZonedParts(segment.departureAt, segment.from.timeZone).date;
    if (isOutsideTripRange(departureLocal, startDate, endDate)) {
      warnings.push({ id: "segment.outsideTripDates", segmentId: segment.id, field: "departure" });
      continue;
    }
    if (segment.arrivalAt !== null) {
      const arrivalLocal = instantToZonedParts(segment.arrivalAt, segment.to.timeZone).date;
      if (isOutsideTripRange(arrivalLocal, startDate, endDate)) {
        warnings.push({ id: "segment.outsideTripDates", segmentId: segment.id, field: "arrival" });
      }
    }
  }
  return warnings;
}

/**
 * Whether the route returns to its starting CITY (AC-56, deliberately not the starting airport —
 * see the JFK/LGA case below) + the one extra nuance that distinction hides: even a route "closed"
 * by city can end at a DIFFERENT airport of that city than it started from (JFK -> ... -> LGA, both
 * New York), which is exactly the "same airport" comparison (by CODE, AC-51/52) applied to the
 * route's own two ends — surfaced as `airport.mismatch` between the last and first segment.
 */
function closeRoute(
  chain: readonly RouteNode[],
  warnings: RouteWarning[],
): { closed: boolean; openAt?: RouteView["openAt"] } {
  if (chain.length === 0) return { closed: true };
  const first = chain[0]!.segment;
  const last = chain[chain.length - 1]!.segment;
  const closed = first.from.cityId === last.to.cityId;

  if (closed) {
    if (first.from.iata !== last.to.iata) {
      warnings.push({
        id: "airport.mismatch",
        beforeSegmentId: last.id,
        afterSegmentId: first.id,
        arrivalAirportCode: last.to.iata,
        departureAirportCode: first.from.iata,
      });
    }
    return { closed: true };
  }

  const cityId = last.to.cityId;
  const airportCode = primaryAirportOfCity(cityId)?.iata ?? last.to.iata;
  const openAt = { cityId, airportCode };
  warnings.push({ id: "route.notClosed", cityId, airportCode });
  return { closed: false, openAt };
}

/** Airport codes visited in chain order, consecutive duplicates collapsed (AC-60). */
function buildSummaryCodes(chain: readonly RouteNode[]): string[] {
  if (chain.length === 0) return [];
  const raw = [chain[0]!.segment.from.iata, ...chain.map((node) => node.segment.to.iata)];
  const codes: string[] = [];
  for (const code of raw) {
    if (codes[codes.length - 1] !== code) codes.push(code);
  }
  return codes;
}

/** The next upcoming segment (`departureAt >= now`), or the last one when every segment is past (AC-61). */
function findNearestSegmentId(chain: readonly RouteNode[], now: Date): string | undefined {
  if (chain.length === 0) return undefined;
  const upcoming = chain.find((node) => node.segment.departureAt.getTime() >= now.getTime());
  return (upcoming ?? chain[chain.length - 1]!).segment.id;
}

/**
 * The whole route view for a trip's segments: chain, pauses, warnings, summary, whether it returns
 * to its starting city, and the segment closest to `now`. Pure and deterministic for a fixed input
 * (AC-47); `now` is always the caller's, never read from the clock (AC-61).
 */
export function buildRoute(input: BuildRouteInput): RouteView {
  const chain: RouteNode[] = [...input.segments].sort(compareSegments).map((segment) => ({ segment }));
  const warnings: RouteWarning[] = [];

  const gaps = buildGaps(chain, warnings);
  warnings.push(...buildTripDateWarnings(chain, input.trip));
  const { closed, openAt } = closeRoute(chain, warnings);

  return {
    chain,
    gaps,
    warnings,
    summary: { codes: buildSummaryCodes(chain), segments: chain.length, layovers: gaps.length },
    closed,
    openAt,
    nearestSegmentId: findNearestSegmentId(chain, input.now),
  };
}
