import { describe, expect, it } from "vitest";
import { HOTEL_FIELD_ERROR, isHotelFieldErrorId } from "../errorCodes";
import { parseHotelForm } from "../schemas";

const valid = {
  name: "Hotel Central",
  cityPlaceId: "city-porto",
  checkInDate: "2026-09-12",
  checkInTime: "15:00",
  checkOutDate: "2026-09-16",
  checkOutTime: "11:00",
};

function errors(input: unknown): Record<string, string | undefined> {
  const result = parseHotelForm(input);
  if (result.ok) throw new Error("expected failure");
  return result.fieldErrors;
}

function value(input: unknown) {
  const result = parseHotelForm(input);
  if (!result.ok) throw new Error(`expected success: ${JSON.stringify(result.fieldErrors)}`);
  return result.value;
}

describe("error id contract", () => {
  it("is pinned", () => {
    expect(Object.values(HOTEL_FIELD_ERROR)).toEqual([
      "name.required",
      "name.tooLong",
      "city.required",
      "city.notInDirectory",
      "checkIn.dateRequired",
      "checkIn.timeRequired",
      "checkOut.dateRequired",
      "checkOut.timeRequired",
      "checkOut.notAfterCheckIn",
      "checkOut.stayTooLong",
      "address.tooLong",
      "mapsUrl.notGoogleMaps",
      "mapsUrl.tooLong",
      "guests.range",
      "parking.invalid",
      "breakfast.invalid",
      "breakfastDays.range",
      "cost.amountFormat",
      "cost.amountMissing",
      "cost.currencyMissing",
      "cost.currencyUnknown",
      "bookingRef.tooLong",
      "notes.tooLong",
    ]);
    expect(isHotelFieldErrorId("name.required")).toBe(true);
    expect(isHotelFieldErrorId("x")).toBe(false);
  });
});

