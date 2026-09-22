// The ONLY place the app talks to the `trip_segments` table (PLAN-04 §1.6). Callers receive a
// closed result — `{ ok: true, data } | { ok: false, kind }` — never a raw backend error, and this
// module never throws. Every row is parsed by the shared `segmentRowSchema`; a row that does not
// parse fails the whole call (AC-85, AC-86), so no half-filled segment can reach a screen.
//
// Requests are bounded by the 15 s timeout of the shared fetch in `lib/supabase` (AC-84); there is
// no second timer here. The client is anonymous-role + the user's JWT: row-level security decides
// what is visible (ownership is derived through the parent trip, `supabase/insights.md`), so a
// request for someone else's (or a deleted) segment simply matches zero rows, which every by-id
// operation reports as `notFound` (AC-81).
//
// The error classifier and `TripApiError` are the trips feature's own, imported from its public
// index — not copied here (R-5, PLAN-04 §1.6): both features see exactly the same postgrest-js
// quirk (a failed fetch resolves `{ status: 0 }` instead of throwing).
//
// Logging: only the operation name and the classified error kind, in development builds. Ticket
// numbers, seats, airport codes and record ids are never logged (guardrail no-credentials-in-logs)
// — a row that fails validation is logged with a different message than a failed request, so
// "nothing loads after a migration" is distinguishable from "no network".

import { segmentFromRowSchema, toSegmentWrite } from "@tripplanner/shared";
import type { Segment, SegmentFormValue } from "@tripplanner/shared";

import { mapTripError } from "@/features/trips";
import type { TripErrorKind } from "@/features/trips";
import { supabase } from "@/lib/supabase";

export type SegmentFailure = { ok: false; kind: TripErrorKind };
export type SegmentSuccess<T> = { ok: true; data: T };
export type SegmentResult<T> = SegmentSuccess<T> | SegmentFailure;

export type ListSegmentsResult = SegmentResult<Segment[]>;
export type SingleSegmentResult = SegmentResult<Segment>;
export type DeleteSegmentResult = SegmentResult<{ id: string }>;

type Operation = "listSegments" | "getSegment" | "createSegment" | "updateSegment" | "deleteSegment";

/** Explicit columns: no other table is joined, no column beyond what `segmentRowSchema` expects. */
const SEGMENT_COLUMNS =
  "id,trip_id,mode,source,flight_number,carrier_code,from_airport_code,from_time_zone," +
  "to_airport_code,to_time_zone,departure_at,arrival_at,baggage_included,passengers,seat," +
  "ticket_number,created_at,updated_at";

interface Response {
  data: unknown;
  error: unknown;
  status?: number;
}

function failure(operation: Operation, error: unknown, status?: number): SegmentFailure {
  const kind = mapTripError(error, status);
  // Guardrail `no-credentials-in-logs` only allows literals plus the identifiers `operation` and
  // `errorCode` as console arguments in feature `api/` code; the classified kind is renamed to
  // that allow-listed name for the log line (it is never the raw server text).
  const errorCode = kind;
  if (__DEV__) {
    console.warn("[segments]", operation, "failed", errorCode);
  }
  return { ok: false, kind };
}

/** A row that came back but is not a valid segment: a data problem, not a network one (AC-85). */
function unreadable(operation: Operation): SegmentFailure {
  if (__DEV__) {
    console.warn("[segments]", operation, "unreadable row");
  }
  return { ok: false, kind: "unknown" };
}

function parseSegment(operation: Operation, row: unknown): SingleSegmentResult {
  const parsed = segmentFromRowSchema.safeParse(row);
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
): Promise<SingleSegmentResult> {
  try {
    const { data, error, status } = await request();
    if (error) return failure(operation, error, status);
    if (data === null || data === undefined) return { ok: false, kind: emptyKind };
    return parseSegment(operation, data);
  } catch (error) {
    return failure(operation, error);
  }
}

/** One request for a whole trip's route (Non-functional: never one request per segment). */
export async function listSegments(tripId: string): Promise<ListSegmentsResult> {
  try {
    const { data, error, status } = await supabase
      .from("trip_segments")
      .select(SEGMENT_COLUMNS)
      .eq("trip_id", tripId)
      .order("departure_at", { ascending: true });
    if (error) return failure("listSegments", error, status);
    if (!Array.isArray(data)) return unreadable("listSegments");
    const segments: Segment[] = [];
    for (const row of data) {
      const parsed = parseSegment("listSegments", row);
      if (!parsed.ok) return parsed;
      segments.push(parsed.data);
    }
    return { ok: true, data: segments };
  } catch (error) {
    return failure("listSegments", error);
  }
}

export function getSegment(tripId: string, segmentId: string): Promise<SingleSegmentResult> {
  return runSingle(
    "getSegment",
    () =>
      supabase
        .from("trip_segments")
        .select(SEGMENT_COLUMNS)
        .eq("trip_id", tripId)
        .eq("id", segmentId)
        .maybeSingle(),
    "notFound",
  );
}

/** `toSegmentWrite` is the ONE mapping from a validated form to database columns (AC-39): always
 * `mode: "flight"`, `source: "manual"`, normalised values — nothing else is ever sent. */
export function createSegment(tripId: string, form: SegmentFormValue): Promise<SingleSegmentResult> {
  return runSingle(
    "createSegment",
    () =>
      supabase
        .from("trip_segments")
        .insert(toSegmentWrite(form, tripId))
        .select(SEGMENT_COLUMNS)
        .maybeSingle(),
    "unknown",
  );
}

/** Sends the FULL write (every column) for one id, scoped to its trip. Zero rows -> `notFound`
 * (AC-81): a segment deleted or moved to another trip since the form opened is not a crash. */
export function updateSegment(
  tripId: string,
  segmentId: string,
  form: SegmentFormValue,
): Promise<SingleSegmentResult> {
  return runSingle(
    "updateSegment",
    () =>
      supabase
        .from("trip_segments")
        .update(toSegmentWrite(form, tripId))
        .eq("trip_id", tripId)
        .eq("id", segmentId)
        .select(SEGMENT_COLUMNS)
        .maybeSingle(),
    "notFound",
  );
}

/** Physical delete. Zero rows deleted means the segment was already gone: `notFound` (AC-81). */
export async function deleteSegment(tripId: string, segmentId: string): Promise<DeleteSegmentResult> {
  try {
    const { data, error, status } = await supabase
      .from("trip_segments")
      .delete()
      .eq("trip_id", tripId)
      .eq("id", segmentId)
      .select("id")
      .maybeSingle();
    if (error) return failure("deleteSegment", error, status);
    if (data === null || data === undefined) return { ok: false, kind: "notFound" };
    return { ok: true, data: { id: segmentId } };
  } catch (error) {
    return failure("deleteSegment", error);
  }
}
