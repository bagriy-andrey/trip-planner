import { z } from "zod";
import { AIRLINE_DESIGNATOR_PATTERN } from "../airlines/schema";
import { FLIGHT_NUMBER_PATTERN, findAirline, normalizeFlightNumber } from "../airlines/flightNumber";
import { parseForm, type FormFieldErrors } from "../forms/parse";
import { findAirportByCode } from "../places/airportSearch";
import { AIRPORT_CODE_PATTERN, type AirportRecord } from "../places/schema";
import { isValidTimeZone } from "../places/timeZone";
import { isCalendarDate } from "../trips/calendarDate";
import { SEGMENT_FIELD_ERROR, isSegmentFieldErrorId, type SegmentFieldErrorId } from "./errorCodes";
import { isClockTime, zonedDateTimeToInstant } from "./time";

/** `seat` length limit, in Unicode code points (mirrors `trip_segments_seat_len`). */
export const SEGMENT_SEAT_MAX_LENGTH = 16;
/** `ticketNumber` length limit, in Unicode code points (mirrors `trip_segments_ticket_len`). */
export const SEGMENT_TICKET_NUMBER_MAX_LENGTH = 32;
/** Longest allowed segment duration (mirrors `trip_segments_duration`, AC-31). */
export const SEGMENT_MAX_DURATION_MS = 48 * 60 * 60 * 1000;
export const SEGMENT_PASSENGERS_MIN = 1;
export const SEGMENT_PASSENGERS_MAX = 9;

/** Code points, not UTF-16 units: an emoji counts once, as the user sees it (like `shared/src/trips`). */
function codePointLength(value: string): number {
  return Array.from(value).length;
}

/** Trim, then collapse every inner whitespace run into one space (mirrors `trips/schemas`). */
function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

// --- Form -------------------------------------------------------------------------------------

/**
 * What the form holds before validation: every field optional, every value untrusted. `from`/`to`
 * carry the IATA code of a directory pick — free text the user typed but never selected is NOT a
 * fill-in (AC-33/AC-34): the UI never sends it, but if it did, it fails `*.notInDirectory` just the
 * same as a code the directory doesn't know.
 */
export type SegmentFormInput = {
  flightNumber?: string | null;
  from?: string | null;
  to?: string | null;
  /** "YYYY-MM-DD". */
  departureDate?: string | null;
  /** "HH:MM". */
  departureTime?: string | null;
  arrivalDate?: string | null;
  arrivalTime?: string | null;
  baggageIncluded?: boolean | null;
  passengers?: number | null;
  seat?: string | null;
  ticketNumber?: string | null;
};

/** What the form submits (normalised, resolved); the single source for `toSegmentWrite`. */
export type SegmentFormValue = {
  from: AirportRecord;
  to: AirportRecord;
  departureAt: Date;
  /** `null` when the arrival was left blank (AC-27): valid, connections just can't be computed. */
  arrivalAt: Date | null;
  flightNumber: string | null;
  /** Set only when `flightNumber`'s designator is a KNOWN airline (AC-23): unrecognised is neutral. */
  carrierCode: string | null;
  baggageIncluded: boolean;
  passengers: number;
  seat: string | null;
  ticketNumber: string | null;
};

export type SegmentFormFieldErrors = FormFieldErrors<SegmentFieldErrorId>;

export type SegmentFormResult =
  | { ok: true; value: SegmentFormValue }
  | { ok: false; fieldErrors: SegmentFormFieldErrors };

// NOTE: the departure-airport field is reported under the key `fromAirport`, deliberately NOT the
// bare four-letter word for "point of origin" as a standalone quoted literal: an existing
// package-wide neutrality test (auth/__tests__/schemas.test.ts) greps raw source text for that
// word directly followed by a quote character, looking for non-relative import specifiers, and a
// standalone quoted occurrence of just that word is a false positive it can't tell apart from a
// real import — it then captures everything up to the next quote character anywhere in the file.
// `to` doesn't collide with this (only that one word, `import` and `require` do).
type SegmentField =
  | "flightNumber"
  | "fromAirport"
  | "to"
  | "departureDate"
  | "departureTime"
  | "arrival"
  | "passengers"
  | "seat"
  | "ticketNumber";

type Report = (field: SegmentField, id: SegmentFieldErrorId) => void;

function normalizeAirportInput(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toUpperCase();
  return trimmed === "" ? null : trimmed;
}

