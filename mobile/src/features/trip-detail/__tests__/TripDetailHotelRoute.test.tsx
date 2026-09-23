// S7 -> S14b through the REAL route files and layouts (SPEC-05 AC-37); only the backend is faked.
import { fireEvent, renderRouter, screen, waitFor } from "expo-router/testing-library";

import { makeHotel } from "@/features/hotels/hooks/__tests__/testKit";
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
  getHotel: jest.fn(),
}));

const auth = (jest.requireMock("@/lib/supabase") as { __auth: { getSession: jest.Mock } }).__auth;
const { getTrip } = jest.requireMock("@/features/trips/api") as { getTrip: jest.Mock };
const { listSegments } = jest.requireMock("@/features/transport/api") as { listSegments: jest.Mock };
const { listHotels, getHotel } = jest.requireMock("@/features/hotels/api") as {
  listHotels: jest.Mock;
  getHotel: jest.Mock;
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
  await i18n.changeLanguage("en");
});

describe("S7 hotel card -> S14b (AC-37)", () => {
  it("opens the edit form of the tapped hotel with the id as a route param", async () => {
    const hotel = makeHotel({ id: "hotel-42", tripId: "trip-1", name: "Casa Alfama" });
    listHotels.mockResolvedValue({ ok: true, data: [hotel] });
    getHotel.mockResolvedValue({ ok: true, data: hotel });

    const current = renderRouter("./app", { initialUrl: "/trips/trip-1" });
    fireEvent.press(await screen.findByTestId("hotel-block-hotel-hotel-42"));

    await waitFor(() => expect(screen.getByTestId("hotel-form-name")).toBeOnTheScreen());
    expect(getHotel).toHaveBeenCalledWith("trip-1", "hotel-42");
    expect(current.getPathname()).toBe("/trips/trip-1/hotels/hotel-42");
  });
});
