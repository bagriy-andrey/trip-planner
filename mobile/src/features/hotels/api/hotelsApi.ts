// The ONLY place the app talks to the `trip_hotels` table (PLAN-05 §1.6). Callers receive a
// closed result and this module never throws. Every row is parsed by `hotelFromRowSchema`; a row
// that does not parse fails the whole call, so no half-filled hotel can reach a screen.
//
// Row-level security decides visibility (ownership is derived through the parent trip): someone
// else's or a deleted hotel matches zero rows, which every by-id operation reports as `notFound`.
// A `hotelId`/`tripId` that is not a UUID is `notFound` WITHOUT a request (AC-33).
//
// Logging: only the operation name and the classified error kind, in development builds. Ids,
// map links, addresses and booking references are never logged (guardrail no-credentials-in-logs).

import { hotelFromRowSchema, toHotelWrite } from "@tripplanner/shared";
import type { Hotel, HotelFormValue } from "@tripplanner/shared";

import { mapTripError } from "@/features/trips";
import type { TripErrorKind } from "@/features/trips";
import { supabase } from "@/lib/supabase";

export type HotelFailure = { ok: false; kind: TripErrorKind };
export type HotelSuccess<T> = { ok: true; data: T };
export type HotelResult<T> = HotelSuccess<T> | HotelFailure;

export type ListHotelsResult = HotelResult<Hotel[]>;
export type SingleHotelResult = HotelResult<Hotel>;
export type DeleteHotelResult = HotelResult<{ id: string }>;

type Operation = "listHotels" | "getHotel" | "createHotel" | "updateHotel" | "deleteHotel";

const HOTEL_COLUMNS =
  "id,trip_id,source,name,city_place_id,time_zone,address,maps_url,check_in_at,check_out_at," +
  "guests,parking,breakfast,breakfast_days,cost_amount,cost_currency,booking_ref,notes," +
  "created_at,updated_at";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NOT_FOUND: HotelFailure = { ok: false, kind: "notFound" };

interface Response {
  data: unknown;
  error: unknown;
  status?: number;
}

function failure(operation: Operation, error: unknown, status?: number): HotelFailure {
  const kind = mapTripError(error, status);
  // Guardrail: only literals plus `operation` / `errorCode` may be logged in feature api code.
  const errorCode = kind;
  if (__DEV__) {
    console.warn("[hotels]", operation, "failed", errorCode);
  }
  return { ok: false, kind };
}

function unreadable(operation: Operation): HotelFailure {
  if (__DEV__) {
    console.warn("[hotels]", operation, "unreadable row");
  }
  return { ok: false, kind: "unknown" };
}

function parseHotel(operation: Operation, row: unknown): SingleHotelResult {
  const parsed = hotelFromRowSchema.safeParse(row);
  return parsed.success ? { ok: true, data: parsed.data } : unreadable(operation);
}

async function runSingle(
  operation: Operation,
  request: () => PromiseLike<Response>,
  emptyKind: TripErrorKind,
): Promise<SingleHotelResult> {
  try {
    const { data, error, status } = await request();
    if (error) return failure(operation, error, status);
    if (data === null || data === undefined) return { ok: false, kind: emptyKind };
    return parseHotel(operation, data);
  } catch (error) {
    return failure(operation, error);
  }
}

/** One request for all of a trip's hotels, ordered by check-in. */
export async function listHotels(tripId: string): Promise<ListHotelsResult> {
  if (!UUID.test(tripId)) return NOT_FOUND;
  try {
    const { data, error, status } = await supabase
      .from("trip_hotels")
      .select(HOTEL_COLUMNS)
      .eq("trip_id", tripId)
      .order("check_in_at", { ascending: true });
    if (error) return failure("listHotels", error, status);
    if (!Array.isArray(data)) return unreadable("listHotels");
    const hotels: Hotel[] = [];
    for (const row of data) {
      const parsed = parseHotel("listHotels", row);
      if (!parsed.ok) return parsed;
      hotels.push(parsed.data);
    }
    return { ok: true, data: hotels };
  } catch (error) {
    return failure("listHotels", error);
  }
}

export function getHotel(tripId: string, hotelId: string): Promise<SingleHotelResult> {
  if (!UUID.test(tripId) || !UUID.test(hotelId)) return Promise.resolve(NOT_FOUND);
  return runSingle(
    "getHotel",
    () =>
      supabase
        .from("trip_hotels")
        .select(HOTEL_COLUMNS)
        .eq("trip_id", tripId)
        .eq("id", hotelId)
        .maybeSingle(),
    "notFound",
  );
}

/** `toHotelWrite` is the ONE form-to-columns mapping: `source` is always `manual`. */
export function createHotel(tripId: string, form: HotelFormValue): Promise<SingleHotelResult> {
  return runSingle(
    "createHotel",
    () =>
      supabase.from("trip_hotels").insert(toHotelWrite(form, tripId)).select(HOTEL_COLUMNS).maybeSingle(),
    "unknown",
  );
}

/** Full write for one id, scoped to its trip. Zero rows -> `notFound`. */
export function updateHotel(
  tripId: string,
  hotelId: string,
  form: HotelFormValue,
): Promise<SingleHotelResult> {
  if (!UUID.test(tripId) || !UUID.test(hotelId)) return Promise.resolve(NOT_FOUND);
  return runSingle(
    "updateHotel",
    () =>
      supabase
        .from("trip_hotels")
        .update(toHotelWrite(form, tripId))
        .eq("trip_id", tripId)
        .eq("id", hotelId)
        .select(HOTEL_COLUMNS)
        .maybeSingle(),
    "notFound",
  );
}

/** Physical delete. Zero rows deleted means it was already gone: `notFound`. */
export async function deleteHotel(tripId: string, hotelId: string): Promise<DeleteHotelResult> {
  if (!UUID.test(tripId) || !UUID.test(hotelId)) return NOT_FOUND;
  try {
    const { data, error, status } = await supabase
      .from("trip_hotels")
      .delete()
      .eq("trip_id", tripId)
      .eq("id", hotelId)
      .select("id")
      .maybeSingle();
    if (error) return failure("deleteHotel", error, status);
    if (data === null || data === undefined) return NOT_FOUND;
    return { ok: true, data: { id: hotelId } };
  } catch (error) {
    return failure("deleteHotel", error);
  }
}
