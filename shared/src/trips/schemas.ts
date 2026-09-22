import { z } from "zod";
import { parseForm, type FormFieldErrors } from "../forms/parse";
import { findPlaceById } from "../places/search";
import { AIRPORT_CODE_PATTERN, COUNTRY_CODE_PATTERN } from "../places/schema";
import { isValidTimeZone } from "../places/timeZone";
import { daysBetween, isCalendarDate, type CalendarDate } from "./calendarDate";
import { TRIP_FIELD_ERROR, isTripFieldErrorId, type TripFieldErrorId } from "./errorCodes";

/** `destination` length limit, in Unicode code points (Q4; mirrors `trips_destination_len`). */
export const TRIP_DESTINATION_MAX_LENGTH = 80;
/** `title` length limit, in Unicode code points (Q4; mirrors `trips_title_len`). */
export const TRIP_TITLE_MAX_LENGTH = 80;
/** Longest allowed trip in days between start and end (AC-19; mirrors `trips_dates_max_span`). */
export const TRIP_MAX_SPAN_DAYS = 365;

const ISO_INSTANT = z.iso.datetime({ offset: true });

/** Code points, not UTF-16 units: an emoji counts once, as the user sees it (like `shared/src/auth`). */
function codePointLength(value: string): number {
  return Array.from(value).length;
}

/** Trim, then collapse every inner whitespace run into one space (AC-26). */
function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

// --- Place ----------------------------------------------------------------------------------------

/**
 * Where a trip goes, as a fully resolved value: `custom` is free text (carries nothing but its
 * kind); `city`/`country` carry what the directory pick filled in. There is no way to build a
 * custom place with a leftover time zone — the invalid state is unrepresentable (AC-51).
 */
export const tripPlaceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("custom") }),
  z.object({
    kind: z.literal("city"),
    placeId: z.string().min(1),
    countryCode: z.string().regex(COUNTRY_CODE_PATTERN),
    timeZone: z.string().refine(isValidTimeZone),
    airportCode: z.string().regex(AIRPORT_CODE_PATTERN).nullable(),
  }),
  z.object({
    kind: z.literal("country"),
    placeId: z.string().min(1),
    countryCode: z.string().regex(COUNTRY_CODE_PATTERN),
  }),
]);

export type TripPlace = z.infer<typeof tripPlaceSchema>;

/**
 * The place a directory id stands for; free text (`custom`) for a missing, blank or unknown id.
 * The form UI only offers directory ids, so an unknown one is a stale client, not user input —
 * degrading to `custom` keeps the write consistent instead of failing the whole form.
 */
function placeFromId(placeId: string | null): TripPlace {
  const record = placeId === null ? undefined : findPlaceById(placeId);
  if (record === undefined) return { kind: "custom" };
  if (record.kind === "city") {
    return {
      kind: "city",
      placeId: record.id,
      countryCode: record.countryCode,
      timeZone: record.timeZone,
      airportCode: record.airportCode ?? null,
    };
  }
  return { kind: "country", placeId: record.id, countryCode: record.countryCode };
}

// --- Form -----------------------------------------------------------------------------------------

const destinationSchema = z
  .string({ error: TRIP_FIELD_ERROR.destinationEmpty })
  .transform(normalizeText)
  .pipe(
    z
      .string()
      .min(1, { error: TRIP_FIELD_ERROR.destinationEmpty })
      .refine((value) => codePointLength(value) <= TRIP_DESTINATION_MAX_LENGTH, {
        error: TRIP_FIELD_ERROR.destinationTooLong,
      }),
  );

/** Optional: missing / blank -> `null`. */
const titleSchema = z
  .string({ error: TRIP_FIELD_ERROR.titleTooLong })
  .nullish()
  .transform((value): string | null => {
    if (value === null || value === undefined) return null;
    const normalized = normalizeText(value);
    return normalized === "" ? null : normalized;
  })
  .pipe(
    z
      .string()
      .refine((value) => codePointLength(value) <= TRIP_TITLE_MAX_LENGTH, {
        error: TRIP_FIELD_ERROR.titleTooLong,
      })
      .nullable(),
  );

/** The first issue message that is a known trip error id (the field schemas use ids as messages). */
function firstErrorId(error: z.ZodError, fallback: TripFieldErrorId): TripFieldErrorId {
  return error.issues.map((issue) => issue.message).find(isTripFieldErrorId) ?? fallback;
}

/** A raw date field: missing / blank -> `null`; anything else is kept as text and judged with its pair. */
function normalizeDateField(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = typeof value === "string" ? value.trim() : String(value);
  return text === "" ? null : text;
}

