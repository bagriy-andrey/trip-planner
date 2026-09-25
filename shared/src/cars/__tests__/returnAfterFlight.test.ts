import { describe, expect, it } from "vitest";
import { carReturnAfterFlight } from "../returnAfterFlight";

const WARSAW = "Europe/Warsaw";
const NEW_YORK = "America/New_York";

const flight = (timeZone: string, iso: string) => ({ from: { timeZone }, departureAt: new Date(iso) });

const rental = (returnDate: string, returnTime: string, pickupDate = "2026-08-19", pickupTime = "11:00") => ({
  pickupDate,
  pickupTime,
  returnDate,
  returnTime,
});

describe("carReturnAfterFlight", () => {
  it("warns when the rental is due back after the departure (positive-offset zone)", () => {
    // 10:00 CEST = 08:00Z
    const f = flight(WARSAW, "2026-08-20T08:00:00Z");
    const hit = carReturnAfterFlight(rental("2026-08-20", "11:00"), [f]);
    expect(hit).toEqual({ departureAt: f.departureAt, timeZone: WARSAW });
  });

  it("does not warn when back before, and equal moments give null", () => {
    const f = flight(WARSAW, "2026-08-20T08:00:00Z");
    expect(carReturnAfterFlight(rental("2026-08-20", "09:00"), [f])).toBeNull();
    expect(carReturnAfterFlight(rental("2026-08-20", "10:00"), [f])).toBeNull();
    expect(carReturnAfterFlight(rental("2026-08-20", "10:01"), [f])).not.toBeNull();
  });

  it("works in a negative-offset zone", () => {
    // 10:00 EDT = 14:00Z
    const f = flight(NEW_YORK, "2026-08-20T14:00:00Z");
    expect(carReturnAfterFlight(rental("2026-08-20", "10:00"), [f])).toBeNull();
    expect(carReturnAfterFlight(rental("2026-08-20", "10:01"), [f])).toEqual({
      departureAt: f.departureAt,
      timeZone: NEW_YORK,
    });
  });

  it("handles the DST fall-back day in the return zone", () => {
    // 2026-10-25 Warsaw: 03:00 CEST -> 02:00 CET. Flight at 02:30Z = 03:30 CET.
    const f = flight(WARSAW, "2026-10-25T02:30:00Z");
    const base = ["2026-10-24", "12:00"] as const;
    expect(carReturnAfterFlight(rental("2026-10-25", "03:15", ...base), [f])).toBeNull();
    expect(carReturnAfterFlight(rental("2026-10-25", "03:45", ...base), [f])).not.toBeNull();
    // The repeated 02:30 resolves to its first occurrence (00:30Z), before a 01:00Z flight.
    const early = flight(WARSAW, "2026-10-25T01:00:00Z");
    expect(carReturnAfterFlight(rental("2026-10-25", "02:30", ...base), [early])).toBeNull();
  });

  it("returns null without flights", () => {
    expect(carReturnAfterFlight(rental("2026-08-20", "11:00"), [])).toBeNull();
  });

  it("ignores a flight that departs before pickup", () => {
    const before = flight(WARSAW, "2026-08-19T05:00:00Z");
    expect(carReturnAfterFlight(rental("2026-08-25", "11:00"), [before])).toBeNull();
  });

  it("uses only the nearest flight after pickup", () => {
    const near = flight(WARSAW, "2026-08-22T08:00:00Z");
    const far = flight(WARSAW, "2026-08-30T08:00:00Z");
    // Back on 08-25: after the nearest flight (08-22) -> warning about the nearest one.
    expect(carReturnAfterFlight(rental("2026-08-25", "11:00"), [far, near])?.departureAt).toEqual(
      near.departureAt,
    );
    // Back on 08-21: before the nearest flight, later flights are irrelevant.
    expect(carReturnAfterFlight(rental("2026-08-21", "11:00"), [far, near])).toBeNull();
  });

  it("two rentals in different cities: only the one whose nearest flight is earlier than its return", () => {
    const warsawFlight = flight(WARSAW, "2026-08-20T08:00:00Z");
    const nyFlight = flight(NEW_YORK, "2026-09-10T14:00:00Z");
    const flights = [warsawFlight, nyFlight];
    expect(carReturnAfterFlight(rental("2026-08-20", "18:00"), flights)).not.toBeNull();
    const nyRental = rental("2026-09-10", "08:00", "2026-09-05", "10:00");
    expect(carReturnAfterFlight(nyRental, flights)).toBeNull();
  });

  it("invalid input gives null", () => {
    const f = flight(WARSAW, "2026-08-20T08:00:00Z");
    expect(carReturnAfterFlight(rental("2026-08-20", "25:00"), [f])).toBeNull();
    expect(carReturnAfterFlight(rental("nope", "11:00"), [f])).toBeNull();
    expect(carReturnAfterFlight({ pickupDate: null, pickupTime: null, returnDate: null, returnTime: null }, [f])).toBeNull();
  });
});
