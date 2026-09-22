// The ONLY place the app talks to the `trips` table (SPEC-03 AC-61). Callers receive a closed
// result — `{ ok: true, data } | { ok: false, kind }` — never a raw backend error (AC-60), and
// this module never throws. Every row is parsed by the shared `tripFromRowSchema`; a row that does
// not parse fails the whole call (AC-61), so no half-filled trip can reach a screen.
//
// Requests are bounded by the 15 s timeout of the shared fetch in `lib/supabase` (AC-59); there is
// no second timer here. The client is anonymous-role + the user's JWT: row-level security decides
// what is visible, so a request for someone else's (or a deleted) trip simply matches zero rows,
// which every by-id operation reports as `notFound` (AC-55, AC-56).
//
// Logging: only the operation name and the server error code, in development builds. Destination,
// title, ids and user data are never logged. A row that fails validation is logged with a
// different message than a failed request, so "nothing loads after a migration" is
// distinguishable from "no network" (SPEC-03 observability).

import { toTripWrite, tripFromRowSchema } from "@tripplanner/shared";
import type { Trip, TripFormValue } from "@tripplanner/shared";

import { supabase } from "@/lib/supabase";

import { mapTripError, safeErrorCode } from "./errors";
import type { TripErrorKind } from "./errors";

export type TripFailure = { ok: false; kind: TripErrorKind };
export type TripSuccess<T> = { ok: true; data: T };
export type TripResult<T> = TripSuccess<T> | TripFailure;

export type ListTripsResult = TripResult<Trip[]>;
export type SingleTripResult = TripResult<Trip>;
export type DeleteTripResult = TripResult<{ id: string }>;

type Operation =
  | "listTrips"
  | "getTrip"
  | "createTrip"
  | "updateTrip"
  | "archiveTrip"
  | "unarchiveTrip"
  | "deleteTrip";

/** Explicit columns: `user_id` is never fetched, the client has no use for it. */
const TRIP_COLUMNS =
  "id,destination,title,place_kind,place_id,country_code,iana_timezone,airport_code,start_date,end_date,archived_at,created_at,updated_at";

/**
 * The archive mark is set by the DATABASE clock: Postgres reads the literal `'now'` for a
 * `timestamptz` as the transaction time. The client never reads the system time (AC-24), and a
 * device with a wrong clock cannot write a wrong instant.
 */
const DATABASE_NOW = "now";

interface Response {
  data: unknown;
  error: unknown;
  status?: number;
}

function failure(operation: Operation, error: unknown, status?: number): TripFailure {
  const kind = mapTripError(error, status);
  if (__DEV__) {
    const errorCode = safeErrorCode(error) ?? kind;
    console.warn("[trips]", operation, "failed", errorCode);
  }
  return { ok: false, kind };
}

/** A row that came back but is not a valid trip: a data problem, not a network one (AC-61). */
function unreadable(operation: Operation): TripFailure {
  if (__DEV__) {
    console.warn("[trips]", operation, "unreadable row");
  }
  return { ok: false, kind: "unknown" };
}

function parseTrip(operation: Operation, row: unknown): SingleTripResult {
  const parsed = tripFromRowSchema.safeParse(row);
  return parsed.success ? { ok: true, data: parsed.data } : unreadable(operation);
}

/**
 * Runs a request that must yield exactly one row. `emptyKind` is what "no row" means for the
 * operation: `notFound` when it targets an id, `unknown` for an insert that returned nothing.
 */
async function runSingle(
  operation: Operation,
  request: () => PromiseLike<Response>,
  emptyKind: TripErrorKind,
): Promise<SingleTripResult> {
  try {
    const { data, error, status } = await request();
    if (error) return failure(operation, error, status);
    if (data === null || data === undefined) return { ok: false, kind: emptyKind };
    return parseTrip(operation, data);
  } catch (error) {
    return failure(operation, error);
  }
}

/** The whole list (active, completed and archived): S4 and S5 are two views of one request. */
export async function listTrips(): Promise<ListTripsResult> {
  try {
    const { data, error, status } = await supabase.from("trips").select(TRIP_COLUMNS);
    if (error) return failure("listTrips", error, status);
    if (!Array.isArray(data)) return unreadable("listTrips");
    const trips: Trip[] = [];
    for (const row of data) {
      const parsed = parseTrip("listTrips", row);
      if (!parsed.ok) return parsed;
      trips.push(parsed.data);
    }
    return { ok: true, data: trips };
  } catch (error) {
    return failure("listTrips", error);
  }
}

export function getTrip(id: string): Promise<SingleTripResult> {
  return runSingle(
    "getTrip",
    () => supabase.from("trips").select(TRIP_COLUMNS).eq("id", id).maybeSingle(),
    "notFound",
  );
}

/**
 * Exactly the shared `toTripWrite` mapping, except that an empty title is left OUT of the body
 * instead of being sent as `null` (AC-31): nothing is ever written to `title` for a trip the user
 * did not name, and the database default (`null`) applies. Directory fields are `null` for a
 * free-text place and filled for a picked suggestion (AC-15), straight from `toTripWrite`.
 */
function toCreateBody(form: TripFormValue) {
  const { title, ...rest } = toTripWrite(form);
  return title === null ? rest : { ...rest, title };
}

/** `user_id` is not sent: the column defaults to `auth.uid()` and RLS pins it to the caller. */
export function createTrip(form: TripFormValue): Promise<SingleTripResult> {
  return runSingle(
    "createTrip",
    () => supabase.from("trips").insert(toCreateBody(form)).select(TRIP_COLUMNS).maybeSingle(),
    "unknown",
  );
}

/** Sends the FULL write (every column, `null` clears): no stale place field can survive (AC-51). */
export function updateTrip(id: string, form: TripFormValue): Promise<SingleTripResult> {
  return runSingle(
    "updateTrip",
    () =>
      supabase.from("trips").update(toTripWrite(form)).eq("id", id).select(TRIP_COLUMNS).maybeSingle(),
    "notFound",
  );
}

export function archiveTrip(id: string): Promise<SingleTripResult> {
  return runSingle(
    "archiveTrip",
    () =>
      supabase
        .from("trips")
        .update({ archived_at: DATABASE_NOW })
        .eq("id", id)
        .select(TRIP_COLUMNS)
        .maybeSingle(),
    "notFound",
  );
}

export function unarchiveTrip(id: string): Promise<SingleTripResult> {
  return runSingle(
    "unarchiveTrip",
    () =>
      supabase
        .from("trips")
        .update({ archived_at: null })
        .eq("id", id)
        .select(TRIP_COLUMNS)
        .maybeSingle(),
    "notFound",
  );
}

/** Physical delete (AC-55). Zero rows deleted means the trip was already gone: `notFound`. */
export async function deleteTrip(id: string): Promise<DeleteTripResult> {
  try {
    const { data, error, status } = await supabase
      .from("trips")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) return failure("deleteTrip", error, status);
    if (data === null || data === undefined) return { ok: false, kind: "notFound" };
    return { ok: true, data: { id } };
  } catch (error) {
    return failure("deleteTrip", error);
  }
}
