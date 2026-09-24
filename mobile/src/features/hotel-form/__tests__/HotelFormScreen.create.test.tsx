import { screen, userEvent, waitFor } from "@testing-library/react-native";
import type { Trip } from "@tripplanner/shared";

import { createHotel } from "@/features/hotels/api";
import { getTrip } from "@/features/trips/api";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { HotelFormScreen } from "../HotelFormScreen";
import { LISBON_PLACE, SIGNED_IN, makeHotel, makeTrip } from "./testKit";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("@/features/trips/api", () => ({ ...jest.requireActual("@/features/trips/api"), getTrip: jest.fn() }));
jest.mock("@/features/hotels/api", () => ({
  ...jest.requireActual("@/features/hotels/api"),
  createHotel: jest.fn(),
}));

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn(), dismissAll: jest.fn() };
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useNavigation: () => ({ addListener: () => () => undefined }),
}));

const getTripMock = getTrip as jest.Mock;
const createHotelMock = createHotel as jest.Mock;

const CITY_TRIP = { place: LISBON_PLACE, startDate: "2026-06-15", endDate: "2026-06-20" } as const;

beforeEach(() => {
  jest.clearAllMocks();
  createHotelMock.mockResolvedValue({ ok: true, data: makeHotel() });
});

async function renderCreate(overrides: Partial<Trip> = {}) {
  getTripMock.mockResolvedValue({ ok: true, data: makeTrip(overrides) });
  await renderWithProviders(<HotelFormScreen tripId="trip-1" />, SIGNED_IN);
  await screen.findByTestId("hotel-form-name");
}

const saveButton = () => screen.getByRole("button", { name: "Save" });

describe("HotelFormScreen create — layout (AC-8, AC-9)", () => {
  it("renders the fields in the design order", async () => {
    await renderCreate();
    const json = JSON.stringify(screen.toJSON());
    const order = [
      "hotel-form-name",
      "hotel-form-city",
      "hotel-form-address",
      "hotel-form-maps",
      "hotel-form-dates",
      "hotel-form-check-in-time",
      "hotel-form-check-out-time",
      "hotel-form-stay",
      "hotel-form-breakfast",
      "hotel-form-cost",
      "hotel-form-booking-ref",
      "hotel-form-notes",
    ];
    const positions = order.map((id) => json.indexOf(`"${id}"`));
    positions.forEach((position) => expect(position).toBeGreaterThan(-1));
    for (let i = 1; i < positions.length; i++) expect(positions[i]).toBeGreaterThan(positions[i - 1]!);
  });

  it("has a cancel cross, the title and Save; no Done and no save-and-next", async () => {
    await renderCreate();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Hotel" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Done" })).not.toBeOnTheScreen();
    expect(screen.queryByText(/add next/i)).not.toBeOnTheScreen();
    expect(screen.queryByTestId("hotel-form-delete")).not.toBeOnTheScreen();
  });
});

describe("HotelFormScreen create — prefill (AC-10, AC-11)", () => {
  it("takes the city and the trip's dates as one range; times stay empty; shows the nights", async () => {
    await renderCreate(CITY_TRIP);
    expect(screen.getByTestId("hotel-form-city").props.value).toBe("Lisbon");
    expect(screen.getByText("5 nights — calculated from dates")).toBeOnTheScreen();
    expect(screen.queryByTestId("hotel-form-check-in-time-clear")).not.toBeOnTheScreen();
    expect(screen.getByTestId("hotel-form-dates-field").props.accessibilityLabel).toMatch(/Jun 15.*20, 2026/);
  });

  it("leaves the city empty and shows no nights line for a trip without city or dates", async () => {
    await renderCreate();
    expect(screen.getByTestId("hotel-form-city").props.value).toBe("");
    expect(screen.queryByText(/calculated from dates/)).not.toBeOnTheScreen();
  });
});

describe("HotelFormScreen create — city only from the directory (AC-12)", () => {
  it("rejects typed text that was never picked, accepts a tapped suggestion", async () => {
    await renderCreate();
    await userEvent.type(screen.getByTestId("hotel-form-city"), "Lisb");
    await userEvent.press(saveButton());
    expect(screen.getByText("Choose a city from the list")).toBeOnTheScreen();

    await userEvent.press(await screen.findByTestId("city-suggestion-city-lisbon"));
    expect(screen.getByTestId("hotel-form-city").props.value).toBe("Lisbon");
    expect(screen.queryByText("Choose a city from the list")).not.toBeOnTheScreen();
  });
});

