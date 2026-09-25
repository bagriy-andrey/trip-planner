import { describe, expect, it } from "vitest";
import { CAR_FIELD_ERROR, isCarFieldErrorId } from "../errorCodes";
import { parseCarForm, type CarFormInput } from "../schemas";

const valid: CarFormInput = {
  bookingRef: "AB12",
  pickupPlace: "Faro airport",
  pickupDate: "2026-08-19",
  returnDate: "2026-08-27",
  pickupTime: "11:00",
  returnTime: "05:00",
};

function errorsOf(input: unknown): Record<string, string | undefined> {
  const result = parseCarForm(input);
  if (result.ok) throw new Error("expected failure");
  return result.fieldErrors;
}

function valueOf(input: CarFormInput) {
  const result = parseCarForm(input);
  if (!result.ok) throw new Error(`expected success: ${JSON.stringify(result.fieldErrors)}`);
  return result.value;
}

describe("CAR_FIELD_ERROR", () => {
  it("pins the literal id list", () => {
    expect(Object.values(CAR_FIELD_ERROR).sort()).toEqual(
      [
        "bookingRef.required",
        "bookingRef.tooLong",
        "company.tooLong",
        "pickupPlace.required",
        "pickupPlace.tooLong",
        "dates.required",
        "dates.tooLong",
        "pickupTime.required",
        "returnTime.required",
        "return.notAfterPickup",
        "returnPlace.required",
        "returnPlace.tooLong",
        "mapsUrl.notGoogleMaps",
        "mapsUrl.tooLong",
        "address.tooLong",
        "phone.invalid",
        "carClass.tooLong",
        "insurance.invalid",
        "fuelPolicy.invalid",
        "paymentStatus.invalid",
        "extraDriver.invalid",
        "returnSamePlace.invalid",
        "cost.amountFormat",
        "deposit.amountFormat",
        "cost.currencyMissing",
        "cost.currencyUnknown",
        "notes.tooLong",
      ].sort(),
    );
    expect(isCarFieldErrorId("phone.invalid")).toBe(true);
    expect(isCarFieldErrorId("nope")).toBe(false);
  });
});

