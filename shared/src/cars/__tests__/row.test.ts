import { describe, expect, it } from "vitest";
import type { Tables, TablesInsert } from "../../db/database.types";
import { carFromRowSchema, carRowSchema, toCar, toCarWrite, type CarWrite } from "../rows";
import { parseCarForm } from "../schemas";

const goodRow: Tables<"trip_cars"> = {
  id: "5b1e3c0e-1c3f-4c6e-9a53-3b7f0f8d2a11",
  trip_id: "0d4c1f5a-8b6a-4d0e-b0a3-6a6a1c9d7e22",
  source: "manual",
  booking_ref: "AB12",
  company: "Sixt",
  pickup_place: "Porto airport",
  pickup_date: "2026-09-12",
  pickup_time: "11:00:00",
  return_date: "2026-09-16",
  return_time: "09:30:00",
  return_same_place: true,
  return_place: null,
  maps_url: null,
  address: null,
  phone: "+351 308 810 777",
  car_class: null,
  insurance: "excess",
  fuel_policy: null,
  cost_amount: 383.3,
  cost_currency: "EUR",
  payment_status: "paid",
  extra_driver: false,
  deposit_amount: 800,
  notes: null,
  created_at: "2026-05-01T10:00:00+00:00",
  updated_at: "2026-05-01T10:00:00+00:00",
};

const parse = (row: unknown) => carFromRowSchema.safeParse(row);

describe("carFromRowSchema", () => {
  it("maps a good row, normalising times and money", () => {
    const r = parse(goodRow);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.pickupTime).toBe("11:00");
    expect(r.data.returnTime).toBe("09:30");
    expect(r.data.money).toEqual({ currency: "EUR", cost: "383.30", deposit: "800.00" });
    expect(r.data.tripId).toBe(goodRow.trip_id);
  });

  it("accepts numeric as a string", () => {
    const r = parse({ ...goodRow, cost_amount: "383.3" });
    expect(r.success && r.data.money?.cost).toBe("383.30");
  });

  it("accepts a deposit-only rental with a currency", () => {
    const r = parse({ ...goodRow, cost_amount: null });
    expect(r.success && r.data.money).toEqual({ currency: "EUR", cost: null, deposit: "800.00" });
  });

  it("rejects corrupt rows", () => {
    expect(parse({ ...goodRow, pickup_time: "25:00:00" }).success).toBe(false);
    expect(parse({ ...goodRow, return_date: "2026-13-40" }).success).toBe(false);
    expect(parse({ ...goodRow, insurance: "partial" }).success).toBe(false);
    expect(parse({ ...goodRow, source: "other" }).success).toBe(false);
    expect(parse({ ...goodRow, cost_amount: null, deposit_amount: null }).success).toBe(false);
    expect(parse({ ...goodRow, cost_currency: null }).success).toBe(false);
    expect(parse({ ...goodRow, cost_currency: "XXX" }).success).toBe(false);
    expect(parse({ ...goodRow, return_place: "Faro" }).success).toBe(false);
    expect(parse({ ...goodRow, return_same_place: false }).success).toBe(false);
    expect(parse(null).success).toBe(false);
  });
});

describe("toCarWrite", () => {
  const form = parseCarForm({
    bookingRef: "AB12",
    pickupPlace: "Porto airport",
    pickupDate: "2026-09-12",
    returnDate: "2026-09-16",
    pickupTime: "11:00",
    returnTime: "09:30",
    returnSamePlace: false,
    returnPlace: "Faro",
    costAmount: "383.3",
    costCurrency: "eur",
    depositAmount: "800",
    phone: "+351 308 810 777",
  });

  it("round-trips write -> row -> car", () => {
    expect(form.ok).toBe(true);
    if (!form.ok) return;
    const write = toCarWrite(form.value, goodRow.trip_id);
    expect(write.source).toBe("manual");
    expect(write.cost_amount).toBe(383.3);
    expect(write.deposit_amount).toBe(800);
    const insert: TablesInsert<"trip_cars"> = write;
    expect(insert.trip_id).toBe(goodRow.trip_id);
    const row = carRowSchema.parse({
      ...write,
      id: goodRow.id,
      pickup_time: `${write.pickup_time}:00`,
      return_time: `${write.return_time}:00`,
      created_at: goodRow.created_at,
      updated_at: goodRow.updated_at,
    });
    expect(toCar(row)).toEqual({ ...form.value, id: goodRow.id, tripId: goodRow.trip_id, source: "manual" });
  });

  it("writes all three money columns as null without money", () => {
    const f = parseCarForm({
      bookingRef: "X",
      pickupPlace: "P",
      pickupDate: "2026-09-12",
      returnDate: "2026-09-13",
      pickupTime: "10:00",
      returnTime: "10:00",
    });
    if (!f.ok) throw new Error("form should be valid");
    const w: CarWrite = toCarWrite(f.value, goodRow.trip_id);
    expect([w.cost_amount, w.cost_currency, w.deposit_amount]).toEqual([null, null, null]);
    expect(w.return_same_place).toBe(true);
    expect(w.return_place).toBeNull();
  });
});