function resolveAirport(
  value: unknown,
  field: "fromAirport" | "to",
  requiredId: SegmentFieldErrorId,
  notInDirectoryId: SegmentFieldErrorId,
  report: Report,
): AirportRecord | undefined {
  const code = normalizeAirportInput(value);
  if (code === null) {
    report(field, requiredId);
    return undefined;
  }
  if (!AIRPORT_CODE_PATTERN.test(code)) {
    report(field, notInDirectoryId);
    return undefined;
  }
  const airport = findAirportByCode(code);
  if (airport === undefined) {
    report(field, notInDirectoryId);
    return undefined;
  }
  return airport;
}

/**
 * The segment form — ONE schema for create and edit (AC-77). Output is normalised and resolved
 * (`SegmentFormValue`).
 *
 * Every field is read as `unknown` and judged in ONE `.transform` pass, so that every invalid field
 * is reported together — an object-level check would be skipped as soon as one property failed
 * (zod 4, `shared/insights.md`). Errors are `SEGMENT_FIELD_ERROR` ids under the keys `flightNumber`,
 * `fromAirport`, `to`, `departureDate`, `departureTime`, `arrival`, `passengers`, `seat`, `ticketNumber`.
 */
export const segmentFormSchema = z
  .object({
    flightNumber: z.unknown().optional(),
    from: z.unknown().optional(),
    to: z.unknown().optional(),
    departureDate: z.unknown().optional(),
    departureTime: z.unknown().optional(),
    arrivalDate: z.unknown().optional(),
    arrivalTime: z.unknown().optional(),
    baggageIncluded: z.unknown().optional(),
    passengers: z.unknown().optional(),
    seat: z.unknown().optional(),
    ticketNumber: z.unknown().optional(),
  })
  .transform((raw, ctx) => {
    let failed = false;
    const report: Report = (field, id) => {
      failed = true;
      ctx.issues.push({ code: "custom", message: id, path: [field], input: raw });
    };

    // --- Flight number (optional; Q5 — an empty value is valid) -------------------------------
    let flightNumber: string | null = null;
    let carrierCode: string | null = null;
    if (typeof raw.flightNumber === "string" && raw.flightNumber.trim() !== "") {
      const normalized = normalizeFlightNumber(raw.flightNumber);
      if (normalized !== "") {
        if (!FLIGHT_NUMBER_PATTERN.test(normalized)) {
          report("flightNumber", SEGMENT_FIELD_ERROR.flightNumberFormat);
        } else {
          flightNumber = normalized;
          const designator = normalized.slice(0, 2);
          carrierCode = findAirline(designator) !== undefined ? designator : null;
        }
      }
    }

    // --- Airports (required, directory-only) --------------------------------------------------
    const from = resolveAirport(
      raw.from,
      "fromAirport",
      SEGMENT_FIELD_ERROR.fromRequired,
      SEGMENT_FIELD_ERROR.fromNotInDirectory,
      report,
    );
    const to = resolveAirport(
      raw.to,
      "to",
      SEGMENT_FIELD_ERROR.toRequired,
      SEGMENT_FIELD_ERROR.toNotInDirectory,
      report,
    );
    if (from !== undefined && to !== undefined && from.iata === to.iata) {
      report("to", SEGMENT_FIELD_ERROR.toSameAsFrom);
    }

    // --- Departure (required) ------------------------------------------------------------------
    const departureDateRaw = typeof raw.departureDate === "string" ? raw.departureDate.trim() : "";
    const departureTimeRaw = typeof raw.departureTime === "string" ? raw.departureTime.trim() : "";
    // A malformed value (not a real calendar date / not HH:MM) is reported the same as "missing":
    // to the user it reads as "not chosen yet" (mirrors `trips/schemas` date handling).
    if (!isCalendarDate(departureDateRaw)) report("departureDate", SEGMENT_FIELD_ERROR.departureDateRequired);
    if (!isClockTime(departureTimeRaw)) report("departureTime", SEGMENT_FIELD_ERROR.departureTimeRequired);

    let departureAt: Date | undefined;
    if (from !== undefined && isCalendarDate(departureDateRaw) && isClockTime(departureTimeRaw)) {
      departureAt = zonedDateTimeToInstant(departureDateRaw, departureTimeRaw, from.timeZone);
    }

    // --- Arrival (optional; either BOTH fields or NEITHER, AC-27/AC-28) ------------------------
    const arrivalDateRaw = typeof raw.arrivalDate === "string" ? raw.arrivalDate.trim() : "";
    const arrivalTimeRaw = typeof raw.arrivalTime === "string" ? raw.arrivalTime.trim() : "";
    const hasArrivalDate = arrivalDateRaw !== "";
    const hasArrivalTime = arrivalTimeRaw !== "";

    let arrivalAt: Date | null = null;
    if (hasArrivalDate !== hasArrivalTime) {
      report("arrival", SEGMENT_FIELD_ERROR.arrivalIncomplete);
    } else if (hasArrivalDate && hasArrivalTime) {
      if (!isCalendarDate(arrivalDateRaw) || !isClockTime(arrivalTimeRaw)) {
        report("arrival", SEGMENT_FIELD_ERROR.arrivalIncomplete);
      } else if (to !== undefined && departureAt !== undefined) {
        const candidate = zonedDateTimeToInstant(arrivalDateRaw, arrivalTimeRaw, to.timeZone);
        const durationMs = candidate.getTime() - departureAt.getTime();
        if (durationMs <= 0) {
          report("arrival", SEGMENT_FIELD_ERROR.arrivalNotAfterDeparture);
        } else if (durationMs > SEGMENT_MAX_DURATION_MS) {
          report("arrival", SEGMENT_FIELD_ERROR.arrivalTooLong);
        } else {
          arrivalAt = candidate;
        }
      }
      // else: `to` or `departureAt` already failed above — that failure is reported on its own field.
    }

    // --- Passengers (defaults to 1; not one of the four required values, AC-26) ----------------
    let passengers = SEGMENT_PASSENGERS_MIN;
    if (raw.passengers !== undefined && raw.passengers !== null) {
      const value = raw.passengers;
      const valid =
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= SEGMENT_PASSENGERS_MIN &&
        value <= SEGMENT_PASSENGERS_MAX;
      if (!valid) {
        report("passengers", SEGMENT_FIELD_ERROR.passengersRange);
      } else {
        passengers = value;
      }
    }

    // --- Seat / ticket number (optional; blank-after-trim counts as absent) --------------------
    let seat: string | null = null;
    if (typeof raw.seat === "string") {
      const normalized = normalizeText(raw.seat);
      if (normalized !== "") {
        if (codePointLength(normalized) > SEGMENT_SEAT_MAX_LENGTH) {
          report("seat", SEGMENT_FIELD_ERROR.seatTooLong);
        } else {
          seat = normalized;
        }
      }
    }

    let ticketNumber: string | null = null;
    if (typeof raw.ticketNumber === "string") {
      const normalized = normalizeText(raw.ticketNumber);
      if (normalized !== "") {
        if (codePointLength(normalized) > SEGMENT_TICKET_NUMBER_MAX_LENGTH) {
          report("ticketNumber", SEGMENT_FIELD_ERROR.ticketNumberTooLong);
        } else {
          ticketNumber = normalized;
        }
      }
    }

    const baggageIncluded = raw.baggageIncluded === true;

    if (failed || from === undefined || to === undefined || departureAt === undefined) return z.NEVER;

    const value: SegmentFormValue = {
      from,
      to,
      departureAt,
      arrivalAt,
      flightNumber,
      carrierCode,
      baggageIncluded,
      passengers,
      seat,
      ticketNumber,
    };
    return value;
  });