type DatesProblem = Extract<
  TripFieldErrorId,
  "dates.incomplete" | "dates.endBeforeStart" | "dates.tooLong"
>;

/** The one date problem of a start/end pair, or `undefined` when the pair is fine. */
function datesProblem(start: string | null, end: string | null): DatesProblem | undefined {
  if (start === null && end === null) return undefined;
  if (!isCalendarDate(start) || !isCalendarDate(end)) return TRIP_FIELD_ERROR.datesIncomplete;
  const span = daysBetween(start, end);
  if (span < 0) return TRIP_FIELD_ERROR.datesEndBeforeStart;
  if (span > TRIP_MAX_SPAN_DAYS) return TRIP_FIELD_ERROR.datesTooLong;
  return undefined;
}

/** What the form holds before validation: every field optional, every value untrusted. */
export type TripFormInput = {
  destination?: string | null;
  /** Directory id of the picked suggestion; absent / empty for free text. */
  placeId?: string | null;
  title?: string | null;
  /** `"YYYY-MM-DD"`; absent / empty for "no dates yet". */
  startDate?: string | null;
  endDate?: string | null;
};

/**
 * The trip form — ONE schema for create and edit (AC-49). Output is normalised and resolved
 * (`TripFormValue`).
 *
 * Every field is read as `unknown` and judged by the field rules below in ONE pass, so that all
 * invalid fields are reported together — an object-level check would be skipped as soon as one
 * property failed (zod 4). Errors are `TRIP_FIELD_ERROR` ids under the keys `destination`, `title`
 * and `dates` (every date problem, including a malformed value, is reported under `dates`).
 */
export const tripFormSchema = z
  .object({
    destination: z.unknown().optional(),
    placeId: z.unknown().optional(),
    title: z.unknown().optional(),
    startDate: z.unknown().optional(),
    endDate: z.unknown().optional(),
  })
  .transform((raw, ctx) => {
    let failed = false;
    const report = (field: "destination" | "title" | "dates", id: TripFieldErrorId): void => {
      failed = true;
      ctx.issues.push({ code: "custom", message: id, path: [field], input: raw });
    };

    const destination = destinationSchema.safeParse(raw.destination);
    if (!destination.success) {
      report("destination", firstErrorId(destination.error, TRIP_FIELD_ERROR.destinationEmpty));
    }
    const title = titleSchema.safeParse(raw.title);
    if (!title.success) {
      report("title", firstErrorId(title.error, TRIP_FIELD_ERROR.titleTooLong));
    }

    const startDate = normalizeDateField(raw.startDate);
    const endDate = normalizeDateField(raw.endDate);
    const problem = datesProblem(startDate, endDate);
    if (problem !== undefined) report("dates", problem);

    if (failed || !destination.success || !title.success) return z.NEVER;
    return {
      destination: destination.data,
      place: placeFromId(
        typeof raw.placeId === "string" && raw.placeId.trim() !== "" ? raw.placeId.trim() : null,
      ),
      title: title.data,
      startDate: isCalendarDate(startDate) ? startDate : null,
      endDate: isCalendarDate(endDate) ? endDate : null,
    };
  });

/** What the form submits (normalised, resolved); the single source for `toTripWrite`. */
export type TripFormValue = z.output<typeof tripFormSchema>;
export type TripFormFieldErrors = FormFieldErrors<TripFieldErrorId>;

export type TripFormResult =
  | { ok: true; value: TripFormValue }
  | { ok: false; fieldErrors: TripFormFieldErrors };

/** Validates a trip form with `parseForm`: never throws, returns ids (never texts) on failure. */
export function parseTripForm(input: unknown): TripFormResult {
  return parseForm(tripFormSchema, input, isTripFieldErrorId);
}

// --- Write side -----------------------------------------------------------------------------------

/**
 * The mutable columns of `trips`, snake_case, exactly as they are sent to the database. EVERY key
 * is always present (a `null` clears the column), so an update built from it can never leave a
 * stale place field behind (AC-51). `user_id`, `archived_at` and the timestamps are not the form's.
 * Assignable to `TablesInsert<"trips">` / `TablesUpdate<"trips">`.
 */
export type TripWrite = {
  destination: string;
  title: string | null;
  place_kind: "city" | "country" | "custom";
  place_id: string | null;
  country_code: string | null;
  iana_timezone: string | null;
  airport_code: string | null;
  start_date: CalendarDate | null;
  end_date: CalendarDate | null;
};

