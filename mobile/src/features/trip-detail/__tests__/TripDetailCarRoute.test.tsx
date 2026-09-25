// S7 -> S17 -> S16b through the REAL route files and layouts (SPEC-07 AC-31, AC-41); only the backend is faked.
import { fireEvent, renderRouter, screen, waitFor } from "expo-router/testing-library";

import { makeCar } from "@/features/cars/hooks/__tests__/testKit";
import { router } from "expo-router";

import { i18n } from "@/lib/i18n";
import type { Session } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => {
  const auth = {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    startAutoRefresh: jest.fn(() => Promise.resolve()),
    stopAutoRefresh: jest.fn(() => Promise.resolve()),
  };
  return { __esModule: true, supabase: { auth, from: jest.fn() }, __auth: auth };
});
jest.mock("@/features/trips/api", () => ({
  ...jest.requireActual("@/features/trips/api"),
  getTrip: jest.fn(),
}));
jest.mock("@/features/transport/api", () => ({
  ...jest.requireActual("@/features/transport/api"),
  listSegments: jest.fn(),
}));
jest.mock("@/features/hotels/api", () => ({
  ...jest.requireActual("@/features/hotels/api"),
  listHotels: jest.fn(),
}));
jest.mock("@/features/cars/api", () => ({
  ...jest.requireActual("@/features/cars/api"),
  listCars: jest.fn(),
  getCar: jest.fn(),
  deleteCar: jest.fn(),
}));

const auth = (jest.requireMock("@/lib/supabase") as { __auth: { getSession: jest.Mock } }).__auth;
const { getTrip } = jest.requireMock("@/features/trips/api") as { getTrip: jest.Mock };
const { listSegments } = jest.requireMock("@/features/transport/api") as { listSegments: jest.Mock };
const { listHotels } = jest.requireMock("@/features/hotels/api") as { listHotels: jest.Mock };
const { listCars, getCar, deleteCar } = jest.requireMock("@/features/cars/api") as {
  listCars: jest.Mock;
  getCar: jest.Mock;
  deleteCar: jest.Mock;
};

const SESSION = {
  access_token: "a",
  refresh_token: "r",
  token_type: "bearer",
  expires_in: 3600,
  user: {
    id: "user-1",
    aud: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00.000Z",
    email: "a@example.com",
  },
} as Session;

const TRIP = {
  id: "trip-1",
  destination: "Lisbon",
  place: { kind: "custom" },
  title: null,
  startDate: null,
  endDate: null,
  archivedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(async () => {
  jest.clearAllMocks();
  auth.getSession.mockResolvedValue({ data: { session: SESSION }, error: null });
  getTrip.mockResolvedValue({ ok: true, data: TRIP });
  listSegments.mockResolvedValue({ ok: true, data: [] });
  listHotels.mockResolvedValue({ ok: true, data: [] });
  await i18n.changeLanguage("en");
});

describe("S7 car card -> S17 -> S16b (AC-31, AC-41)", () => {
  const car = makeCar({ id: "car-42", tripId: "trip-1", bookingRef: "RES-777" });

  beforeEach(() => {
    listCars.mockResolvedValue({ ok: true, data: [car] });
    getCar.mockResolvedValue({ ok: true, data: car });
    deleteCar.mockResolvedValue({ ok: true, data: { id: "car-42" } });
  });

  it("opens the view of the tapped rental with the id as a route param", async () => {
    const current = renderRouter("./app", { initialUrl: "/trips/trip-1" });
    fireEvent.press(await screen.findByTestId("car-block-car-car-42"));
    await waitFor(() => expect(screen.getByTestId("car-view-booking-ref")).toBeOnTheScreen());
    expect(getCar).toHaveBeenCalledWith("trip-1", "car-42");
    expect(current.getPathname()).toBe("/trips/trip-1/cars/car-42/view");
  });

  it("Edit opens S16b; deleting there lands on S7 with S17 gone from the stack (R-2)", async () => {
    const current = renderRouter("./app", { initialUrl: "/trips/trip-1" });
    fireEvent.press(await screen.findByTestId("car-block-car-car-42"));
    fireEvent.press(await screen.findByTestId("car-view-edit"));
    await waitFor(() => expect(current.getPathname()).toBe("/trips/trip-1/cars/car-42"));
    fireEvent.press(await screen.findByTestId("car-form-delete"));
    fireEvent.press(await screen.findByTestId("car-form-delete-confirm-button"));
    await waitFor(() => expect(deleteCar).toHaveBeenCalledWith("trip-1", "car-42"));
    await waitFor(() => expect(current.getPathname()).toBe("/trips/trip-1"));
    expect(screen.queryByTestId("car-view-screen")).toBeNull();
    // S7 is the only screen left: neither S17 nor S16b remain below it.
    expect(router.canGoBack()).toBe(false);
  });
});