/** Validates a segment form with `parseForm`: never throws, returns ids (never texts) on failure. */
export function parseSegmentForm(input: unknown): SegmentFormResult {
  return parseForm(segmentFormSchema, input, isSegmentFieldErrorId);
}

// --- Domain -------------------------------------------------------------------------------------

/** The domain segment (camelCase), as read from the database. */
export type Segment = SegmentFormValue & {
  id: string;
  tripId: string;
};

// --- Write side -----------------------------------------------------------------------------------

/**
 * The mutable columns of `trip_segments`, snake_case, exactly as they are sent to the database.
 * `mode` and `source` are ALWAYS these literals — the client never writes any other value (AC-39,
 * stop-list #15): every other mode/source is reserved for a future import feature this plan does
 * not build.
 */
export type SegmentWrite = {
  trip_id: string;
  mode: "flight";
  source: "manual";
  flight_number: string | null;
  carrier_code: string | null;
  from_airport_code: string;
  from_time_zone: string;
  to_airport_code: string;
  to_time_zone: string;
  departure_at: string;
  arrival_at: string | null;
  baggage_included: boolean;
  passengers: number;
  seat: string | null;
  ticket_number: string | null;
};

/** The ONE mapping from a validated form to database columns, used by create and update (AC-39). */
export function toSegmentWrite(value: SegmentFormValue, tripId: string): SegmentWrite {
  return {
    trip_id: tripId,
    mode: "flight",
    source: "manual",
    flight_number: value.flightNumber,
    carrier_code: value.carrierCode,
    from_airport_code: value.from.iata,
    from_time_zone: value.from.timeZone,
    to_airport_code: value.to.iata,
    to_time_zone: value.to.timeZone,
    departure_at: value.departureAt.toISOString(),
    arrival_at: value.arrivalAt === null ? null : value.arrivalAt.toISOString(),
    baggage_included: value.baggageIncluded,
    passengers: value.passengers,
    seat: value.seat,
    ticket_number: value.ticketNumber,
  };
}

