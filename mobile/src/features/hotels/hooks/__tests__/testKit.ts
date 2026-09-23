import { findCityById } from "@tripplanner/shared";
import type { Hotel } from "@tripplanner/shared";

const LISBON = findCityById("city-lisbon");
if (LISBON === undefined) throw new Error("fixture city missing from directory");

/** A domain hotel for tests; every field can be overridden. */
export function makeHotel(overrides: Partial<Hotel> = {}): Hotel {
  return {
    id: "hotel-1",
    tripId: "trip-7",
    source: "manual",
    name: "Casa Alfama",
    city: LISBON!,
    timeZone: "Europe/Lisbon",
    address: null,
    mapsUrl: null,
    checkInAt: new Date("2026-06-15T14:00:00.000Z"),
    checkOutAt: new Date("2026-06-18T10:00:00.000Z"),
    guests: 2,
    parking: "none",
    breakfast: "none",
    breakfastDays: null,
    cost: null,
    bookingRef: null,
    notes: null,
    ...overrides,
  };
}

// A helper file under `__tests__/` is collected by jest, so it carries one tiny test.
describe("makeHotel", () => {
  it("builds a hotel in a known city by default", () => {
    expect(makeHotel()).toMatchObject({ id: "hotel-1", city: { id: "city-lisbon" } });
  });
});
