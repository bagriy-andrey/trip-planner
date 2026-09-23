import { findCityById } from "@tripplanner/shared";
import type { Hotel, Trip } from "@tripplanner/shared";

const LISBON = findCityById("city-lisbon");
if (LISBON === undefined) throw new Error("fixture city missing from directory");

export const SIGNED_IN = { session: { user: {} } } as const;

/** A trip WITHOUT a directory city and dates: `userEvent.type` appends to a prefilled field. */
export function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-1",
    destination: "Somewhere",
    place: { kind: "custom" },
    title: null,
    startDate: null,
    endDate: null,
    archivedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export const LISBON_PLACE = {
  kind: "city" as const,
  placeId: "city-lisbon",
  countryCode: "PT",
  timeZone: "Europe/Lisbon",
  airportCode: "LIS",
};

export const HOTEL_ID = "0b0e7d6e-6c1b-4a51-9d4e-3b1c1f6f2a11";

export function makeHotel(overrides: Partial<Hotel> = {}): Hotel {
  return {
    id: HOTEL_ID,
    tripId: "trip-1",
    source: "manual",
    name: "Casa Alfama",
    city: LISBON!,
    timeZone: "Europe/Lisbon",
    address: "Rua 1",
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

// A helper under `__tests__/` is collected by jest, so it carries one tiny test.
describe("hotel-form testKit", () => {
  it("builds a hotel in a known city", () => {
    expect(makeHotel().city.id).toBe("city-lisbon");
  });
});
