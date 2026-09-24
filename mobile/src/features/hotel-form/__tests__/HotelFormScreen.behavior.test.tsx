import { fireEvent, screen, userEvent, waitFor } from "@testing-library/react-native";
import type { Trip } from "@tripplanner/shared";
import { AccessibilityInfo, Keyboard } from "react-native";

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

async function renderCreate(overrides: Partial<Trip> = {}) {
  getTripMock.mockResolvedValue({ ok: true, data: makeTrip(overrides) });
  await renderWithProviders(<HotelFormScreen tripId="trip-1" />, SIGNED_IN);
  await screen.findByTestId("hotel-form-name");
}

let dismiss: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  createHotelMock.mockResolvedValue({ ok: true, data: makeHotel() });
  dismiss = jest.spyOn(Keyboard, "dismiss").mockImplementation(() => undefined);
});

describe("create mode: times are pickable and saved", () => {
  it("an empty field is a real button (no native picker to miss); tapping it sets the suggested time and saves it", async () => {
    await renderCreate(CITY_TRIP);
    expect(screen.queryByTestId("hotel-form-check-in-time-picker")).not.toBeOnTheScreen();
    await userEvent.type(screen.getByTestId("hotel-form-name"), "Casa");
    await userEvent.press(screen.getByTestId("hotel-form-check-in-time-empty"));
    await userEvent.press(screen.getByTestId("hotel-form-check-out-time-empty"));
    expect(screen.getByTestId("hotel-form-check-in-time-picker")).toBeOnTheScreen();
    await userEvent.press(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(createHotelMock).toHaveBeenCalledTimes(1));
    expect(createHotelMock.mock.calls[0]?.[1]).toMatchObject({ checkInTime: "15:00", checkOutTime: "11:00" });
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

  it("dismisses when the touch lands in the currency sheet outside its search input; keeps focus in the search", async () => {
    await renderCreate(CITY_TRIP);
    await userEvent.press(screen.getByTestId("hotel-form-cost-currency"));
    dismiss.mockClear();
    touchInput("hotel-form-currency-sheet-search");
    expect(dismiss).not.toHaveBeenCalled();
    fireEvent(screen.getByTestId("hotel-form-currency-sheet-option-EUR"), "touchStart");
    expect(dismiss).toHaveBeenCalledTimes(1);
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
    await userEvent.press(screen.getByTestId("hotel-form-currency-sheet-option-EUR"));
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
