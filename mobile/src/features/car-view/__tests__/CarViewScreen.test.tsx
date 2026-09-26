import { act, screen, userEvent } from "@testing-library/react-native";
import type { Car } from "@tripplanner/shared";
import { Linking } from "react-native";

import { getCar } from "@/features/cars/api";
import { carKeys } from "@/features/cars";
import { createQueryClient } from "@/lib/query";
import { copyText } from "@/platform/clipboard";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { COPIED_FEEDBACK_MS } from "../constants";
import { CarViewScreen } from "../CarViewScreen";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("@/features/cars/api", () => ({ ...jest.requireActual("@/features/cars/api"), getCar: jest.fn() }));
jest.mock("@/platform/clipboard", () => ({ copyText: jest.fn() }));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));

const CAR_ID = "0b0e7d6e-6c1b-4a51-9d4e-3b1c1f6f2a11";
const SIGNED_IN = { session: { user: {} } } as const;
const getCarMock = getCar as jest.Mock;
const copyMock = copyText as jest.Mock;

function makeCar(overrides: Partial<Car> = {}): Car {
  return {
    id: CAR_ID,
    tripId: "trip-1",
    source: "manual",
    bookingRef: "RES-1",
    company: "Hertz",
    pickupPlace: "Lisbon Airport",
    pickupDate: "2026-08-19",
    pickupTime: "11:00",
    returnDate: "2026-08-27",
    returnTime: "09:30",
    returnSamePlace: true,
    returnPlace: null,
    mapsUrl: null,
    address: null,
    phone: null,
    carClass: null,
    insurance: null,
    fuelPolicy: null,
    paymentStatus: null,
    money: null,
    extraDriver: false,
    notes: null,
    ...overrides,
  };
}

const FULL = makeCar({
  carClass: "Group D2",
  mapsUrl: "https://maps.app.goo.gl/abc",
  address: "Terminal 1, Lisbon",
  phone: "+351 (21) 123-4567",
  insurance: "full",
  fuelPolicy: "full_full",
  paymentStatus: "paid",
  money: { currency: "EUR", cost: "383.35", deposit: "300.00" },
  extraDriver: true,
  notes: "Ask for the garage level 2",
});

async function open(car: Car, locale: "en" | "ru" = "en") {
  getCarMock.mockResolvedValue({ ok: true, data: car });
  const result = await renderWithProviders(<CarViewScreen tripId="trip-1" carId={CAR_ID} />, {
    ...SIGNED_IN,
    locale,
  });
  await screen.findByTestId("car-view-body");
  return result;
}

beforeEach(() => {
  jest.clearAllMocks();
  copyMock.mockResolvedValue(true);
});

