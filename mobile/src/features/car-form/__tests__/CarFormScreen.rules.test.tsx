import { fireEvent, screen, userEvent, waitFor, within } from "@testing-library/react-native";
import type { Segment } from "@tripplanner/shared";
import { Keyboard } from "react-native";

import { segmentKeys } from "@/features/transport";
import { createCar } from "@/features/cars/api";
import { supabase } from "@/lib/supabase";
import { createQueryClient } from "@/lib/query";

import { DATED_TRIP, SIGNED_IN, fillValid, makeCar, pickTime, renderCreate, resetProfileMock } from "./testKit";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("@/features/profile/api", () => ({ ...jest.requireActual("@/features/profile/api"), getProfile: jest.fn() }));
jest.mock("@/features/trips/api", () => ({ ...jest.requireActual("@/features/trips/api"), getTrip: jest.fn() }));
jest.mock("@/features/cars/api", () => ({ ...jest.requireActual("@/features/cars/api"), createCar: jest.fn() }));

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn(), dismissTo: jest.fn() };
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useNavigation: () => ({ addListener: () => () => undefined }),
}));

const createCarMock = createCar as jest.Mock;
const saveButton = () => screen.getByRole("button", { name: "Save" });
let dismiss: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  resetProfileMock();
  createCarMock.mockResolvedValue({ ok: true, data: makeCar() });
  dismiss = jest.spyOn(Keyboard, "dismiss").mockImplementation(() => undefined);
});

describe("times: the first tap opens the picker (AC-20)", () => {
  it("opens the sheet at once, still empty; Done writes 11:00 for both; no clear cross", async () => {
    await renderCreate(DATED_TRIP);
    await userEvent.press(screen.getByTestId("car-form-pickup-time-empty"));
    expect(screen.getByTestId("time-sheet")).toBeOnTheScreen();
    expect(screen.getByTestId("car-form-pickup-time-empty", { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByTestId("time-sheet-picker").props.accessibilityLabel).toBe("Pick-up time");
    await userEvent.press(screen.getByTestId("time-sheet-done"));
    await waitFor(() => expect(screen.queryByTestId("time-sheet")).not.toBeOnTheScreen());
    expect(screen.getByTestId("car-form-pickup-time-value").props.accessibilityLabel).toContain("11:00");
    await pickTime("return");
    expect(screen.getByTestId("car-form-return-time-value").props.accessibilityLabel).toContain("11:00");
    expect(screen.queryByLabelText(/clear/i)).not.toBeOnTheScreen();
  });

  it("Cancel and the scrim leave the field empty", async () => {
    await renderCreate(DATED_TRIP);
    await userEvent.press(screen.getByTestId("car-form-return-time-empty"));
    await userEvent.press(screen.getByTestId("time-sheet-cancel"));
    await waitFor(() => expect(screen.queryByTestId("time-sheet")).not.toBeOnTheScreen());
    expect(screen.getByTestId("car-form-return-time-empty")).toBeOnTheScreen();
    await userEvent.press(screen.getByTestId("car-form-pickup-time-empty"));
    await userEvent.press(screen.getByTestId("time-sheet-backdrop"));
    await waitFor(() => expect(screen.queryByTestId("time-sheet")).not.toBeOnTheScreen());
    expect(screen.getByTestId("car-form-pickup-time-empty")).toBeOnTheScreen();
  });
});

describe("return order and length (AC-22)", () => {
  it("a same-day return that is not later shows the error under 'Return time' and blocks saving", async () => {
    await fillValid({ startDate: "2026-08-19", endDate: "2026-08-19" });
    await userEvent.press(saveButton());
    expect(within(screen.getByTestId("car-form-return-time")).getByText("Return must be after pick-up")).toBeOnTheScreen();
    expect(screen.queryByText("A rental cannot exceed 365 days")).not.toBeOnTheScreen();
    expect(createCarMock).not.toHaveBeenCalled();
  });

  it("on different dates the order of the times is not checked", async () => {
    await fillValid();
    await userEvent.press(saveButton());
    await waitFor(() => expect(createCarMock).toHaveBeenCalledTimes(1));
  });

  it("more than 365 days shows the error under 'Dates'", async () => {
    await fillValid({ startDate: "2026-08-19", endDate: "2027-08-21" });
    await userEvent.press(saveButton());
    expect(within(screen.getByTestId("car-form-dates")).getByText("A rental cannot exceed 365 days")).toBeOnTheScreen();
    expect(createCarMock).not.toHaveBeenCalled();
  });
});

describe("return after the flight (AC-38)", () => {
  const FLIGHTS = [{ from: { timeZone: "Europe/Lisbon" }, departureAt: new Date("2026-08-27T09:00:00Z") }] as unknown as Segment[];

  function clientWithFlights() {
    const queryClient = createQueryClient({ retry: false, gcTime: Infinity });
    queryClient.setQueryData(segmentKeys.ofTrip("trip-1"), FLIGHTS);
    return queryClient;
  }

  it("shows a warning under the times when the return is later than the flight; it never blocks saving", async () => {
    await fillValid(DATED_TRIP, { ...SIGNED_IN, queryClient: clientWithFlights() });
    // 11:00 in Lisbon is 10:00Z, an hour after the 09:00Z departure.
    expect(screen.getByTestId("car-form-flight-warning")).toHaveTextContent(/Return the car before the flight departs at Aug 27, 10:00/);
    await userEvent.press(saveButton());
    await waitFor(() => expect(createCarMock).toHaveBeenCalledTimes(1));
  });

  it("goes away when the rental is corrected to end before the flight", async () => {
    await fillValid(DATED_TRIP, { ...SIGNED_IN, queryClient: clientWithFlights() });
    expect(screen.getByTestId("car-form-flight-warning")).toBeOnTheScreen();
    await userEvent.press(screen.getByTestId("car-form-dates-field"));
    await userEvent.press(screen.getByTestId("car-form-dates-sheet-calendar-day-2026-08-19"));
    await userEvent.press(screen.getByTestId("car-form-dates-sheet-calendar-day-2026-08-25"));
    await userEvent.press(screen.getByTestId("car-form-dates-sheet-done"));
    await waitFor(() => expect(screen.queryByTestId("car-form-flight-warning")).not.toBeOnTheScreen());
  });

  it("no segments in the cache: no warning and no request at all", async () => {
    await fillValid();
    expect(screen.queryByTestId("car-form-flight-warning")).not.toBeOnTheScreen();
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

// RNTL's fireEvent runs only the NEAREST handler, while a device bubbles touch start to every
// ancestor: an input touch is therefore fired at the input and then at the wrapper, like a device.
describe("tap outside an input blurs it (AC-36)", () => {
  it("dismisses the keyboard on a touch on a label, a button and an empty area, but not on an input", async () => {
    await renderCreate(DATED_TRIP);
    fireEvent(screen.getByTestId("car-form-booking-ref"), "touchStart");
    fireEvent(screen.getByTestId("car-form-root"), "touchStart");
    expect(dismiss).not.toHaveBeenCalled();
    fireEvent(screen.getByText("Office"), "touchStart");
    expect(dismiss).toHaveBeenCalledTimes(1);
    fireEvent(screen.getByTestId("car-form-save"), "touchStart");
    expect(dismiss).toHaveBeenCalledTimes(2);
    fireEvent(screen.getByTestId("car-form-root"), "touchStart");
    expect(dismiss).toHaveBeenCalledTimes(3);
  });
});
