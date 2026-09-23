import { act, fireEvent, screen, userEvent, waitFor } from "@testing-library/react-native";
import type { Trip } from "@tripplanner/shared";
import { Linking } from "react-native";

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

const MAPS = "https://www.google.com/maps/place/Casa";

beforeEach(() => {
  jest.clearAllMocks();
  createHotelMock.mockResolvedValue({ ok: true, data: makeHotel() });
});

async function renderCreate(dates: Pick<Trip, "startDate" | "endDate"> = { startDate: null, endDate: null }) {
  getTripMock.mockResolvedValue({ ok: true, data: makeTrip({ place: LISBON_PLACE, ...dates }) });
  await renderWithProviders(<HotelFormScreen tripId="trip-1" />, SIGNED_IN);
  await screen.findByTestId("hotel-form-name");
}

describe("HotelFormScreen breakfast (AC-22, AC-23, AC-44)", () => {
  it("shows the days stepper only for 'Some days', starting at 1 and bounded by the nights", async () => {
    await renderCreate({ startDate: "2026-06-15", endDate: "2026-06-18" });
    expect(screen.queryByTestId("hotel-form-breakfast-days")).not.toBeOnTheScreen();

    await userEvent.press(screen.getByRole("radio", { name: "Some days" }));
    const stepper = screen.getByTestId("hotel-form-breakfast-days");
    expect(stepper).toBeOnTheScreen();
    expect(screen.getByLabelText("Days with breakfast, 1")).toBeOnTheScreen();

    // 3 nights: 1..2.
    await userEvent.press(screen.getByRole("button", { name: "More breakfast days" }));
    expect(screen.getByLabelText("Days with breakfast, 2")).toBeOnTheScreen();
    await userEvent.press(screen.getByRole("button", { name: "More breakfast days" }));
    expect(screen.getByLabelText("Days with breakfast, 2")).toBeOnTheScreen();

    await userEvent.press(screen.getByRole("radio", { name: "Every day" }));
    expect(screen.queryByTestId("hotel-form-breakfast-days")).not.toBeOnTheScreen();
  });

  it("pulls the count back when the dates shrink", async () => {
    await renderCreate({ startDate: "2026-06-10", endDate: "2026-06-20" });
    await userEvent.press(screen.getByRole("radio", { name: "Some days" }));
    for (let i = 0; i < 5; i++) await userEvent.press(screen.getByRole("button", { name: "More breakfast days" }));
    expect(screen.getByLabelText("Days with breakfast, 6")).toBeOnTheScreen();

    // Clear check-out, then pick it again: the mock picker answers with its start day (= check-in),
    // i.e. 0 nights, so the range collapses to 1.
    await userEvent.press(screen.getByTestId("hotel-form-check-out-date-clear"));
    await userEvent.press(screen.getByTestId("hotel-form-check-out-date"));
    expect(screen.getByLabelText("Days with breakfast, 1")).toBeOnTheScreen();
    expect(screen.queryByText(/calculated from dates/)).not.toBeOnTheScreen();
  });

  it("uses radiogroups for parking and breakfast", async () => {
    await renderCreate();
    expect(screen.getByTestId("hotel-form-stay-parking").props.accessibilityRole).toBe("radiogroup");
    expect(screen.getByTestId("hotel-form-breakfast-segments").props.accessibilityRole).toBe("radiogroup");
    expect(screen.getByRole("radio", { name: "Free" })).toBeOnTheScreen();
  });
});

describe("HotelFormScreen cost (AC-19)", () => {
  it("offers currency suggestions and reports a missing currency", async () => {
    await renderCreate();
    await userEvent.type(screen.getByTestId("hotel-form-cost-amount"), "120.50");
    await userEvent.type(screen.getByTestId("hotel-form-cost-currency"), "E");
    await userEvent.press(await screen.findByTestId("hotel-form-cost-suggestion-EUR"));
    expect(screen.getByTestId("hotel-form-cost-currency").props.value).toBe("EUR");

    await userEvent.clear(screen.getByTestId("hotel-form-cost-currency"));
    await userEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Choose a currency")).toBeOnTheScreen();
  });
});

describe("HotelFormScreen maps link (AC-24..AC-27)", () => {
  async function acceptLink(url: string) {
    await userEvent.type(screen.getByTestId("hotel-form-maps"), url);
    fireEvent(screen.getByTestId("hotel-form-maps"), "blur");
  }

  it("rejects a non-Google link with an error under the field", async () => {
    await renderCreate();
    await acceptLink("https://evil.example/maps");
    expect(await screen.findByText("A Google Maps link is required")).toBeOnTheScreen();
    expect(screen.queryByText("Link added")).not.toBeOnTheScreen();
  });

  it("accepts a link, shows 'Link added / Google Maps' without printing it, and clears with the cross", async () => {
    await renderCreate();
    await acceptLink(MAPS);
    expect(await screen.findByText("Link added")).toBeOnTheScreen();
    expect(screen.getByText("Google Maps")).toBeOnTheScreen();
    expect(screen.queryByText(MAPS)).not.toBeOnTheScreen();
    await userEvent.press(screen.getByRole("button", { name: "Remove link" }));
    expect(screen.getByTestId("hotel-form-maps").props.value).toBe("");
  });

  it("opens the checked link with Linking.openURL", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValueOnce(true);
    await renderCreate();
    await acceptLink(MAPS);
    await userEvent.press(await screen.findByRole("button", { name: "Open" }));
    expect(open).toHaveBeenCalledWith(MAPS);
    open.mockRestore();
  });

  it("shows a message in the form (no alert) when the system cannot open it", async () => {
    const open = jest.spyOn(Linking, "openURL").mockRejectedValueOnce(new Error("nope"));
    await renderCreate();
    await acceptLink(MAPS);
    await userEvent.press(await screen.findByRole("button", { name: "Open" }));
    expect(await screen.findByText("Couldn't open the link")).toBeOnTheScreen();
    open.mockRestore();
  });
});

describe("HotelFormScreen check-out rule (AC-16)", () => {
  it("blocks saving when check-out is not after check-in and shows the error under Check-out", async () => {
    await renderCreate({ startDate: "2026-06-15", endDate: "2026-06-15" });
    await userEvent.type(screen.getByTestId("hotel-form-name"), "Casa");
    await userEvent.press(screen.getByTestId("hotel-form-check-in-time"));
    await userEvent.press(screen.getByTestId("hotel-form-check-out-time"));
    await userEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Check-out must be after check-in")).toBeOnTheScreen();
    await act(async () => undefined);
    await waitFor(() => expect(createHotelMock).not.toHaveBeenCalled());
  });
});
