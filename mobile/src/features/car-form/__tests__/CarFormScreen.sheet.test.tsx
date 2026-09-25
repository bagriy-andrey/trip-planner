import { screen, userEvent, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { getCar, updateCar } from "@/features/cars/api";

import { SIGNED_IN, DATED_TRIP, makeCar, renderCreate, renderEdit, resetProfileMock } from "./testKit";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("@/features/profile/api", () => ({ ...jest.requireActual("@/features/profile/api"), getProfile: jest.fn() }));
jest.mock("@/features/trips/api", () => ({ ...jest.requireActual("@/features/trips/api"), getTrip: jest.fn() }));
jest.mock("@/features/cars/api", () => ({ ...jest.requireActual("@/features/cars/api"), getCar: jest.fn(), updateCar: jest.fn() }));

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn(), dismissTo: jest.fn() };
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useNavigation: () => ({ addListener: () => () => undefined }),
}));

const SHEET = "car-form-dates-sheet";
const day = (date: string) => screen.getByTestId(`${SHEET}-calendar-day-${date}`);
const done = () => screen.getByTestId(`${SHEET}-done`);
const field = () => screen.getByTestId("car-form-dates-field", { includeHiddenElements: true });
const closed = () => waitFor(() => expect(screen.queryByTestId(SHEET)).not.toBeOnTheScreen());
const openSheet = () => userEvent.press(screen.getByTestId("car-form-dates-field"));

beforeEach(() => {
  jest.clearAllMocks();
  resetProfileMock();
  (getCar as jest.Mock).mockResolvedValue({ ok: true, data: makeCar() });
  (updateCar as jest.Mock).mockResolvedValue({ ok: true, data: makeCar() });
});

describe("Rental dates sheet (AC-16, AC-18)", () => {
  it("opens over the form, hides the form from screen readers, on the start month, weeks from Monday", async () => {
    await renderCreate(DATED_TRIP);
    await openSheet();
    expect(screen.getByTestId(SHEET).props.accessibilityViewIsModal).toBe(true);
    expect(screen.getByRole("header", { name: "Rental dates" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "August 2026" })).toBeOnTheScreen();
    expect(screen.getByText("Mon")).toBeOnTheScreen();
    expect(screen.getByTestId("car-form-root").findAll((node) => node.props.importantForAccessibility === "no-hide-descendants").length).toBeGreaterThan(0);
  });

  it("opens on today's month when the trip has no dates, and asks for the pick-up day first", async () => {
    await renderCreate();
    await openSheet();
    expect(screen.getByRole("header", { name: "June 2026" })).toBeOnTheScreen();
    expect(screen.getByText("Choose the pick-up day")).toBeOnTheScreen();
    expect(done()).toBeDisabled();
  });

  it("hints pick-up, then return, then the range; Done is live only with both dates", async () => {
    await renderCreate();
    await openSheet();
    await userEvent.press(day("2026-06-10"));
    expect(screen.getByText("Now choose the return day")).toBeOnTheScreen();
    expect(done()).toBeDisabled();
    await userEvent.press(day("2026-06-12"));
    expect(screen.getByText("Jun 10 – 12, 2026")).toBeOnTheScreen();
    expect(done()).toBeEnabled();
    await userEvent.press(done());
    await closed();
    expect(field().props.accessibilityLabel).toBe("Rental dates: Jun 10 – 12, 2026");
  });

  it("a tap before the start moves the start; the same day is a one-day rental; a third tap starts over", async () => {
    await renderCreate();
    await openSheet();
    await userEvent.press(day("2026-06-10"));
    await userEvent.press(day("2026-06-05"));
    expect(screen.getByText("Now choose the return day")).toBeOnTheScreen();
    await userEvent.press(day("2026-06-05"));
    expect(screen.getByText("Jun 5 – 5, 2026")).toBeOnTheScreen();
    await userEvent.press(day("2026-06-20"));
    expect(screen.getByText("Now choose the return day")).toBeOnTheScreen();
    expect(done()).toBeDisabled();
  });

  it("the scrim closes it without changing the dates", async () => {
    await renderCreate(DATED_TRIP);
    await openSheet();
    await userEvent.press(day("2026-08-22"));
    await userEvent.press(day("2026-08-24"));
    await userEvent.press(screen.getByTestId(`${SHEET}-backdrop`));
    await closed();
    expect(field().props.accessibilityLabel).toBe("Rental dates: Aug 19 – 27, 2026");
  });

  it("closes with Reduce Motion on", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    await renderCreate(DATED_TRIP);
    await openSheet();
    await userEvent.press(screen.getByTestId(`${SHEET}-backdrop`));
    await closed();
  });
});

describe("Rental dates sheet — past days (AC-19)", () => {
  it("create: days before today are disabled and the month before today's cannot be reached", async () => {
    await renderCreate({}, { ...SIGNED_IN, today: "2026-06-15" });
    await openSheet();
    expect(day("2026-06-14").props.accessibilityState).toMatchObject({ disabled: true });
    expect(day("2026-06-15").props.accessibilityState).toMatchObject({ disabled: false });
    expect(screen.getByTestId(`${SHEET}-calendar-prev`).props.accessibilityState).toMatchObject({ disabled: true });
    await userEvent.press(day("2026-06-14"));
    expect(screen.getByText("Choose the pick-up day")).toBeOnTheScreen();
    await userEvent.press(screen.getByTestId(`${SHEET}-calendar-next`));
    expect(screen.getByRole("header", { name: "July 2026" })).toBeOnTheScreen();
    expect(screen.getByTestId(`${SHEET}-calendar-prev`).props.accessibilityState).toMatchObject({ disabled: false });
  });

  it("edit: a rental with a past pick-up stays saveable and its own days stay selectable", async () => {
    (getCar as jest.Mock).mockResolvedValue({ ok: true, data: makeCar({ pickupDate: "2026-01-10", returnDate: "2026-01-15" }) });
    await renderEdit();
    await screen.findByTestId("car-form-booking-ref");
    await userEvent.press(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(updateCar).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Pick-up cannot be in the past")).not.toBeOnTheScreen();

    await openSheet();
    expect(day("2026-01-10").props.accessibilityState).toMatchObject({ disabled: false });
    expect(day("2026-01-09").props.accessibilityState).toMatchObject({ disabled: true });
  });
});
