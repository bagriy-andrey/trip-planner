// The ONLY place the app talks to the `trip_cars` table (PLAN-07 §1.6). Callers receive a closed
// result and this module never throws. Every row is parsed by `carFromRowSchema`; a row that does
// not parse fails the whole call. Zero rows on a by-id operation is `notFound`; a non-UUID id is
// `notFound` WITHOUT a request. Logging: only the operation name and the classified error code.

import { carFromRowSchema, toCarWrite } from "@tripplanner/shared";
import type { Car, CarFormValue } from "@tripplanner/shared";

import { mapTripError } from "@/features/trips";
import type { TripErrorKind } from "@/features/trips";
import { supabase } from "@/lib/supabase";

export type CarFailure = { ok: false; kind: TripErrorKind };
export type CarSuccess<T> = { ok: true; data: T };
export type CarResult<T> = CarSuccess<T> | CarFailure;

export type ListCarsResult = CarResult<Car[]>;
export type SingleCarResult = CarResult<Car>;
export type DeleteCarResult = CarResult<{ id: string }>;

type Operation = "listCars" | "getCar" | "createCar" | "updateCar" | "deleteCar";

const CAR_COLUMNS =
  "id,trip_id,source,booking_ref,company,pickup_place,pickup_date,pickup_time,return_date,return_time," +
  "return_same_place,return_place,maps_url,address,phone,car_class,insurance,fuel_policy,cost_amount," +
  "cost_currency,payment_status,extra_driver,deposit_amount,notes,created_at,updated_at";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NOT_FOUND: CarFailure = { ok: false, kind: "notFound" };

interface Response {
  data: unknown;
  error: unknown;
  status?: number;
}

function failure(operation: Operation, error: unknown, status?: number): CarFailure {
  const kind = mapTripError(error, status);
  const errorCode = kind;
  if (__DEV__) {
    console.warn("[cars]", operation, "failed", errorCode);
  }
  return { ok: false, kind };
}

function unreadable(operation: Operation): CarFailure {
  if (__DEV__) {
    console.warn("[cars]", operation, "failed", "unknown");
  }
  return { ok: false, kind: "unknown" };
}

function parseCar(operation: Operation, row: unknown): SingleCarResult {
  const parsed = carFromRowSchema.safeParse(row);
  return parsed.success ? { ok: true, data: parsed.data } : unreadable(operation);
}

async function runSingle(
  operation: Operation,
  request: () => PromiseLike<Response>,
  emptyKind: TripErrorKind,
): Promise<SingleCarResult> {
  try {
    const { data, error, status } = await request();
    if (error) return failure(operation, error, status);
    if (data === null || data === undefined) return { ok: false, kind: emptyKind };
    return parseCar(operation, data);
  } catch (error) {
    return failure(operation, error);
  }
}

/** One request for all of a trip's rentals: pickup date, pickup time, then id. */
export async function listCars(tripId: string): Promise<ListCarsResult> {
  if (!UUID.test(tripId)) return NOT_FOUND;
  try {
    const { data, error, status } = await supabase
      .from("trip_cars")
      .select(CAR_COLUMNS)
      .eq("trip_id", tripId)
      .order("pickup_date", { ascending: true })
      .order("pickup_time", { ascending: true })
      .order("id", { ascending: true });
    if (error) return failure("listCars", error, status);
    if (!Array.isArray(data)) return unreadable("listCars");
    const cars: Car[] = [];
    for (const row of data) {
      const parsed = parseCar("listCars", row);
      if (!parsed.ok) return parsed;
      cars.push(parsed.data);
    }
    return { ok: true, data: cars };
  } catch (error) {
    return failure("listCars", error);
  }
}

export function getCar(tripId: string, carId: string): Promise<SingleCarResult> {
  if (!UUID.test(tripId) || !UUID.test(carId)) return Promise.resolve(NOT_FOUND);
  return runSingle(
    "getCar",
    () => supabase.from("trip_cars").select(CAR_COLUMNS).eq("id", carId).eq("trip_id", tripId).maybeSingle(),
    "notFound",
  );
}

/** `toCarWrite` is the ONE form-to-columns mapping: `source` is always `manual`. */
export function createCar(tripId: string, form: CarFormValue): Promise<SingleCarResult> {
  return runSingle(
    "createCar",
    () => supabase.from("trip_cars").insert(toCarWrite(form, tripId)).select(CAR_COLUMNS).maybeSingle(),
    "unknown",
  );
}

/** Full write for one id, scoped to its trip. Zero rows -> `notFound`. */
export function updateCar(tripId: string, carId: string, form: CarFormValue): Promise<SingleCarResult> {
  if (!UUID.test(tripId) || !UUID.test(carId)) return Promise.resolve(NOT_FOUND);
  return runSingle(
    "updateCar",
    () =>
      supabase
        .from("trip_cars")
        .update(toCarWrite(form, tripId))
        .eq("id", carId)
        .eq("trip_id", tripId)
        .select(CAR_COLUMNS)
        .maybeSingle(),
    "notFound",
  );
}

/** Physical delete. Zero rows deleted means it was already gone: `notFound`. */
export async function deleteCar(tripId: string, carId: string): Promise<DeleteCarResult> {
  if (!UUID.test(tripId) || !UUID.test(carId)) return NOT_FOUND;
  try {
    const { data, error, status } = await supabase
      .from("trip_cars")
      .delete()
      .eq("id", carId)
      .eq("trip_id", tripId)
      .select("id")
      .maybeSingle();
    if (error) return failure("deleteCar", error, status);
    if (data === null || data === undefined) return NOT_FOUND;
    return { ok: true, data: { id: carId } };
  } catch (error) {
    return failure("deleteCar", error);
  }
}
