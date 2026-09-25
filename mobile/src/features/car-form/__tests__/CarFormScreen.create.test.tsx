import { screen, userEvent, waitFor, within } from "@testing-library/react-native";

import { createCar } from "@/features/cars/api";

import { DATED_TRIP, MONO, fontFamilyOf, makeCar, pickTime, renderCreate, resetProfileMock } from "./testKit";

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

beforeEach(() => {
  jest.clearAllMocks();
  resetProfileMock();
  createCarMock.mockResolvedValue({ ok: true, data: makeCar() });
});

describe("CarFormScreen create — layout (AC-8, AC-9)", () => {
  it("renders the fields in the design order, with h2 group headings", async () => {
    await renderCreate();
    const json = JSON.stringify(screen.toJSON());
    const order = [
      "car-form-booking-ref",
      "car-form-company",
      "car-form-pickup-place",
      "car-form-dates",
      "car-form-pickup-time",
      "car-form-return-time",
      "car-form-same-place",
      "car-form-maps",
      "car-form-address",
      "car-form-phone",
      "car-form-class",
      "car-form-insurance",
      "car-form-fuel",
      "car-form-cost",
      "car-form-payment",
      "car-form-more-toggle",
    ];
    const positions = order.map((id) => json.indexOf(`"${id}"`));
    positions.forEach((position) => expect(position).toBeGreaterThan(-1));
    for (let i = 1; i < positions.length; i++) expect(positions[i]).toBeGreaterThan(positions[i - 1]!);
    for (const title of ["Pick-up and return", "Office", "Car and terms", "Payment", "More"]) {
      expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
    }
    // The return place appears only while "same place" is off; "More" starts collapsed.
    expect(screen.queryByTestId("car-form-return-place")).not.toBeOnTheScreen();
    expect(screen.queryByTestId("car-form-notes")).not.toBeOnTheScreen();
  });

  it("has a cancel cross, the title and Save; no Done, no save-and-next, no delete", async () => {
    await renderCreate();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Car rental" })).toBeOnTheScreen();
    expect(saveButton()).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Done" })).not.toBeOnTheScreen();
    expect(screen.queryByText(/add next/i)).not.toBeOnTheScreen();
    expect(screen.queryByTestId("car-form-delete")).not.toBeOnTheScreen();
  });

  it("uses the phone keyboard for the phone and no timezone field", async () => {
    await renderCreate();
    const phone = screen.getByTestId("car-form-phone");
    expect(phone.props.keyboardType).toBe("phone-pad");
    expect(phone.props.textContentType).toBe("telephoneNumber");
    expect(screen.queryByText(/time ?zone/i)).not.toBeOnTheScreen();
  });
});

describe("CarFormScreen create — prefill (AC-11)", () => {
  it("shows the trip's dates as one range, empty times, same place on", async () => {
    await renderCreate(DATED_TRIP);
    expect(screen.getByTestId("car-form-dates-field").props.accessibilityLabel).toBe("Rental dates: Aug 19 – 27, 2026");
    expect(screen.getByTestId("car-form-pickup-time-empty")).toBeOnTheScreen();
    expect(screen.getByTestId("car-form-return-time-empty")).toBeOnTheScreen();
    expect(screen.getByRole("switch", { name: "Return to same place", checked: true })).toBeOnTheScreen();
  });

  it("clamps the start to today for a trip that already began", async () => {
    await renderCreate({ startDate: "2026-05-20", endDate: "2026-08-27" });
    expect(screen.getByTestId("car-form-dates-field").props.accessibilityLabel).toBe("Rental dates: Jun 1 – Aug 27, 2026");
  });

  it("leaves the dates empty for an ended trip and for a trip without dates", async () => {
    await renderCreate({ startDate: "2026-05-01", endDate: "2026-05-10" });
    expect(screen.getByTestId("car-form-dates-field").props.accessibilityLabel).toBe("Choose dates");
  });

  it("shows the profile's home currency as the default", async () => {
    resetProfileMock("EUR");
    await renderCreate();
    await waitFor(() => expect(screen.getByTestId("car-form-cost-currency").props.accessibilityLabel).toBe("Currency: EUR"));
  });
});

describe("CarFormScreen create — ticket data in mono (AC-12)", () => {
  it("booking reference, date range, times and the currency code are mono; the rest is not", async () => {
    resetProfileMock("EUR");
    await renderCreate(DATED_TRIP);
    expect(fontFamilyOf(screen.getByTestId("car-form-booking-ref"))).toBe(MONO);
    expect(fontFamilyOf(screen.getByText("Aug 19 – 27, 2026"))).toBe(MONO);
    await pickTime("pickup");
    expect(fontFamilyOf(screen.getByText("11:00"))).toBe(MONO);
    await waitFor(() => expect(within(screen.getByTestId("car-form-cost-currency")).getByText("EUR")).toBeOnTheScreen());
    expect(fontFamilyOf(within(screen.getByTestId("car-form-cost-currency")).getByText("EUR"))).toBe(MONO);
    for (const id of ["car-form-phone", "car-form-cost-amount", "car-form-company", "car-form-pickup-place"]) {
      expect(fontFamilyOf(screen.getByTestId(id))).not.toBe(MONO);
    }
  });
});

describe("CarFormScreen create — Save (AC-29, AC-33, AC-34)", () => {
  async function fillValid() {
    await renderCreate(DATED_TRIP);
    await userEvent.type(screen.getByTestId("car-form-booking-ref"), "RES-1");
    await userEvent.type(screen.getByTestId("car-form-pickup-place"), "Lisbon Airport");
    await pickTime("pickup");
    await pickTime("return");
  }

  it("creates the rental (no source sent), then closes the form", async () => {
    await fillValid();
    await userEvent.press(saveButton());
    await waitFor(() => expect(createCarMock).toHaveBeenCalledTimes(1));
    const [tripId, form] = createCarMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(tripId).toBe("trip-1");
    expect(form).toMatchObject({
      bookingRef: "RES-1",
      pickupPlace: "Lisbon Airport",
      pickupDate: "2026-08-19",
      returnDate: "2026-08-27",
      pickupTime: "11:00",
      returnTime: "11:00",
      returnSamePlace: true,
      returnPlace: null,
      money: null,
    });
    expect(form).not.toHaveProperty("source");
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
  });

  it("shows every error at once after the first attempt and sends nothing", async () => {
    await renderCreate();
    await userEvent.press(saveButton());
    for (const message of [
      "Enter a booking reference",
      "Enter a pick-up location",
      "Choose the rental dates",
      "Enter a pick-up time",
      "Enter a return time",
    ]) {
      expect(screen.getByText(message)).toBeOnTheScreen();
    }
    expect(screen.queryByText("Return must be after pick-up")).not.toBeOnTheScreen();
    expect(createCarMock).not.toHaveBeenCalled();
  });

  it("makes exactly one call on a double tap", async () => {
    let resolveCreate!: (value: unknown) => void;
    createCarMock.mockReturnValue(new Promise((resolve) => (resolveCreate = resolve)));
    await fillValid();
    const button = saveButton();
    await userEvent.press(button);
    await userEvent.press(button);
    resolveCreate({ ok: true, data: makeCar() });
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
    expect(createCarMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the form and the input, and shows the error in the form, when saving fails", async () => {
    createCarMock.mockResolvedValue({ ok: false, kind: "offline" });
    await fillValid();
    await userEvent.press(saveButton());
    expect(await screen.findByTestId("car-form-error")).toHaveTextContent("No connection. Check your internet and try again");
    expect(screen.getByTestId("car-form-booking-ref").props.value).toBe("RES-1");
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});
