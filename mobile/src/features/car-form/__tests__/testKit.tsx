import { screen, userEvent, waitFor } from "@testing-library/react-native";
import type { Car, Trip } from "@tripplanner/shared";
import { StyleSheet } from "react-native";

import { getProfile } from "@/features/profile/api";
import { getTrip } from "@/features/trips/api";
import { typography } from "@/lib/theme";
import { renderWithProviders } from "@/test-utils/renderWithProviders";
import type { RenderWithProvidersOptions } from "@/test-utils/renderWithProviders";

import { CarFormScreen } from "../CarFormScreen";

/** Test "today" is before the fixtures' 2026-08 rentals, so they are not past days. */
export const TEST_TODAY = "2026-06-01";
export const SIGNED_IN = { session: { user: {} }, today: TEST_TODAY } as const;
export const CAR_ID = "0b0e7d6e-6c1b-4a51-9d4e-3b1c1f6f2a11";

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

export const DATED_TRIP = { startDate: "2026-08-19", endDate: "2026-08-27" } as const;

export function makeCar(overrides: Partial<Car> = {}): Car {
  return {
    id: CAR_ID,
    tripId: "trip-1",
    source: "manual",
    bookingRef: "RES-1",
    company: "Hertz",
    pickupPlace: "Lisbon Airport",
    pickupDate: "2026-08-19",
    pickupTime: "11:00",
    returnDate: "2026-08-27",
    returnTime: "09:30",
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
    ...overrides,
  };
}

export function profileResult(homeCurrency: string | null) {
  return {
    ok: true as const,
    data: { citizenship: null, residence: null, homeCityId: null, homeCityName: null, homeAirport: null, homeCurrency },
  };
}

export async function renderCreate(overrides: Partial<Trip> = {}, options: RenderWithProvidersOptions = SIGNED_IN) {
  (getTrip as jest.Mock).mockResolvedValue({ ok: true, data: makeTrip(overrides) });
  const result = await renderWithProviders(<CarFormScreen tripId="trip-1" />, options);
  await screen.findByTestId("car-form-booking-ref");
  return result;
}

export async function renderEdit(carId: string = CAR_ID, options: RenderWithProvidersOptions = SIGNED_IN) {
  return renderWithProviders(<CarFormScreen tripId="trip-1" carId={carId} />, options);
}

/** Taps an empty time field, confirms the sheet's suggested time with Done and waits for the sheet to leave. */
export async function pickTime(field: "pickup" | "return"): Promise<void> {
  await userEvent.press(screen.getByTestId(`car-form-${field}-time-empty`));
  await userEvent.press(screen.getByTestId("time-sheet-done"));
  await waitFor(() => expect(screen.queryByTestId("time-sheet")).not.toBeOnTheScreen());
}

/** Opens the create form on a dated trip and fills the required fields (the dates come from the trip). */
export async function fillValid(overrides: Partial<Trip> = DATED_TRIP, options: RenderWithProvidersOptions = SIGNED_IN) {
  const result = await renderCreate(overrides, options);
  await userEvent.type(screen.getByTestId("car-form-booking-ref"), "RES-1");
  await userEvent.type(screen.getByTestId("car-form-pickup-place"), "Lisbon Airport");
  await pickTime("pickup");
  await pickTime("return");
  return result;
}

export function fontFamilyOf(element: { props: { style?: unknown } }): unknown {
  return (StyleSheet.flatten(element.props.style as never) as Record<string, unknown>).fontFamily;
}

export const MONO = typography.mono.fontFamily;

/** Default mocks every screen test needs (call from `beforeEach`). */
export function resetProfileMock(homeCurrency: string | null = null): void {
  (getProfile as jest.Mock).mockResolvedValue(profileResult(homeCurrency));
}

// A helper under `__tests__/` is collected by jest, so it carries one tiny test.
describe("car-form testKit", () => {
  it("builds a manual rental", () => {
    expect(makeCar().source).toBe("manual");
  });
});
