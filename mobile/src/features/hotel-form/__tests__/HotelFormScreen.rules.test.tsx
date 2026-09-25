import { fireEvent, screen, userEvent, waitFor } from "@testing-library/react-native";
import type { CalendarDate, Trip } from "@tripplanner/shared";

import { createHotel, getHotel, updateHotel } from "@/features/hotels/api";
import { getTrip } from "@/features/trips/api";
import { getProfile } from "@/features/profile/api";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { HotelFormScreen } from "../HotelFormScreen";
import { HotelFormBody } from "../components/HotelFormBody";
import { hotelFormFromTrip } from "../hooks/formState";
import { HOTEL_ID, LISBON_PLACE, SIGNED_IN, makeHotel, makeTrip, profileResult } from "./testKit";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("@/features/profile/api", () => ({ ...jest.requireActual("@/features/profile/api"), getProfile: jest.fn() }));
jest.mock("@/features/trips/api", () => ({ ...jest.requireActual("@/features/trips/api"), getTrip: jest.fn() }));
jest.mock("@/features/hotels/api", () => ({
  ...jest.requireActual("@/features/hotels/api"),
  createHotel: jest.fn(),
  getHotel: jest.fn(),
  updateHotel: jest.fn(),
}));

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn(), dismissAll: jest.fn() };
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useNavigation: () => ({ addListener: () => () => undefined }),
}));

const getTripMock = getTrip as jest.Mock;
const createHotelMock = createHotel as jest.Mock;
const getHotelMock = getHotel as jest.Mock;
const updateHotelMock = updateHotel as jest.Mock;

const TODAY: CalendarDate = "2026-06-10";

beforeEach(() => {
  jest.clearAllMocks();
  (getProfile as jest.Mock).mockResolvedValue(profileResult(null));
  createHotelMock.mockResolvedValue({ ok: true, data: makeHotel() });
  updateHotelMock.mockResolvedValue({ ok: true, data: makeHotel() });
});

async function renderCreate(overrides: Partial<Trip> = {}, today: CalendarDate = TODAY) {
  getTripMock.mockResolvedValue({ ok: true, data: makeTrip({ place: LISBON_PLACE, ...overrides }) });
  await renderWithProviders(<HotelFormScreen tripId="trip-1" />, { ...SIGNED_IN, today });
  await screen.findByTestId("hotel-form-name");
}

const day = (d: string) => screen.getByTestId(`hotel-form-dates-calendar-day-${d}`);
const saveButton = () => screen.getByRole("button", { name: "Save" });

describe("create: past days are not selectable", () => {
  it("disables and mutes days before today, keeps today and later pickable (driven by the injected clock)", async () => {
    await renderCreate();
    await userEvent.press(screen.getByTestId("hotel-form-dates-field"));
    expect(day("2026-06-09").props.accessibilityState).toMatchObject({ disabled: true });
    expect(day("2026-06-10").props.accessibilityState).toMatchObject({ disabled: false });
    expect(day("2026-06-11").props.accessibilityState).toMatchObject({ disabled: false });

    // A tap on a past day changes nothing: the next tap still starts the range.
    await userEvent.press(day("2026-06-09"));
    expect(screen.getByText("Tap the check-in day")).toBeOnTheScreen();
    await userEvent.press(day("2026-06-12"));
    await userEvent.press(day("2026-06-14"));
    expect(screen.getByTestId("hotel-form-dates-field").props.accessibilityLabel).toMatch(/Jun 12.*14, 2026/);
  });

  it("follows the clock: another today moves the floor", async () => {
    await renderCreate({}, "2026-06-20");
    await userEvent.press(screen.getByTestId("hotel-form-dates-field"));
    expect(day("2026-06-19").props.accessibilityState).toMatchObject({ disabled: true });
    expect(day("2026-06-20").props.accessibilityState).toMatchObject({ disabled: false });
  });

  it("does not page back before today's month", async () => {
    await renderCreate();
    await userEvent.press(screen.getByTestId("hotel-form-dates-field"));
    expect(screen.getByTestId("hotel-form-dates-calendar-prev").props.accessibilityState).toMatchObject({ disabled: true });
    await userEvent.press(screen.getByTestId("hotel-form-dates-calendar-next"));
    expect(screen.getByTestId("hotel-form-dates-calendar-prev").props.accessibilityState).toMatchObject({ disabled: false });
  });

  it("clamps a trip that already began: start becomes today, end stays", async () => {
    await renderCreate({ startDate: "2026-06-05", endDate: "2026-06-14" });
    expect(screen.getByTestId("hotel-form-dates-field").props.accessibilityLabel).toMatch(/Jun 10.*14, 2026/);
  });

  it("leaves the range empty for a trip that already ended", async () => {
    await renderCreate({ startDate: "2026-06-01", endDate: "2026-06-05" });
    expect(screen.getByTestId("hotel-form-dates-field").props.accessibilityLabel).toBe("Choose dates");
  });
});