describe("parseHotelForm", () => {
  it("empty input reports exactly the six required fields at once", () => {
    expect(errors({})).toEqual({
      name: "name.required",
      city: "city.required",
      checkInDate: "checkIn.dateRequired",
      checkInTime: "checkIn.timeRequired",
      checkOutDate: "checkOut.dateRequired",
      checkOutTime: "checkOut.timeRequired",
    });
    expect(Object.keys(errors(null))).toHaveLength(6);
  });

  it("builds a value with defaults and the zone from the city", () => {
    const v = value(valid);
    expect(v.timeZone).toBe("Europe/Lisbon");
    expect(v.guests).toBe(1);
    expect(v.parking).toBe("none");
    expect(v.breakfast).toBe("none");
    expect(v.breakfastDays).toBeNull();
    expect(v.cost).toBeNull();
    expect(v.address).toBeNull();
    expect(v.checkInAt.toISOString()).toBe("2026-09-12T14:00:00.000Z"); // Lisbon is UTC+1 in September
  });

  it("changing the city changes the UTC instants for the same local fields", () => {
    const a = value(valid).checkInAt.getTime();
    const b = value({ ...valid, cityPlaceId: "city-warsaw" }).checkInAt.getTime();
    expect(a).not.toBe(b);
  });

  it("unknown city and country ids", () => {
    expect(errors({ ...valid, cityPlaceId: "nope" }).city).toBe("city.notInDirectory");
    expect(errors({ ...valid, cityPlaceId: "country-pt" }).city).toBe("city.notInDirectory");
  });

  it("check-out must be after check-in; 365 nights ok, 366 too long", () => {
    expect(errors({ ...valid, checkOutDate: "2026-09-12", checkOutTime: "15:00" }).checkOut).toBe(
      "checkOut.notAfterCheckIn",
    );
    expect(value({ ...valid, checkOutDate: "2027-09-12" })).toBeDefined();
    expect(errors({ ...valid, checkOutDate: "2027-09-13" }).checkOut).toBe("checkOut.stayTooLong");
  });

  it("name and other lengths: boundary and +1 in code points", () => {
    expect(value({ ...valid, name: "a".repeat(120) })).toBeDefined();
    expect(errors({ ...valid, name: "a".repeat(121) }).name).toBe("name.tooLong");
    expect(value({ ...valid, name: "\u{1F600}".repeat(120) })).toBeDefined();
    expect(errors({ ...valid, name: "\u{1F600}".repeat(121) }).name).toBe("name.tooLong");
    expect(value({ ...valid, bookingRef: "b".repeat(32) })).toBeDefined();
    expect(errors({ ...valid, bookingRef: "b".repeat(33) }).bookingRef).toBe("bookingRef.tooLong");
    expect(value({ ...valid, address: "a".repeat(300) })).toBeDefined();
    expect(errors({ ...valid, address: "a".repeat(301) }).address).toBe("address.tooLong");
    expect(value({ ...valid, notes: "n".repeat(1000) })).toBeDefined();
    expect(errors({ ...valid, notes: "n".repeat(1001) }).notes).toBe("notes.tooLong");
  });

  it("multi-line address keeps line breaks; blank after trim becomes null", () => {
    expect(value({ ...valid, address: "  Rua 1\r\n  Porto  " }).address).toBe("Rua 1\n  Porto");
    const v = value({ ...valid, address: "  \n ", notes: " ", bookingRef: " ", mapsUrl: "  " });
    expect(v.address).toBeNull();
    expect(v.notes).toBeNull();
    expect(v.bookingRef).toBeNull();
    expect(v.mapsUrl).toBeNull();
  });

  it("collapses whitespace in single-line fields", () => {
    expect(value({ ...valid, name: "  Hotel   \n Central " }).name).toBe("Hotel Central");
  });

  it("maps link errors land on mapsUrl", () => {
    expect(errors({ ...valid, mapsUrl: "https://evil.tld" }).mapsUrl).toBe("mapsUrl.notGoogleMaps");
    expect(errors({ ...valid, mapsUrl: "https://maps.app.goo.gl/" + "a".repeat(2100) }).mapsUrl).toBe(
      "mapsUrl.tooLong",
    );
    expect(value({ ...valid, mapsUrl: "https://maps.app.goo.gl/x" }).mapsUrl).toBe("https://maps.app.goo.gl/x");
  });

  it("guests, parking, breakfast", () => {
    expect(value({ ...valid, guests: 9 }).guests).toBe(9);
    expect(errors({ ...valid, guests: 0 }).guests).toBe("guests.range");
    expect(errors({ ...valid, guests: 10 }).guests).toBe("guests.range");
    expect(errors({ ...valid, guests: 1.5 }).guests).toBe("guests.range");
    expect(errors({ ...valid, parking: "x" }).parking).toBe("parking.invalid");
    expect(errors({ ...valid, breakfast: "x" }).breakfast).toBe("breakfast.invalid");
  });

  it("breakfast days: partial needs a valid count, others force null", () => {
    expect(errors({ ...valid, breakfast: "partial" }).breakfastDays).toBe("breakfastDays.range");
    expect(value({ ...valid, breakfast: "partial", breakfastDays: 3 }).breakfastDays).toBe(3); // 4 nights: 1..3
    expect(errors({ ...valid, breakfast: "partial", breakfastDays: 4 }).breakfastDays).toBe("breakfastDays.range");
    expect(value({ ...valid, breakfast: "all", breakfastDays: 2 }).breakfastDays).toBeNull();
    expect(value({ ...valid, breakfast: "none", breakfastDays: 2 }).breakfastDays).toBeNull();
  });

  it("cost pairs in both directions", () => {
    expect(value({ ...valid, costAmount: "12,5", costCurrency: " eur " }).cost).toEqual({
      amount: "12.50",
      currency: "EUR",
    });
    expect(errors({ ...valid, costAmount: "12" }).costCurrency).toBe("cost.currencyMissing");
    expect(errors({ ...valid, costCurrency: "EUR" }).costAmount).toBe("cost.amountMissing");
    expect(errors({ ...valid, costAmount: "1e3", costCurrency: "EUR" }).costAmount).toBe("cost.amountFormat");
    expect(errors({ ...valid, costAmount: "5", costCurrency: "XXX" }).costCurrency).toBe("cost.currencyUnknown");
    expect(value({ ...valid, costAmount: " ", costCurrency: " " }).cost).toBeNull();
  });
});