describe("HotelFormScreen create — dates range and optional times", () => {
  it("keeps the times empty by default and clears a picked time with the cross", async () => {
    await renderCreate();
    expect(screen.getByTestId("hotel-form-check-in-time-empty").props.accessibilityLabel).toBe("Check-in time");
    await userEvent.press(screen.getByTestId("hotel-form-check-in-time-empty"));
    await userEvent.press(screen.getByTestId("hotel-form-check-out-time-empty"));
    expect(screen.getByTestId("hotel-form-check-in-time-picker").props.accessibilityLabel).toContain("15:00");
    expect(screen.getByTestId("hotel-form-check-out-time-picker").props.accessibilityLabel).toContain("11:00");
    await userEvent.press(screen.getByTestId("hotel-form-check-in-time-clear"));
    expect(screen.queryByTestId("hotel-form-check-in-time-clear")).not.toBeOnTheScreen();
    expect(screen.getByTestId("hotel-form-check-out-time-clear")).toBeOnTheScreen();
  });

  it("picks a range in the inline calendar: from, then to; the range is highlighted", async () => {
    await renderCreate({ startDate: "2026-06-15", endDate: "2026-06-20" });
    await userEvent.press(screen.getByTestId("hotel-form-dates-field"));
    const day = (d: string) => screen.getByTestId(`hotel-form-dates-calendar-day-${d}`);
    expect(day("2026-06-17").props.accessibilityState).toMatchObject({ selected: true });
    await userEvent.press(day("2026-06-10"));
    await userEvent.press(day("2026-06-12"));
    expect(screen.queryByTestId("hotel-form-dates-calendar")).not.toBeOnTheScreen();
    expect(screen.getByTestId("hotel-form-dates-field").props.accessibilityLabel).toMatch(/Jun 10.*12, 2026/);
    expect(screen.getByText("2 nights — calculated from dates")).toBeOnTheScreen();
  });

  it("allows a same-day range (no nights line)", async () => {
    await renderCreate({ startDate: "2026-06-15", endDate: "2026-06-20" });
    await userEvent.press(screen.getByTestId("hotel-form-dates-field"));
    await userEvent.press(screen.getByTestId("hotel-form-dates-calendar-day-2026-06-11"));
    await userEvent.press(screen.getByTestId("hotel-form-dates-calendar-day-2026-06-11"));
    expect(screen.getByTestId("hotel-form-dates-field").props.accessibilityLabel).toContain("Jun 11, 2026");
    expect(screen.queryByText(/calculated from dates/)).not.toBeOnTheScreen();
  });
});

describe("HotelFormScreen create — Save (AC-29, AC-34, AC-40)", () => {
  async function fillValid() {
    await renderCreate(CITY_TRIP);
    await userEvent.type(screen.getByTestId("hotel-form-name"), "Casa Alfama");
    await userEvent.press(screen.getByTestId("hotel-form-check-in-time-empty"));
    await userEvent.press(screen.getByTestId("hotel-form-check-out-time-empty"));
  }

  it("saves calendar dates and wall-clock times as typed (no instants), then closes the form", async () => {
    await fillValid();
    await userEvent.press(saveButton());
    await waitFor(() => expect(createHotelMock).toHaveBeenCalledTimes(1));
    const [tripId, form] = createHotelMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(tripId).toBe("trip-1");
    expect(form).toMatchObject({
      name: "Casa Alfama",
      timeZone: "Europe/Lisbon",
      guests: 1,
      parking: "none",
      breakfast: "none",
      checkInDate: "2026-06-15",
      checkOutDate: "2026-06-20",
      checkInTime: "15:00",
      checkOutTime: "11:00",
    });
    expect(form).not.toHaveProperty("checkInAt");
    expect(form).not.toHaveProperty("source");
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
  });

  it("saves without any time: both stay null", async () => {
    await renderCreate(CITY_TRIP);
    await userEvent.type(screen.getByTestId("hotel-form-name"), "Casa");
    await userEvent.press(saveButton());
    await waitFor(() => expect(createHotelMock).toHaveBeenCalledTimes(1));
    expect(createHotelMock.mock.calls[0]?.[1]).toMatchObject({ checkInTime: null, checkOutTime: null });
  });

  it("shows every error at once after the first attempt and sends nothing", async () => {
    await renderCreate();
    await userEvent.press(saveButton());
    expect(screen.getByText("Enter a name")).toBeOnTheScreen();
    expect(screen.getByText("Choose a city")).toBeOnTheScreen();
    expect(screen.getByText("Enter a check-in date")).toBeOnTheScreen();
    expect(screen.getByText("Enter a check-out date")).toBeOnTheScreen();
    expect(createHotelMock).not.toHaveBeenCalled();
  });

  it("makes exactly one call on a double tap", async () => {
    let resolveCreate!: (value: unknown) => void;
    createHotelMock.mockReturnValue(new Promise((resolve) => (resolveCreate = resolve)));
    await fillValid();
    const button = saveButton();
    await userEvent.press(button);
    await userEvent.press(button);
    resolveCreate({ ok: true, data: makeHotel() });
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
    expect(createHotelMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the form and the input, and shows the error in the form, when saving fails", async () => {
    createHotelMock.mockResolvedValue({ ok: false, kind: "offline" });
    await fillValid();
    await userEvent.press(saveButton());
    expect(await screen.findByTestId("hotel-form-error")).toHaveTextContent("No connection. Check your internet and try again");
    expect(screen.getByTestId("hotel-form-name").props.value).toBe("Casa Alfama");
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});