describe("CarViewScreen header and layout (AC-43, AC-44, AC-53)", () => {
  it("shows the header, edits via S16b and goes back", async () => {
    await open(FULL);
    expect(screen.getByText("Car rental")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeOnTheScreen();
    await userEvent.press(screen.getByRole("button", { name: "More actions" }));
    await userEvent.press(screen.getByRole("button", { name: "Edit" }));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/trips/[tripId]/cars/[carId]",
      params: { tripId: "trip-1", carId: CAR_ID },
    });
    await userEvent.press(screen.getByRole("button", { name: "Back" }));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("draws the cards in order with the moments and places", async () => {
    await open(FULL);
    expect(screen.getByText("Hertz")).toBeOnTheScreen();
    expect(screen.getByText("Group D2")).toBeOnTheScreen();
    expect(screen.getByTestId("car-view-booking-ref")).toHaveTextContent("RES-1");
    expect(screen.getByText("Wed, Aug 19 · 11:00 AM")).toBeOnTheScreen();
    expect(screen.getByText("Lisbon Airport")).toBeOnTheScreen();
    expect(screen.getByText("Same place")).toBeOnTheScreen();
    expect(screen.getByText("Terminal 1, Lisbon")).toBeOnTheScreen();
    expect(screen.getByTestId("car-view-notes")).toHaveTextContent("Ask for the garage level 2");
  });

  it("falls back to 'Car rental' without a company and hides empty cards", async () => {
    await open(makeCar({ company: null }));
    expect(screen.getAllByText("Car rental")).toHaveLength(2);
    expect(screen.queryByText("Office")).not.toBeOnTheScreen();
    expect(screen.queryByTestId("car-view-notes")).not.toBeOnTheScreen();
    expect(screen.queryByTestId("car-view-terms-insurance")).not.toBeOnTheScreen();
    expect(screen.getByTestId("car-view-terms-extraDriver")).toHaveTextContent(/No$/);
  });

  it("shows the return place when it differs", async () => {
    await open(makeCar({ returnSamePlace: false, returnPlace: "Porto Station" }));
    expect(screen.getByText("Porto Station")).toBeOnTheScreen();
    expect(screen.queryByText("Same place")).not.toBeOnTheScreen();
  });

  it("keeps every control at least 44pt", async () => {
    await open(FULL);
    for (const name of ["Copy", "Directions", "Call", "More actions", "Back"]) {
      const style = screen.getByRole("button", { name }).props.style;
      const flat = Array.isArray(style) ? Object.assign({}, ...style.flat(2).filter(Boolean)) : style;
      expect(flat.minHeight).toBeGreaterThanOrEqual(44);
    }
  });
});

describe("terms formatting (AC-48)", () => {
  it("formats payment, insurance, fuel, extra driver and deposit in English", async () => {
    await open(FULL);
    expect(screen.getByTestId("car-view-terms-payment")).toHaveTextContent(/383\.35 EUR · paid$/);
    expect(screen.getByTestId("car-view-terms-insurance")).toHaveTextContent(/Full, zero excess$/);
    expect(screen.getByTestId("car-view-terms-fuel")).toHaveTextContent(/Full to full$/);
    expect(screen.getByTestId("car-view-terms-extraDriver")).toHaveTextContent(/Yes$/);
    expect(screen.getByTestId("car-view-terms-deposit")).toHaveTextContent(/300\.00 EUR$/);
  });

  it("formats them in Russian", async () => {
    await open(FULL, "ru");
    expect(screen.getByTestId("car-view-terms-payment")).toHaveTextContent(/383,35\s+EUR · оплачено/);
    expect(screen.getByTestId("car-view-terms-insurance")).toHaveTextContent(/Полная, без франшизы$/);
    expect(screen.getByTestId("car-view-terms-fuel")).toHaveTextContent(/Бак в бак$/);
  });

  it("shows only the status without an amount, and only the amount without a status", async () => {
    await open(makeCar({ paymentStatus: "on_site" }));
    expect(screen.getByTestId("car-view-terms-payment")).toHaveTextContent(/pay on site$/);
    expect(screen.getByTestId("car-view-terms-payment")).not.toHaveTextContent(/EUR$/);
  });

  it("shows only the amount without a status", async () => {
    await open(makeCar({ money: { currency: "EUR", cost: "10.00", deposit: null } }));
    expect(screen.getByTestId("car-view-terms-payment")).toHaveTextContent(/10\.00 EUR$/);
    expect(screen.getByTestId("car-view-terms-payment")).not.toHaveTextContent(/·$/);
    expect(screen.queryByTestId("car-view-terms-deposit")).not.toBeOnTheScreen();
  });
});

describe("copy booking reference (AC-45)", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("copies, says Copied for 1.5 s, then goes back", async () => {
    jest.useFakeTimers();
    await open(FULL);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.press(screen.getByRole("button", { name: "Copy" }));
    expect(copyMock).toHaveBeenCalledWith("RES-1");
    expect(screen.getByRole("button", { name: "Copied" })).toBeOnTheScreen();
    act(() => {
      jest.advanceTimersByTime(COPIED_FEEDBACK_MS - 1);
    });
    expect(screen.getByRole("button", { name: "Copied" })).toBeOnTheScreen();
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.getByRole("button", { name: "Copy" })).toBeOnTheScreen();
  });

  it("keeps the label and shows an on-screen error when copying fails", async () => {
    copyMock.mockResolvedValue(false);
    await open(FULL);
    await userEvent.press(screen.getByRole("button", { name: "Copy" }));
    expect(screen.getByRole("button", { name: "Copy" })).toBeOnTheScreen();
    expect(screen.getByTestId("car-view-copy-error")).toHaveTextContent("Could not copy");
  });
});