/** The ONE mapping from a validated form to database columns, used by create and update (AC-15, AC-51). */
export function toTripWrite(form: TripFormValue): TripWrite {
  const { place } = form;
  const dates = { start_date: form.startDate, end_date: form.endDate };
  switch (place.kind) {
    case "custom":
      return {
        destination: form.destination,
        title: form.title,
        place_kind: "custom",
        place_id: null,
        country_code: null,
        iana_timezone: null,
        airport_code: null,
        ...dates,
      };
    case "city":
      return {
        destination: form.destination,
        title: form.title,
        place_kind: "city",
        place_id: place.placeId,
        country_code: place.countryCode,
        iana_timezone: place.timeZone,
        airport_code: place.airportCode,
        ...dates,
      };
    case "country":
      return {
        destination: form.destination,
        title: form.title,
        place_kind: "country",
        place_id: place.placeId,
        country_code: place.countryCode,
        iana_timezone: null,
        airport_code: null,
        ...dates,
      };
  }
}

// --- Read side ------------------------------------------------------------------------------------

const calendarDateColumn = z.string().refine(isCalendarDate);
const countryCodeColumn = z.string().regex(COUNTRY_CODE_PATTERN);
const airportCodeColumn = z.string().regex(AIRPORT_CODE_PATTERN);
const timeZoneColumn = z.string().refine(isValidTimeZone);

const rowBase = {
  id: z.string().min(1),
  destination: z
    .string()
    .refine((value) => value.trim() !== "" && codePointLength(value) <= TRIP_DESTINATION_MAX_LENGTH),
  title: z
    .string()
    .refine((value) => value !== "" && codePointLength(value) <= TRIP_TITLE_MAX_LENGTH)
    .nullable(),
  start_date: calendarDateColumn.nullable(),
  end_date: calendarDateColumn.nullable(),
  archived_at: ISO_INSTANT.nullable(),
  created_at: ISO_INSTANT,
  updated_at: ISO_INSTANT,
};

/**
 * A `trips` row as PostgREST returns it, validated against the same invariants as the database
 * constraints (place consistency, date pairing/order/span). It is parsed from `unknown` — a row is
 * an outside value — and a row that fails is an error, never a half-filled card (AC-61). Unknown
 * columns (`user_id`) are dropped. An unknown `place_id` is NOT an error (Q3).
 */
export const tripRowSchema = z
  .discriminatedUnion("place_kind", [
    z.object({
      ...rowBase,
      place_kind: z.literal("custom"),
      place_id: z.null(),
      country_code: z.null(),
      iana_timezone: z.null(),
      airport_code: z.null(),
    }),
    z.object({
      ...rowBase,
      place_kind: z.literal("city"),
      place_id: z.string().min(1),
      country_code: countryCodeColumn,
      iana_timezone: timeZoneColumn,
      airport_code: airportCodeColumn.nullable(),
    }),
    z.object({
      ...rowBase,
      place_kind: z.literal("country"),
      place_id: z.string().min(1),
      country_code: countryCodeColumn,
      iana_timezone: timeZoneColumn.nullable(),
      airport_code: z.null(),
    }),
  ])
  .check((ctx) => {
    const { start_date: start, end_date: end } = ctx.value;
    const problem = datesProblem(start, end);
    if (problem !== undefined) {
      ctx.issues.push({
        code: "custom",
        message: `trips row: ${problem}`,
        path: ["start_date"],
        input: ctx.value,
      });
    }
  });

export type TripRow = z.output<typeof tripRowSchema>;

/** The domain trip (camelCase). `status` and the cover are derived, never stored. */
export type Trip = {
  id: string;
  destination: string;
  place: TripPlace;
  title: string | null;
  startDate: CalendarDate | null;
  endDate: CalendarDate | null;
  /** Moment of archiving (ISO instant), `null` when not archived. */
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function placeOfRow(row: TripRow): TripPlace {
  switch (row.place_kind) {
    case "custom":
      return { kind: "custom" };
    case "city":
      return {
        kind: "city",
        placeId: row.place_id,
        countryCode: row.country_code,
        timeZone: row.iana_timezone,
        airportCode: row.airport_code,
      };
    case "country":
      return { kind: "country", placeId: row.place_id, countryCode: row.country_code };
  }
}

/** A validated row -> the domain trip. */
export function toTrip(row: TripRow): Trip {
  return {
    id: row.id,
    destination: row.destination,
    place: placeOfRow(row),
    title: row.title,
    startDate: row.start_date,
    endDate: row.end_date,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** `unknown` row -> `Trip`, in one `safeParse`. */
export const tripFromRowSchema = tripRowSchema.transform(toTrip);
