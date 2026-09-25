import { act, fireEvent, screen, userEvent, waitFor } from "@testing-library/react-native";
import type { Trip } from "@tripplanner/shared";
import { Linking } from "react-native";

import { createHotel, getHotel } from "@/features/hotels/api";
import { getTrip } from "@/features/trips/api";
import { getProfile } from "@/features/profile/api";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { HotelFormScreen } from "../HotelFormScreen";
import { HOTEL_ID, LISBON_PLACE, SIGNED_IN, makeHotel, makeTrip, pickTime, profileResult } from "./testKit";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("@/features/profile/api", () => ({ ...jest.requireActual("@/features/profile/api"), getProfile: jest.fn() }));
jest.mock("@/features/trips/api", () => ({ ...jest.requireActual("@/features/trips/api"), getTrip: jest.fn() }));
jest.mock("@/features/hotels/api", () => ({
  ...jest.requireActual("@/features/hotels/api"),
  createHotel: jest.fn(),
  getHotel: jest.fn(),
}));

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn(), dismissAll: jest.fn() };
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useNavigation: () => ({ addListener: () => () => undefined }),
}));

const getTripMock = getTrip as jest.Mock;
const createHotelMock = createHotel as jest.Mock;
const getHotelMock = getHotel as jest.Mock;

const MAPS = "https://www.google.com/maps/place/Casa";

beforeEach(() => {
  jest.clearAllMocks();
  (getProfile as jest.Mock).mockResolvedValue(profileResult(null));
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

    // Re-pick a one-night range: the breakfast count is pulled back to 1.
    await userEvent.press(screen.getByTestId("hotel-form-dates-field"));
    await userEvent.press(screen.getByTestId("hotel-form-dates-calendar-day-2026-06-10"));
    await userEvent.press(screen.getByTestId("hotel-form-dates-calendar-day-2026-06-11"));
    expect(screen.getByLabelText("Days with breakfast, 1")).toBeOnTheScreen();
    expect(screen.getByText("1 night — calculated from dates")).toBeOnTheScreen();
  });

  it("uses radiogroups for parking and breakfast", async () => {
    await renderCreate();
    expect(screen.getByTestId("hotel-form-stay-parking").props.accessibilityRole).toBe("radiogroup");
    expect(screen.getByTestId("hotel-form-breakfast-segments").props.accessibilityRole).toBe("radiogroup");
    expect(screen.getByRole("radio", { name: "Free" })).toBeOnTheScreen();
  });
});