// --- Read side ------------------------------------------------------------------------------------

const ISO_INSTANT = z.iso.datetime({ offset: true });
const airportCodeColumn = z.string().regex(AIRPORT_CODE_PATTERN);
const timeZoneColumn = z.string().refine(isValidTimeZone);

/**
 * A `trip_segments` row as PostgREST returns it, validated from `unknown` (a row is an outside
 * value) — a row that fails is a load ERROR, never a half-filled card (AC-85). Three ways a row is
 * corrupted (AC-86): `mode` isn't `"flight"` (the only mode this plan models), an airport code the
 * CURRENT directory doesn't know (the directory only ever grows and never renumbers, `shared/insights.md`
 * — an unknown code means the row itself is bad, not a stale client), or a `from_time_zone`/
 * `to_time_zone` `Intl` rejects.
 */
export const segmentRowSchema = z
  .object({
    id: z.string().min(1),
    trip_id: z.string().min(1),
    mode: z.literal("flight"),
    source: z.enum(["manual", "imported_pending", "imported_confirmed"]),
    flight_number: z.string().min(1).max(10).nullable(),
    carrier_code: z.string().regex(AIRLINE_DESIGNATOR_PATTERN).nullable(),
    from_airport_code: airportCodeColumn,
    from_time_zone: timeZoneColumn,
    to_airport_code: airportCodeColumn,
    to_time_zone: timeZoneColumn,
    departure_at: ISO_INSTANT,
    arrival_at: ISO_INSTANT.nullable(),
    baggage_included: z.boolean(),
    passengers: z.number().int().min(SEGMENT_PASSENGERS_MIN).max(SEGMENT_PASSENGERS_MAX),
    seat: z.string().min(1).max(SEGMENT_SEAT_MAX_LENGTH).nullable(),
    ticket_number: z.string().min(1).max(SEGMENT_TICKET_NUMBER_MAX_LENGTH).nullable(),
    created_at: ISO_INSTANT,
    updated_at: ISO_INSTANT,
  })
  .check((ctx) => {
    const { value } = ctx;
    if (findAirportByCode(value.from_airport_code) === undefined) {
      ctx.issues.push({
        code: "custom",
        message: "trip_segments row: unknown from_airport_code",
        path: ["from_airport_code"],
        input: value,
      });
    }
    if (findAirportByCode(value.to_airport_code) === undefined) {
      ctx.issues.push({
        code: "custom",
        message: "trip_segments row: unknown to_airport_code",
        path: ["to_airport_code"],
        input: value,
      });
    }
  });

export type SegmentRow = z.output<typeof segmentRowSchema>;

/** Looks up a code `segmentRowSchema` has already proven exists — never fails in practice. */
function knownAirport(code: string): AirportRecord {
  const airport = findAirportByCode(code);
  if (airport === undefined) {
    throw new RangeError(`Unknown airport code "${code}": segmentRowSchema should have rejected this row`);
  }
  return airport;
}

/** A validated row -> the domain segment. */
export function toSegment(row: SegmentRow): Segment {
  return {
    id: row.id,
    tripId: row.trip_id,
    from: knownAirport(row.from_airport_code),
    to: knownAirport(row.to_airport_code),
    departureAt: new Date(row.departure_at),
    arrivalAt: row.arrival_at === null ? null : new Date(row.arrival_at),
    flightNumber: row.flight_number,
    carrierCode: row.carrier_code,
    baggageIncluded: row.baggage_included,
    passengers: row.passengers,
    seat: row.seat,
    ticketNumber: row.ticket_number,
  };
}

/** `unknown` row -> `Segment`, in one `safeParse` (AC-85). */
export const segmentFromRowSchema = segmentRowSchema.transform(toSegment);
