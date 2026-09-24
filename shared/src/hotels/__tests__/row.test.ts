import { describe, expect, it } from "vitest";
import type { Tables, TablesInsert } from "../../db/database.types";
import { hotelFromRowSchema, toHotel, toHotelWrite, hotelRowSchema, type HotelWrite } from "../rows";
import { parseHotelForm } from "../schemas";

const goodRow: Tables<"trip_hotels"> = {
  id: "5b1e3c0e-1c3f-4c6e-9a53-3b7f0f8d2a11",
  trip_id: "0d4c1f5a-8b6a-4d0e-b0a3-6a6a1c9d7e22",
  source: "manual",
  name: "Hotel Central",
  city_place_id: "city-porto",
  time_zone: "Europe/Lisbon",
  address: "Rua 1",
  maps_url: null,
  check_in_date: "2026-09-12",
  check_out_date: "2026-09-16",
  check_in_time: "15:00:00",
  check_out_time: null,
  guests: 2,
  parking: "free",
  breakfast: "partial",
  breakfast_days: 2,
  cost_amount: 120.5,
  cost_currency: "EUR",
  booking_ref: "AB12",
  notes: null,
  created_at: "2026-05-01T10:00:00+00:00",
  updated_at: "2026-05-01T10:00:00+00:00",
};

function parse(row: unknown) {
  return hotelFromRowSchema.safeParse(row);
}

describe("hotelFromRowSchema", () => {
  it("rejects a malformed date or time column", () => {
    expect(parse({ ...goodRow, check_in_date: "2026-13-40" }).success).toBe(false);
    expect(parse({ ...goodRow, check_in_time: "25:00:00" }).success).toBe(false);
    expect(parse({ ...goodRow, check_in_time: "3pm" }).success).toBe(false);
  });

  it("accepts a valid row", () => {
    const result = parse(goodRow);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.city.id).toBe("city-porto");
    expect(result.data.cost).toEqual({ amount: "120.50", currency: "EUR" });
    expect(result.data.checkInDate).toBe("2026-09-12");
    expect(result.data.checkInTime).toBe("15:00");
    expect(result.data.checkOutTime).toBeNull();
    expect(result.data.tripId).toBe(goodRow.trip_id);
  });

  it("canonicalises numeric given as number or string", () => {
    const asString = hotelRowSchema.parse({ ...goodRow, cost_amount: "12.5" });
    expect(asString.cost_amount).toBe("12.50");
    const asNumber = hotelRowSchema.parse({ ...goodRow, cost_amount: 12.5 });
    expect(asNumber.cost_amount).toBe("12.50");
  });

  it.each([
    ["unknown city", { city_place_id: "city-nowhere" }],
    ["bad time zone", { time_zone: "Mars/Base" }],
    ["bad breakfast", { breakfast: "some" }],
    ["bad parking", { parking: "valet" }],
    ["bad source", { source: "robot" }],
    ["bad amount", { cost_amount: "abc" }],
    ["amount without currency", { cost_currency: null }],
    ["unknown currency", { cost_currency: "ZZZ" }],
  ])("rejects a corrupt row: %s", (_label, patch) => {
    expect(parse({ ...goodRow, ...patch }).success).toBe(false);
  });

  it("rejects a non-object", () => {
    expect(parse(null).success).toBe(false);
  });
});

describe("toHotelWrite", () => {
  const form = parseHotelForm({
    name: "Hotel Central",
    cityPlaceId: "city-porto",
    checkInDate: "2026-09-12",
    checkInTime: "15:00",
    checkOutDate: "2026-09-16",
    checkOutTime: "11:00",
    breakfast: "partial",
    breakfastDays: 2,
    costAmount: "120,5",
    costCurrency: "eur",
  });

  it("always writes source manual and round-trips", () => {
    if (!form.ok) throw new Error("form invalid");
    const write = toHotelWrite(form.value, goodRow.trip_id);
    expect(write.source).toBe("manual");
    expect(write.cost_amount).toBe(120.5);
    const row: Tables<"trip_hotels"> = {
      ...goodRow,
      ...write,
      cost_amount: write.cost_amount,
    };
    const hotel = toHotel(hotelRowSchema.parse(row));
    expect(hotel.name).toBe(form.value.name);
    expect(hotel.cost).toEqual({ amount: "120.50", currency: "EUR" });
    expect(hotel.checkInDate).toBe(form.value.checkInDate);
    expect(hotel.checkInTime).toBe("15:00");
    expect(write.check_out_time).toBe("11:00");
    expect(hotel.city.id).toBe("city-porto");
  });

  it("is assignable to the generated insert type", () => {
    const assignable = (write: HotelWrite): TablesInsert<"trip_hotels"> => write;
    expect(typeof assignable).toBe("function");
  });
});