describe("HotelFormScreen cost (AC-19, currency dropdown)", () => {
  const sheet = "hotel-form-currency-sheet";
  const field = () => screen.getByTestId("hotel-form-cost-currency");

  it("without a profile the currency stays empty, the placeholder is EUR and a missing pair is reported (AC-38, AC-40)", async () => {
    await renderCreate();
    await waitFor(() => expect(field().props.accessibilityLabel).toBe("Currency: not chosen"));
    await userEvent.type(screen.getByTestId("hotel-form-cost-amount"), "120.50");
    await userEvent.press(screen.getByRole("button", { name: "Save" }));
    // Only the error reads "Choose a currency"; the placeholder is the muted hint EUR.
    expect(screen.getAllByText("Choose a currency")).toHaveLength(1);
    expect(screen.getByText("EUR")).toBeOnTheScreen();
  });

  it("prefills the home currency on create (US-3) and hints it as placeholder (AC-40)", async () => {
    (getProfile as jest.Mock).mockResolvedValue(profileResult("PLN"));
    await renderCreate();
    await waitFor(() => expect(field().props.accessibilityLabel).toBe("Currency: PLN"));
  });

  it("ignores a home currency that is not in the list (AC-38)", async () => {
    (getProfile as jest.Mock).mockResolvedValue(profileResult("ZZZ"));
    await renderCreate();
    expect(field().props.accessibilityLabel).toBe("Currency: not chosen");
    expect(screen.getByText("EUR")).toBeOnTheScreen();
  });

  it("does not prefill the home currency when editing a hotel without a cost (AC-38)", async () => {
    (getProfile as jest.Mock).mockResolvedValue(profileResult("PLN"));
    getHotelMock.mockResolvedValue({ ok: true, data: makeHotel({ cost: null }) });
    await renderWithProviders(<HotelFormScreen tripId="trip-1" hotelId={HOTEL_ID} />, SIGNED_IN);
    await screen.findByTestId("hotel-form-name");
    expect(field().props.accessibilityLabel).toBe("Currency: not chosen");
  });

  it("saves a currency without an amount as no cost, without an error (AC-39)", async () => {
    (getProfile as jest.Mock).mockResolvedValue(profileResult("PLN"));
    await renderCreate({ startDate: "2026-06-15", endDate: "2026-06-18" });
    await waitFor(() => expect(field().props.accessibilityLabel).toBe("Currency: PLN"));
    await userEvent.type(screen.getByTestId("hotel-form-name"), "Casa");
    await userEvent.press(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(createHotelMock).toHaveBeenCalledTimes(1));
    expect(createHotelMock.mock.calls[0][1]).toMatchObject({ cost: null });
    expect(screen.queryByText("Enter an amount")).not.toBeOnTheScreen();
  });

  it("opens the shared sheet with the full list; tapping a row selects it and closes", async () => {
    await renderCreate();
    await userEvent.press(field());
    expect(screen.getByTestId(sheet)).toBeOnTheScreen();
    expect(screen.getByTestId(`${sheet}-item-EUR`)).toBeOnTheScreen();
    expect(screen.getByTestId(`${sheet}-item-ARS`)).toBeOnTheScreen();
    await userEvent.press(screen.getByTestId(`${sheet}-item-EUR`));
    await waitFor(() => expect(screen.queryByTestId(sheet)).not.toBeOnTheScreen());
    await waitFor(() => expect(field().props.accessibilityLabel).toBe("Currency: EUR"));
  });

  it("searches by code or by localized name, case-insensitively", async () => {
    await renderCreate();
    await userEvent.press(field());
    await userEvent.type(screen.getByTestId(`${sheet}-search`), "zlo");
    expect(screen.getByTestId(`${sheet}-item-PLN`)).toBeOnTheScreen();
    expect(screen.queryByTestId(`${sheet}-item-EUR`)).not.toBeOnTheScreen();
    await userEvent.clear(screen.getByTestId(`${sheet}-search`));
    await userEvent.type(screen.getByTestId(`${sheet}-search`), "pln");
    expect(screen.getByTestId(`${sheet}-item-PLN`)).toBeOnTheScreen();
  });

  it("shows 'Check the spelling.' for an empty result when an amount is entered (AC-18, AC-41)", async () => {
    await renderCreate();
    await userEvent.type(screen.getByTestId("hotel-form-cost-amount"), "10");
    await userEvent.press(field());
    await userEvent.type(screen.getByTestId(`${sheet}-search`), "qqq");
    expect(screen.getByTestId(`${sheet}-empty`)).toBeOnTheScreen();
    expect(screen.getByText("Check the spelling.")).toBeOnTheScreen();
  });

  it("offers 'Not specified' once a currency is chosen, which unsets it", async () => {
    await renderCreate();
    await userEvent.press(field());
    expect(screen.queryByTestId(`${sheet}-none`)).not.toBeOnTheScreen();
    await userEvent.press(screen.getByTestId(`${sheet}-item-GBP`));
    await waitFor(() => expect(screen.queryByTestId(sheet)).not.toBeOnTheScreen());
    await userEvent.press(field());
    expect(screen.getByText("Not specified")).toBeOnTheScreen();
    await userEvent.press(screen.getByTestId(`${sheet}-none`));
    await waitFor(() => expect(field().props.accessibilityLabel).toBe("Currency: not chosen"));
  });

  it("closes from the scrim without changing the choice", async () => {
    await renderCreate();
    await userEvent.press(field());
    await userEvent.press(screen.getByTestId(`${sheet}-backdrop`));
    await waitFor(() => expect(screen.queryByTestId(sheet)).not.toBeOnTheScreen());
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
    await pickTime("check-in");
    await pickTime("check-out");
    await userEvent.press(screen.getByRole("button", { name: "Save" }));
    // Same day, both times set, out (11:00) not after in (15:00): the error sits under the check-out time.
    expect(screen.getByText("Check-out must be after check-in")).toBeOnTheScreen();
    await act(async () => undefined);
    await waitFor(() => expect(createHotelMock).not.toHaveBeenCalled());
  });
});
