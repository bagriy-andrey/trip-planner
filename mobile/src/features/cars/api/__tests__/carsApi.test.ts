import { parseCarForm } from "@tripplanner/shared";
import type { CarFormValue } from "@tripplanner/shared";

import { supabase } from "@/lib/supabase";

import { createCar, deleteCar, getCar, listCars, updateCar } from "../carsApi";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));

const from = supabase.from as unknown as jest.Mock;

const TRIP_ID = "0d4c1f5a-8b6a-4d0e-b0a3-6a6a1c9d7e22";
const CAR_ID = "5b1e3c0e-1c3f-4c6e-9a53-3b7f0f8d2a11";

const goodRow = {
  id: CAR_ID,
  trip_id: TRIP_ID,
  source: "manual",
  booking_ref: "RES-1",
  company: "Hertz",
  pickup_place: "Lisbon Airport",
  pickup_date: "2026-08-19",
  pickup_time: "11:00:00",
  return_date: "2026-08-27",
  return_time: "09:30:00",
  return_same_place: true,
  return_place: null,
  maps_url: null,
  address: null,
  phone: null,
  car_class: null,
  insurance: null,
  fuel_policy: null,
  cost_amount: null,
  cost_currency: null,
  payment_status: null,
  extra_driver: false,
  deposit_amount: null,
  notes: null,
  created_at: "2026-05-01T10:00:00+00:00",
  updated_at: "2026-05-01T10:00:00+00:00",
};

function formOf(): CarFormValue {
  const parsed = parseCarForm({
    bookingRef: "RES-1",
    pickupPlace: "Lisbon Airport",
    pickupDate: "2026-08-19",
    pickupTime: "11:00",
    returnDate: "2026-08-27",
    returnTime: "09:30",
    returnSamePlace: true,
  } as never);
  if (!parsed.ok) throw new Error("fixture form invalid");
  return parsed.value;
}

/** A chainable, awaitable query builder that records calls and resolves to `result`. */
function builder(result: unknown) {
  const calls: { method: string; args: unknown[] }[] = [];
  const proxy: Record<string, unknown> = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === "then") {
          return (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
        }
        return (...args: unknown[]) => {
          calls.push({ method: prop, args });
          return proxy;
        };
      },
    },
  );
  return { proxy, calls };
}

beforeEach(() => from.mockReset());

describe("carsApi", () => {
  it("listCars orders by pickup_date, pickup_time, id and parses rows", async () => {
    const b = builder({ data: [goodRow], error: null });
    from.mockReturnValue(b.proxy);
    const result = await listCars(TRIP_ID);
    expect(result).toMatchObject({ ok: true, data: [{ id: CAR_ID, pickupTime: "11:00" }] });
    expect(from).toHaveBeenCalledWith("trip_cars");
    expect(b.calls.filter((c) => c.method === "order").map((c) => c.args[0])).toEqual([
      "pickup_date",
      "pickup_time",
      "id",
    ]);
  });

  it("a corrupt row fails the whole list", async () => {
    from.mockReturnValue(builder({ data: [goodRow, { ...goodRow, pickup_time: "bad" }], error: null }).proxy);
    expect(await listCars(TRIP_ID)).toEqual({ ok: false, kind: "unknown" });
  });

  it("non-UUID ids are notFound without a request", async () => {
    expect(await listCars("trip-7")).toEqual({ ok: false, kind: "notFound" });
    expect(await getCar(TRIP_ID, "car-1")).toEqual({ ok: false, kind: "notFound" });
    expect(await updateCar(TRIP_ID, "x", formOf())).toEqual({ ok: false, kind: "notFound" });
    expect(await deleteCar("x", CAR_ID)).toEqual({ ok: false, kind: "notFound" });
    expect(from).not.toHaveBeenCalled();
  });

  it("zero rows is notFound for get, update and delete", async () => {
    from.mockReturnValue(builder({ data: null, error: null }).proxy);
    expect(await getCar(TRIP_ID, CAR_ID)).toEqual({ ok: false, kind: "notFound" });
    expect(await updateCar(TRIP_ID, CAR_ID, formOf())).toEqual({ ok: false, kind: "notFound" });
    expect(await deleteCar(TRIP_ID, CAR_ID)).toEqual({ ok: false, kind: "notFound" });
  });

  it("createCar inserts source manual (AC-33)", async () => {
    const b = builder({ data: goodRow, error: null });
    from.mockReturnValue(b.proxy);
    const result = await createCar(TRIP_ID, formOf());
    expect(result.ok).toBe(true);
    const insert = b.calls.find((c) => c.method === "insert");
    expect(insert?.args[0]).toMatchObject({ source: "manual", trip_id: TRIP_ID });
  });

  it("delete returns the id; a request error is classified, never thrown", async () => {
    from.mockReturnValue(builder({ data: { id: CAR_ID }, error: null }).proxy);
    expect(await deleteCar(TRIP_ID, CAR_ID)).toEqual({ ok: true, data: { id: CAR_ID } });
    from.mockReturnValue(builder({ data: null, error: { message: "boom" }, status: 500 }).proxy);
    const failed = await getCar(TRIP_ID, CAR_ID);
    expect(failed.ok).toBe(false);
  });
});
