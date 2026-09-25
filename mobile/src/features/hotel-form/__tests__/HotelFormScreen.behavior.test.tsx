import { fireEvent, screen, userEvent, waitFor } from "@testing-library/react-native";
import type { Trip } from "@tripplanner/shared";
import { Profiler } from "react";
import { AccessibilityInfo, Keyboard } from "react-native";

import { createHotel } from "@/features/hotels/api";
import { getTrip } from "@/features/trips/api";
import { getProfile } from "@/features/profile/api";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { CostField } from "../components/CostField";
import { HotelFormScreen } from "../HotelFormScreen";
import { LISBON_PLACE, SIGNED_IN, makeHotel, makeTrip, pickTime, profileResult } from "./testKit";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("@/features/profile/api", () => ({ ...jest.requireActual("@/features/profile/api"), getProfile: jest.fn() }));
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

async function renderCreate(overrides: Partial<Trip> = {}) {
  getTripMock.mockResolvedValue({ ok: true, data: makeTrip(overrides) });
  await renderWithProviders(<HotelFormScreen tripId="trip-1" />, SIGNED_IN);
  await screen.findByTestId("hotel-form-name");
}

let dismiss: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  (getProfile as jest.Mock).mockResolvedValue(profileResult(null));
  createHotelMock.mockResolvedValue({ ok: true, data: makeHotel() });
  dismiss = jest.spyOn(Keyboard, "dismiss").mockImplementation(() => undefined);
});

