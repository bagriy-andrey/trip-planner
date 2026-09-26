import { SEGMENT_PASSENGERS_MIN, instantToZonedParts, zonedDateTimeToInstant } from "@tripplanner/shared";
import type { AirportRecord, CalendarDate, ClockTime, PlaceLanguage, Segment } from "@tripplanner/shared";

/**
 * What the form holds while the user edits it — mirrors `trip-form/hooks/formState.ts`'s split of
 * "typed text" vs "resolved directory pick". `fromAirport`/`toAirport` are the only values that
 * ever reach the schema (AC-33): typing always clears the matching `*Airport` field, so free text
 * the user never tapped a suggestion for can never be submitted, whatever it says.
 */
export interface SegmentFormState {
  flightNumber: string;
  fromAirport: AirportRecord | null;
  fromText: string;
  toAirport: AirportRecord | null;
  toText: string;
  departureDate: CalendarDate | null;
  departureTime: ClockTime | null;
  /**
   * Flight duration in minutes, `null` = left blank (valid, AC-27). The arrival moment is not
   * entered: it is departure + duration (`arrivalPartsOf`), so a segment without a duration simply
   * has no arrival and connections can't be computed for it.
   */
  durationMinutes: number | null;
  baggageIncluded: boolean;
  /** Starts at `SEGMENT_PASSENGERS_MIN` (1) — not a locally invented constant (AC-36). */
  passengers: number;
  seat: string;
  ticketNumber: string;
}

export const EMPTY_SEGMENT_FORM: SegmentFormState = {
  flightNumber: "",
  fromAirport: null,
  fromText: "",
  toAirport: null,
  toText: "",
  departureDate: null,
  departureTime: null,
  durationMinutes: null,
  baggageIncluded: false,
  passengers: SEGMENT_PASSENGERS_MIN,
  seat: "",
  ticketNumber: "",
};

const MINUTE_MS = 60_000;

/**
 * The arrival date and time (wall clock of the ARRIVAL airport) implied by departure + duration,
 * or `null` while any of the four inputs is missing. This is what the shared schema still receives.
 */
export function arrivalPartsOf(state: SegmentFormState): { date: CalendarDate; time: ClockTime } | null {
  const { fromAirport, toAirport, departureDate, departureTime, durationMinutes } = state;
  if (
    fromAirport === null ||
    toAirport === null ||
    departureDate === null ||
    departureTime === null ||
    durationMinutes === null
  ) {
    return null;
  }
  const departure = zonedDateTimeToInstant(departureDate, departureTime, fromAirport.timeZone);
  return instantToZonedParts(new Date(departure.getTime() + durationMinutes * MINUTE_MS), toAirport.timeZone);
}

/** "HH:MM" <-> minutes for the duration field (a duration is under 24 h here). */
export function durationToClock(minutes: number): ClockTime {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}` as ClockTime;
}

export function clockToDuration(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Display text of a directory pick in the airport field: name + code (e.g. "Warsaw Chopin · WAW"). */
export function airportDisplayText(airport: AirportRecord, lang: PlaceLanguage): string {
  return `${airport[lang]} · ${airport.iata}`;
}

function segmentFormFromAirports(
  fromAirport: AirportRecord | null,
  toAirport: AirportRecord | null,
  departureDate: CalendarDate | null,
  lang: PlaceLanguage,
): SegmentFormState {
  return {
    ...EMPTY_SEGMENT_FORM,
    fromAirport,
    fromText: fromAirport === null ? "" : airportDisplayText(fromAirport, lang),
    toAirport,
    toText: toAirport === null ? "" : airportDisplayText(toAirport, lang),
    departureDate,
  };
}

/** Prefill for the very FIRST segment of a trip (AC-38, `firstSegmentPrefill` from `shared`). */
export function segmentFormFromFirstPrefill(
  prefill: { fromAirport: AirportRecord | null; toAirport: AirportRecord | null; departureDate: CalendarDate | null },
  lang: PlaceLanguage,
): SegmentFormState {
  return segmentFormFromAirports(prefill.fromAirport, prefill.toAirport, prefill.departureDate, lang);
}

/** Prefill after "Save and add next" (AC-41..AC-43, `nextSegmentPrefill` from `shared`). */
export function segmentFormFromNextPrefill(
  prefill: { fromAirport: AirportRecord; toAirport: AirportRecord | null; departureDate: CalendarDate | null },
  lang: PlaceLanguage,
): SegmentFormState {
  return segmentFormFromAirports(prefill.fromAirport, prefill.toAirport, prefill.departureDate, lang);
}

/** Edit mode: every field of an existing segment, including a deliberately empty arrival (AC-76). */
export function segmentFormFromSegment(segment: Segment, lang: PlaceLanguage): SegmentFormState {
  const departure = instantToZonedParts(segment.departureAt, segment.from.timeZone);
  return {
    flightNumber: segment.flightNumber ?? "",
    fromAirport: segment.from,
    fromText: airportDisplayText(segment.from, lang),
    toAirport: segment.to,
    toText: airportDisplayText(segment.to, lang),
    departureDate: departure.date,
    departureTime: departure.time,
    durationMinutes:
      segment.arrivalAt === null
        ? null
        : Math.round((segment.arrivalAt.getTime() - segment.departureAt.getTime()) / MINUTE_MS),
    baggageIncluded: segment.baggageIncluded,
    passengers: segment.passengers,
    seat: segment.seat ?? "",
    ticketNumber: segment.ticketNumber ?? "",
  };
}

/**
 * Pure equality of two form states — the "changed since open" flag (AC-40). Field-by-field, so an
 * `AirportRecord`'s own object identity (a fresh directory lookup vs the one stored at mount) never
 * causes a false positive; only the code it resolved to matters.
 */
export function segmentFormEquals(a: SegmentFormState, b: SegmentFormState): boolean {
  return (
    a.flightNumber === b.flightNumber &&
    (a.fromAirport?.iata ?? null) === (b.fromAirport?.iata ?? null) &&
    a.fromText === b.fromText &&
    (a.toAirport?.iata ?? null) === (b.toAirport?.iata ?? null) &&
    a.toText === b.toText &&
    a.departureDate === b.departureDate &&
    a.departureTime === b.departureTime &&
    a.durationMinutes === b.durationMinutes &&
    a.baggageIncluded === b.baggageIncluded &&
    a.passengers === b.passengers &&
    a.seat === b.seat &&
    a.ticketNumber === b.ticketNumber
  );
}