describe("parseCarForm", () => {
  it("an empty form gives exactly five errors (AC-21)", () => {
    expect(errorsOf({})).toEqual({
      bookingRef: "bookingRef.required",
      pickupPlace: "pickupPlace.required",
      dates: "dates.required",
      pickupTime: "pickupTime.required",
      returnTime: "returnTime.required",
    });
  });

  it("a minimal valid form has defaults and nulls", () => {
    expect(valueOf(valid)).toEqual({
      bookingRef: "AB12",
      company: null,
      pickupPlace: "Faro airport",
      pickupDate: "2026-08-19",
      returnDate: "2026-08-27",
      pickupTime: "11:00",
      returnTime: "05:00",
      returnSamePlace: true,
      returnPlace: null,
      mapsUrl: null,
      address: null,
      phone: null,
      carClass: null,
      insurance: null,
      fuelPolicy: null,
      paymentStatus: null,
      money: null,
      extraDriver: false,
      notes: null,
    });
  });

  it("return place: same place drops the input, different requires it", () => {
    expect(valueOf({ ...valid, returnSamePlace: true, returnPlace: "Lisbon" }).returnPlace).toBeNull();
    expect(errorsOf({ ...valid, returnSamePlace: false })).toEqual({ returnPlace: "returnPlace.required" });
    expect(valueOf({ ...valid, returnSamePlace: false, returnPlace: "Lisbon\r\nT2" }).returnPlace).toBe(
      "Lisbon\nT2",
    );
    expect(errorsOf({ ...valid, returnSamePlace: "no" })).toEqual({ returnSamePlace: "returnSamePlace.invalid" });
  });

  it("date and time order (AC-22)", () => {
    const same = { ...valid, returnDate: "2026-08-19" };
    expect(errorsOf({ ...same, returnTime: "11:00" })).toEqual({ return: "return.notAfterPickup" });
    expect(errorsOf({ ...same, returnTime: "10:59" })).toEqual({ return: "return.notAfterPickup" });
    expect(valueOf({ ...same, returnTime: "11:01" }).returnTime).toBe("11:01");
    expect(valueOf(valid).returnTime).toBe("05:00");
    expect(errorsOf({ ...valid, returnDate: "2026-08-18" })).toEqual({ return: "return.notAfterPickup" });
  });

  it("caps the rental at 365 days", () => {
    expect(valueOf({ ...valid, pickupDate: "2026-08-19", returnDate: "2027-08-19" }).returnDate).toBe(
      "2027-08-19",
    );
    expect(errorsOf({ ...valid, pickupDate: "2026-08-19", returnDate: "2027-08-20" })).toEqual({
      dates: "dates.tooLong",
    });
  });

  it("missing or malformed dates and times", () => {
    expect(errorsOf({ ...valid, returnDate: "" })).toEqual({ dates: "dates.required" });
    expect(errorsOf({ ...valid, pickupDate: "2026-02-31" })).toEqual({ dates: "dates.required" });
    expect(errorsOf({ ...valid, pickupTime: "25:00", returnTime: "x" })).toEqual({
      pickupTime: "pickupTime.required",
      returnTime: "returnTime.required",
    });
  });

  it("lengths count code points (emoji = 1), over the limit is an error, not a cut", () => {
    const car = "\u{1F697}";
    expect(valueOf({ ...valid, bookingRef: car.repeat(32) }).bookingRef).toBe(car.repeat(32));
    expect(errorsOf({ ...valid, bookingRef: car.repeat(33) })).toEqual({ bookingRef: "bookingRef.tooLong" });
    expect(errorsOf({ ...valid, company: car.repeat(121) })).toEqual({ company: "company.tooLong" });
    expect(errorsOf({ ...valid, pickupPlace: car.repeat(301) })).toEqual({ pickupPlace: "pickupPlace.tooLong" });
    expect(errorsOf({ ...valid, carClass: car.repeat(121) })).toEqual({ carClass: "carClass.tooLong" });
    expect(errorsOf({ ...valid, address: car.repeat(301) })).toEqual({ address: "address.tooLong" });
    expect(errorsOf({ ...valid, notes: car.repeat(1001) })).toEqual({ notes: "notes.tooLong" });
    expect(errorsOf({ ...valid, returnSamePlace: false, returnPlace: car.repeat(301) })).toEqual({
      returnPlace: "returnPlace.tooLong",
    });
    expect(valueOf({ ...valid, notes: car.repeat(1000) }).notes).toBe(car.repeat(1000));
  });

  it("multi-line fields keep line breaks, single-line fields collapse", () => {
    const value = valueOf({ ...valid, notes: "a\nb", address: "x\r\ny", company: " Sixt \n Faro " });
    expect(value.notes).toBe("a\nb");
    expect(value.address).toBe("x\ny");
    expect(value.company).toBe("Sixt Faro");
  });

  it("maps link and phone", () => {
    expect(valueOf({ ...valid, mapsUrl: "https://maps.app.goo.gl/abc" }).mapsUrl).toBe(
      "https://maps.app.goo.gl/abc",
    );
    expect(errorsOf({ ...valid, mapsUrl: "http://maps.google.com/x" })).toEqual({
      mapsUrl: "mapsUrl.notGoogleMaps",
    });
    expect(errorsOf({ ...valid, mapsUrl: `https://maps.app.goo.gl/${"a".repeat(2100)}` })).toEqual({
      mapsUrl: "mapsUrl.tooLong",
    });
    expect(valueOf({ ...valid, phone: "+351 308 810 777" }).phone).toBe("+351 308 810 777");
    expect(errorsOf({ ...valid, phone: "12" })).toEqual({ phone: "phone.invalid" });
  });

  it("enums: null is unset, garbage is invalid", () => {
    const value = valueOf({ ...valid, insurance: null, fuelPolicy: "full_full", paymentStatus: "on_site" });
    expect(value.insurance).toBeNull();
    expect(value.fuelPolicy).toBe("full_full");
    expect(value.paymentStatus).toBe("on_site");
    expect(errorsOf({ ...valid, insurance: "partial", fuelPolicy: "x", paymentStatus: "y", extraDriver: "yes" })).toEqual({
      insurance: "insurance.invalid",
      fuelPolicy: "fuelPolicy.invalid",
      paymentStatus: "paymentStatus.invalid",
      extraDriver: "extraDriver.invalid",
    });
    expect(valueOf({ ...valid, extraDriver: true }).extraDriver).toBe(true);
  });

  it("money: deposit alone with a currency is fine", () => {
    const value = valueOf({ ...valid, depositAmount: "500", costCurrency: "eur" });
    expect(value.money).toEqual({ currency: "EUR", cost: null, deposit: "500.00" });
  });

  it("money: both amounts", () => {
    expect(valueOf({ ...valid, costAmount: "383.3", depositAmount: "1000", costCurrency: "EUR" }).money).toEqual({
      currency: "EUR",
      cost: "383.30",
      deposit: "1000.00",
    });
  });

  it("money: a currency without any amount is dropped without an error", () => {
    expect(valueOf({ ...valid, costCurrency: "EUR" }).money).toBeNull();
    expect(valueOf({ ...valid, costCurrency: "zzz" }).money).toBeNull();
  });

  it("money: amounts without a currency, unknown currency, bad amounts", () => {
    expect(errorsOf({ ...valid, costAmount: "10" })).toEqual({ costCurrency: "cost.currencyMissing" });
    expect(errorsOf({ ...valid, depositAmount: "10" })).toEqual({ costCurrency: "cost.currencyMissing" });
    expect(errorsOf({ ...valid, costAmount: "10", costCurrency: "xxx" })).toEqual({
      costCurrency: "cost.currencyUnknown",
    });
    expect(errorsOf({ ...valid, costAmount: "12.345", depositAmount: "1.234", costCurrency: "EUR" })).toEqual({
      costAmount: "cost.amountFormat",
      depositAmount: "deposit.amountFormat",
    });
  });

  it("non-object input is a form with every field missing", () => {
    expect(Object.keys(errorsOf(null))).toHaveLength(5);
  });
});
