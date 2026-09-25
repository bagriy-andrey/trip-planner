import type { Car } from "@tripplanner/shared";

/** A domain rental for tests; every field can be overridden. */
export function makeCar(overrides: Partial<Car> = {}): Car {
  return {
    id: "car-1",
    tripId: "trip-7",
    source: "manual",
    bookingRef: "RES-12345",
    company: "Hertz",
    pickupPlace: "Lisbon Airport",
    pickupDate: "2026-08-19",
    pickupTime: "11:00",
    returnDate: "2026-08-27",
    returnTime: "09:30",
    returnSamePlace: true,
    returnPlace: null,
    mapsUrl: null,
    address: "Secret Street 1",
    phone: "+351123456789",
    carClass: null,
    insurance: "full",
    fuelPolicy: null,
    paymentStatus: "paid",
    money: null,
    extraDriver: false,
    notes: "secret note",
    ...overrides,
  };
}

// A helper file under `__tests__/` is collected by jest, so it carries one tiny test.
describe("makeCar", () => {
  it("builds a manual rental by default", () => {
    expect(makeCar()).toMatchObject({ id: "car-1", source: "manual" });
  });
});