describe("create mode: the first tap on an empty time opens the picker", () => {
  it("opens the sheet at once without setting anything; Done sets 15:00 / 11:00 and they are saved", async () => {
    await renderCreate(CITY_TRIP);
    await userEvent.type(screen.getByTestId("hotel-form-name"), "Casa");
    await userEvent.press(screen.getByTestId("hotel-form-check-in-time-empty"));
    // First tap: the sheet is open, the field is still empty.
    expect(screen.getByTestId("time-sheet")).toBeOnTheScreen();
    // (the form behind the sheet is hidden from screen readers, hence includeHiddenElements)
    expect(screen.getByTestId("hotel-form-check-in-time-empty", { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByTestId("hotel-form-check-in-time-clear", { includeHiddenElements: true })).not.toBeOnTheScreen();
    await userEvent.press(screen.getByTestId("time-sheet-done"));
    await waitFor(() => expect(screen.queryByTestId("time-sheet")).not.toBeOnTheScreen());
    expect(screen.getByTestId("hotel-form-check-in-time-value").props.accessibilityLabel).toContain("15:00");
    await pickTime("check-out");
    expect(screen.getByTestId("hotel-form-check-out-time-value").props.accessibilityLabel).toContain("11:00");
    await userEvent.press(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(createHotelMock).toHaveBeenCalledTimes(1));
    expect(createHotelMock.mock.calls[0]?.[1]).toMatchObject({ checkInTime: "15:00", checkOutTime: "11:00" });
  });

  it("Cancel and the scrim leave the field empty", async () => {
    await renderCreate(CITY_TRIP);
    await userEvent.press(screen.getByTestId("hotel-form-check-out-time-empty"));
    await userEvent.press(screen.getByTestId("time-sheet-cancel"));
    await waitFor(() => expect(screen.queryByTestId("time-sheet")).not.toBeOnTheScreen());
    expect(screen.getByTestId("hotel-form-check-out-time-empty")).toBeOnTheScreen();
    await userEvent.press(screen.getByTestId("hotel-form-check-in-time-empty"));
    await userEvent.press(screen.getByTestId("time-sheet-backdrop"));
    await waitFor(() => expect(screen.queryByTestId("time-sheet")).not.toBeOnTheScreen());
    expect(screen.getByTestId("hotel-form-check-in-time-empty")).toBeOnTheScreen();
  });

  it("a filled field opens the sheet again; the cross still clears it", async () => {
    await renderCreate(CITY_TRIP);
    await pickTime("check-in");
    await userEvent.press(screen.getByTestId("hotel-form-check-in-time-value"));
    expect(screen.getByTestId("time-sheet-picker").props.accessibilityLabel).toBe("Check-in time");
    await userEvent.press(screen.getByTestId("time-sheet-cancel"));
    await waitFor(() => expect(screen.queryByTestId("time-sheet")).not.toBeOnTheScreen());
    expect(screen.getByTestId("hotel-form-check-in-time-value").props.accessibilityLabel).toContain("15:00");
    await userEvent.press(screen.getByTestId("hotel-form-check-in-time-clear"));
    expect(screen.getByTestId("hotel-form-check-in-time-empty")).toBeOnTheScreen();
  });
});

describe("cost input accepts only price characters (native echo)", () => {
  it("types char by char: letters, spaces, signs and a second separator never appear", async () => {
    await renderCreate();
    const amount = () => screen.getByTestId("hotel-form-cost-amount");
    let typed = "";
    for (const char of "1a2 -+e.3,4.5") {
      fireEvent.changeText(amount(), typed + char);
      typed = amount().props.value as string;
    }
    expect(typed).toBe("12.34");
  });

  it("filters a pasted mixed string", async () => {
    await renderCreate();
    fireEvent.changeText(screen.getByTestId("hotel-form-cost-amount"), "EUR 1 234,567.89");
    expect(screen.getByTestId("hotel-form-cost-amount").props.value).toBe("1234,56");
  });

  it("re-renders the input even when the filtered value equals the old one (so the native field drops the char)", async () => {
    const onRender = jest.fn();
    await renderWithProviders(
      <Profiler id="cost" onRender={onRender}>
        <CostField amount="12" currency="" onChangeAmount={jest.fn()} onOpenCurrency={jest.fn()} currencyPlaceholder="EUR" testID="cost" />
      </Profiler>,
    );
    const before = onRender.mock.calls.length;
    fireEvent.changeText(screen.getByTestId("cost-amount"), "12a");
    expect(onRender.mock.calls.length).toBeGreaterThan(before);
    expect(screen.getByTestId("cost-amount").props.value).toBe("12");
  });
});

// RNTL's fireEvent runs only the NEAREST handler, while a device bubbles touch start to every
// ancestor: an input touch is therefore fired at the input and then at the wrapper, like a device.
function touchInput(testID: string) {
  fireEvent(screen.getByTestId(testID), "touchStart");
  fireEvent(screen.getByTestId("hotel-form-root"), "touchStart");
}

describe("tap outside an input blurs it", () => {
  it("dismisses the keyboard on a touch on a label, a button and an empty area, but not on an input", async () => {
    await renderCreate(CITY_TRIP);
    touchInput("hotel-form-name");
    expect(dismiss).not.toHaveBeenCalled();
    fireEvent(screen.getByText("Notes"), "touchStart");
    expect(dismiss).toHaveBeenCalledTimes(1);
    fireEvent(screen.getByTestId("hotel-form-save"), "touchStart");
    expect(dismiss).toHaveBeenCalledTimes(2);
    fireEvent(screen.getByTestId("hotel-form-root"), "touchStart");
    expect(dismiss).toHaveBeenCalledTimes(3);
    touchInput("hotel-form-address");
    expect(dismiss).toHaveBeenCalledTimes(3);
  });

});

describe("cost amount accepts digits only", () => {
  it("drops letters, spaces, minus and exponent while typing, keeps one separator and 2 decimals", async () => {
    await renderCreate();
    const amount = screen.getByTestId("hotel-form-cost-amount");
    await userEvent.type(amount, "-1a 2e,5x99");
    expect(amount.props.value).toBe("12,59");
    fireEvent.changeText(amount, "9999999999999.999");
    expect(screen.getByTestId("hotel-form-cost-amount").props.value).toBe("9999999999.99");
  });
});

describe("currency sheet motion", () => {
  it("stays mounted through the exit animation, then unmounts and applies the choice", async () => {
    await renderCreate();
    await userEvent.press(screen.getByTestId("hotel-form-cost-currency"));
    await userEvent.press(screen.getByTestId("hotel-form-currency-sheet-item-EUR"));
    // The choice is applied only after the exit animation finished.
    await waitFor(() => expect(screen.queryByTestId("hotel-form-currency-sheet")).not.toBeOnTheScreen());
    expect(screen.getByTestId("hotel-form-cost-currency").props.accessibilityLabel).toBe("Currency: EUR");
  });

  it("hides the form from screen readers while open and still closes with Reduce Motion on", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    await renderCreate();
    await userEvent.press(screen.getByTestId("hotel-form-cost-currency"));
    expect(screen.getByTestId("hotel-form-currency-sheet").props.accessibilityViewIsModal).toBe(true);
    await userEvent.press(screen.getByTestId("hotel-form-currency-sheet-backdrop"));
    await waitFor(() => expect(screen.queryByTestId("hotel-form-currency-sheet")).not.toBeOnTheScreen());
  });
});
