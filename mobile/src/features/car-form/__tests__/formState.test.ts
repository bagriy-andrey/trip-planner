import { carDateFloor, carFormEquals, carFormFromCar, carFormFromTrip, EMPTY_CAR_FORM, moreInitiallyOpen, toCarFormInput } from "../hooks/formState";
import { makeCar, makeTrip } from "./testKit";

describe("carFormFromTrip (AC-11)", () => {
  it("takes the trip's dates, leaves times empty, same place on, home currency", () => {
    const state = carFormFromTrip(makeTrip({ startDate: "2026-08-19", endDate: "2026-08-27" }), "2026-06-01", "EUR");
    expect(state).toMatchObject({
      pickupDate: "2026-08-19",
      returnDate: "2026-08-27",
      pickupTime: null,
      returnTime: null,
      returnSamePlace: true,
      costCurrency: "EUR",
    });
  });

  it("clamps a started trip's start to today", () => {
    const state = carFormFromTrip(makeTrip({ startDate: "2026-05-20", endDate: "2026-08-27" }), "2026-06-01", null);
    expect(state.pickupDate).toBe("2026-06-01");
    expect(state.costCurrency).toBe("");
  });

  it("leaves the range empty for an ended trip and for a trip without dates", () => {
    const ended = carFormFromTrip(makeTrip({ startDate: "2026-05-01", endDate: "2026-05-10" }), "2026-06-01", null);
    expect([ended.pickupDate, ended.returnDate]).toEqual([null, null]);
    const undated = carFormFromTrip(makeTrip(), "2026-06-01", null);
    expect([undated.pickupDate, undated.returnDate]).toEqual([null, null]);
  });
});

describe("carFormFromCar / toCarFormInput", () => {
  it("shows the stored values as they are", () => {
    const state = carFormFromCar(
      makeCar({ money: { currency: "EUR", cost: "383.35", deposit: "300.00" }, returnSamePlace: false, returnPlace: "Faro" }),
    );
    expect(state).toMatchObject({ costAmount: "383.35", depositAmount: "300.00", costCurrency: "EUR", returnPlace: "Faro" });
  });

  it("always passes the return place (the schema nulls it for same place, AC-24)", () => {
    const input = toCarFormInput({ ...EMPTY_CAR_FORM, returnSamePlace: true, returnPlace: "Faro", mapsUrlText: "typed" });
    expect(input).toMatchObject({ returnPlace: "Faro", returnSamePlace: true, mapsUrl: "typed" });
    expect(input).not.toHaveProperty("mapsUrlText");
  });
});

describe("moreInitiallyOpen (AC-14)", () => {
  it("is open only when extra driver, deposit or notes hold something", () => {
    expect(moreInitiallyOpen(EMPTY_CAR_FORM)).toBe(false);
    expect(moreInitiallyOpen({ ...EMPTY_CAR_FORM, extraDriver: true })).toBe(true);
    expect(moreInitiallyOpen({ ...EMPTY_CAR_FORM, depositAmount: "1" })).toBe(true);
    expect(moreInitiallyOpen({ ...EMPTY_CAR_FORM, notes: "n" })).toBe(true);
  });
});

describe("carDateFloor (AC-19)", () => {
  it("is today on create and min(today, stored pick-up) on edit", () => {
    expect(carDateFloor("create", "2026-06-01", "2026-01-01")).toBe("2026-06-01");
    expect(carDateFloor("edit", "2026-06-01", "2026-01-01")).toBe("2026-01-01");
    expect(carDateFloor("edit", "2026-06-01", "2026-08-01")).toBe("2026-06-01");
    expect(carDateFloor("edit", "2026-06-01", null)).toBe("2026-06-01");
  });
});

describe("carFormEquals", () => {
  it("compares every field", () => {
    expect(carFormEquals(EMPTY_CAR_FORM, { ...EMPTY_CAR_FORM })).toBe(true);
    expect(carFormEquals(EMPTY_CAR_FORM, { ...EMPTY_CAR_FORM, returnPlace: "x" })).toBe(false);
  });
});