describe("edit: an existing past hotel stays editable", () => {
  async function renderEdit(checkIn: CalendarDate, checkOut: CalendarDate) {
    getHotelMock.mockResolvedValue({ ok: true, data: makeHotel({ checkInDate: checkIn, checkOutDate: checkOut }) });
    await renderWithProviders(<HotelFormScreen tripId="trip-1" hotelId={HOTEL_ID} />, { ...SIGNED_IN, today: TODAY });
    await screen.findByTestId("hotel-form-name");
  }

  it("saves untouched past dates", async () => {
    await renderEdit("2026-05-01", "2026-05-04");
    await userEvent.press(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(updateHotelMock).toHaveBeenCalledTimes(1));
    expect(updateHotelMock.mock.calls[0]?.[2]).toMatchObject({ checkInDate: "2026-05-01", checkOutDate: "2026-05-04" });
  });

  it("selects days from its own check-in on, but nothing earlier", async () => {
    await renderEdit("2026-05-10", "2026-05-12");
    await userEvent.press(screen.getByTestId("hotel-form-dates-field"));
    expect(day("2026-05-09").props.accessibilityState).toMatchObject({ disabled: true });
    expect(day("2026-05-10").props.accessibilityState).toMatchObject({ disabled: false });
    expect(day("2026-05-20").props.accessibilityState).toMatchObject({ disabled: false });
  });

  it("a hotel in the future floors at today", async () => {
    await renderEdit("2026-07-10", "2026-07-12");
    await userEvent.press(screen.getByTestId("hotel-form-dates-field"));
    await userEvent.press(screen.getByTestId("hotel-form-dates-calendar-prev"));
    expect(day("2026-06-09").props.accessibilityState).toMatchObject({ disabled: true });
    expect(day("2026-06-10").props.accessibilityState).toMatchObject({ disabled: false });
  });
});

describe("create: a past check-in can never be submitted", () => {
  it("blocks Save and shows the inPast error when the form state holds a past check-in", async () => {
    const initial = {
      ...hotelFormFromTrip(makeTrip({ place: LISBON_PLACE }), "en", TODAY, null),
      name: "Casa",
      checkInDate: "2026-06-01" as CalendarDate,
      checkOutDate: "2026-06-04" as CalendarDate,
    };
    await renderWithProviders(<HotelFormBody target={{ mode: "create", tripId: "trip-1" }} initial={initial} />, {
      ...SIGNED_IN,
      today: TODAY,
    });
    await userEvent.press(saveButton());
    expect(screen.getByText("Check-in date cannot be in the past")).toBeOnTheScreen();
    expect(createHotelMock).not.toHaveBeenCalled();
  });
});

describe("cost: currency is required once an amount is entered", () => {
  it("shows the EUR hint, not as a value, and no required cue while the amount is empty", async () => {
    await renderCreate();
    expect(screen.getByText("EUR")).toBeOnTheScreen();
    expect(screen.getByTestId("hotel-form-cost-currency").props.accessibilityLabel).toBe("Currency: not chosen");
    expect(screen.queryByText("Currency (required)")).not.toBeOnTheScreen();
    expect(screen.queryByText("Choose a currency")).not.toBeOnTheScreen();
  });

  it("amount without currency: cue while typing, error after the amount blurs, Save blocked", async () => {
    await renderCreate();
    const amount = screen.getByTestId("hotel-form-cost-amount");
    fireEvent.changeText(amount, "120");
    expect(screen.getByText("Currency (required)")).toBeOnTheScreen();
    expect(screen.queryByText("Choose a currency")).not.toBeOnTheScreen();
    fireEvent(amount, "blur");
    expect(screen.getByText("Choose a currency")).toBeOnTheScreen();

    await userEvent.type(screen.getByTestId("hotel-form-name"), "Casa");
    await userEvent.press(saveButton());
    expect(createHotelMock).not.toHaveBeenCalled();
  });

  it("amount without currency: the error also shows on the first save attempt", async () => {
    await renderCreate();
    fireEvent.changeText(screen.getByTestId("hotel-form-cost-amount"), "120");
    await userEvent.press(saveButton());
    expect(screen.getByText("Choose a currency")).toBeOnTheScreen();
    expect(createHotelMock).not.toHaveBeenCalled();
  });

  it("currency without amount: still asks for the amount", async () => {
    await renderCreate();
    await userEvent.press(screen.getByTestId("hotel-form-cost-currency"));
    await userEvent.press(screen.getByTestId("hotel-form-currency-sheet-option-EUR"));
    await waitFor(() => expect(screen.queryByTestId("hotel-form-currency-sheet")).not.toBeOnTheScreen());
    expect(screen.getByText("Enter an amount")).toBeOnTheScreen();
  });
});

describe("amount field never displays a rejected character", () => {
  const display = () => screen.queryByTestId("hotel-form-cost-amount-display", { includeHiddenElements: true });

  it("the overlaid text follows the filtered value while typing", async () => {
    await renderCreate();
    const amount = () => screen.getByTestId("hotel-form-cost-amount");
    let typed = "";
    for (const char of "1a2 -+e.3,4.5") {
      fireEvent.changeText(amount(), typed + char);
      typed = amount().props.value as string;
      expect(display()?.props.children ?? "").toBe(typed);
      expect(display()?.props.children ?? "").toMatch(/^[0-9]*[.,]?[0-9]{0,2}$/);
    }
    expect(typed).toBe("12.34");
  });

  it("paste of a mixed string shows only the accepted characters and exposes them as the a11y value", async () => {
    await renderCreate();
    fireEvent.changeText(screen.getByTestId("hotel-form-cost-amount"), "EUR 1 234,567.89");
    expect(display()?.props.children).toBe("1234,56");
    expect(screen.getByTestId("hotel-form-cost-amount").props.accessibilityValue).toEqual({ text: "1234,56" });
  });

  it("the native text is invisible so an unfiltered echo cannot show", async () => {
    await renderCreate();
    const style = screen.getByTestId("hotel-form-cost-amount").props.style as Record<string, unknown>[];
    expect(JSON.stringify(style)).toContain("transparent");
  });
});