describe("office actions (AC-46, AC-47)", () => {
  it("opens the stored maps link", async () => {
    const spy = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    await open(FULL);
    await userEvent.press(screen.getByRole("button", { name: "Directions" }));
    expect(spy).toHaveBeenCalledWith("https://maps.app.goo.gl/abc");
  });

  it("shows an error when the link fails re-validation or opening", async () => {
    const spy = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    await open(makeCar({ mapsUrl: "https://evil.example/maps" }));
    await userEvent.press(screen.getByRole("button", { name: "Directions" }));
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByTestId("car-view-office-error")).toHaveTextContent("Could not open the map");
  });

  it("shows an error when openURL rejects", async () => {
    jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("nope"));
    await open(FULL);
    await userEvent.press(screen.getByRole("button", { name: "Directions" }));
    expect(screen.getByTestId("car-view-office-error")).toBeOnTheScreen();
  });

  it("calls with the cleaned phone", async () => {
    const spy = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    await open(FULL);
    await userEvent.press(screen.getByRole("button", { name: "Call" }));
    expect(spy).toHaveBeenCalledWith("tel:+351211234567");
  });

  it("hides the missing button, and the card when nothing is left", async () => {
    await open(makeCar({ address: "Somewhere", phone: "+351211234567" }));
    expect(screen.queryByRole("button", { name: "Directions" })).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Call" })).toBeOnTheScreen();
  });

  it("draws no button row with only an address", async () => {
    await open(makeCar({ address: "Somewhere" }));
    expect(screen.getByText("Office")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Call" })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Directions" })).not.toBeOnTheScreen();
  });
});

describe("states (AC-32, AC-49a)", () => {
  it("shows 'Rental not found'", async () => {
    getCarMock.mockResolvedValue({ ok: false, kind: "notFound" });
    await renderWithProviders(<CarViewScreen tripId="trip-1" carId={CAR_ID} />, SIGNED_IN);
    expect(await screen.findByText("Rental not found")).toBeOnTheScreen();
    await userEvent.press(screen.getByRole("button", { name: "Back to trip" }));
    expect(mockRouter.back).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeOnTheScreen();
  });

  it("shows a load error with retry when there is no data", async () => {
    getCarMock.mockResolvedValueOnce({ ok: false, kind: "offline" });
    await renderWithProviders(<CarViewScreen tripId="trip-1" carId={CAR_ID} />, SIGNED_IN);
    expect(await screen.findByTestId("car-view-load-error")).toBeOnTheScreen();
    getCarMock.mockResolvedValue({ ok: true, data: FULL });
    await userEvent.press(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByTestId("car-view-body")).toBeOnTheScreen();
  });

  it("shows the record from the session cache without the network", async () => {
    getCarMock.mockResolvedValue({ ok: false, kind: "offline" });
    const queryClient = createQueryClient();
    queryClient.setQueryData(carKeys.ofTrip("trip-1"), [FULL]);
    await renderWithProviders(<CarViewScreen tripId="trip-1" carId={CAR_ID} />, { ...SIGNED_IN, queryClient });
    expect(await screen.findByTestId("car-view-body")).toBeOnTheScreen();
    expect(screen.getByText("Hertz")).toBeOnTheScreen();
    expect(screen.queryByTestId("car-view-load-error")).not.toBeOnTheScreen();
  });
});
