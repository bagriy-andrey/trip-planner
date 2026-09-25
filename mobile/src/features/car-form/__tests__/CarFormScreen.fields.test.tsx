import { fireEvent, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";

import { createCar } from "@/features/cars/api";

import { fillValid, makeCar, renderCreate, resetProfileMock } from "./testKit";

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
const MAPS = "https://www.google.com/maps/place/Lisbon";
const saveButton = () => screen.getByRole("button", { name: "Save" });
const savedForm = () => createCarMock.mock.calls[0]?.[1] as Record<string, unknown>;

beforeEach(() => {
  jest.clearAllMocks();
  resetProfileMock();
  createCarMock.mockResolvedValue({ ok: true, data: makeCar() });
});

describe("segments (AC-10)", () => {
  it("are radiogroups; nothing is selected by default; a tap selects and a second tap clears", async () => {
    await renderCreate();
    for (const group of ["Insurance", "Fuel", "Payment status"]) {
      expect(screen.getByLabelText(group)).toHaveProp("accessibilityRole", "radiogroup");
    }
    expect(screen.queryAllByRole("radio", { checked: true })).toHaveLength(0);
    expect(screen.getAllByRole("radio")).toHaveLength(8);
    await userEvent.press(screen.getByRole("radio", { name: "With excess" }));
    expect(screen.getByRole("radio", { name: "With excess", checked: true })).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: "None", checked: false })).toBeOnTheScreen();
    await userEvent.press(screen.getByRole("radio", { name: "With excess" }));
    expect(screen.queryAllByRole("radio", { checked: true })).toHaveLength(0);
  });

  it("send the chosen values, and null when cleared", async () => {
    await fillValid();
    await userEvent.press(screen.getByRole("radio", { name: "Zero excess" }));
    await userEvent.press(screen.getByRole("radio", { name: "Full to full" }));
    await userEvent.press(screen.getByRole("radio", { name: "Paid" }));
    await userEvent.press(screen.getByRole("radio", { name: "Paid" }));
    await userEvent.press(saveButton());
    await waitFor(() => expect(createCarMock).toHaveBeenCalledTimes(1));
    expect(savedForm()).toMatchObject({ insurance: "full", fuelPolicy: "full_full", paymentStatus: null });
  });
});

describe("Return to same place (AC-24)", () => {
  it("off shows the required place; on hides it, sends null but keeps what was typed", async () => {
    await fillValid();
    await userEvent.press(screen.getByRole("switch", { name: "Return to same place" }));
    expect(screen.getByRole("switch", { name: "Return to same place", checked: false })).toBeOnTheScreen();
    await userEvent.press(saveButton());
    expect(screen.getByText("Enter a return location")).toBeOnTheScreen();
    expect(createCarMock).not.toHaveBeenCalled();

    await userEvent.type(screen.getByTestId("car-form-return-place"), "Faro");
    await userEvent.press(screen.getByRole("switch", { name: "Return to same place" }));
    expect(screen.queryByTestId("car-form-return-place")).not.toBeOnTheScreen();
    await userEvent.press(saveButton());
    await waitFor(() => expect(createCarMock).toHaveBeenCalledTimes(1));
    expect(savedForm()).toMatchObject({ returnSamePlace: true, returnPlace: null });

    await userEvent.press(screen.getByRole("switch", { name: "Return to same place" }));
    expect(screen.getByTestId("car-form-return-place").props.value).toBe("Faro");
  });

  it("off with a place sends it", async () => {
    await fillValid();
    await userEvent.press(screen.getByRole("switch", { name: "Return to same place" }));
    await userEvent.type(screen.getByTestId("car-form-return-place"), "Faro");
    await userEvent.press(saveButton());
    await waitFor(() => expect(createCarMock).toHaveBeenCalledTimes(1));
    expect(savedForm()).toMatchObject({ returnSamePlace: false, returnPlace: "Faro" });
  });
});

describe("maps link (AC-25)", () => {
  async function acceptLink(url: string) {
    await userEvent.type(screen.getByTestId("car-form-maps"), url);
    fireEvent(screen.getByTestId("car-form-maps"), "blur");
  }

  it("rejects a non-Google link with an error under the field", async () => {
    await renderCreate();
    await acceptLink("https://evil.example/maps");
    expect(await screen.findByText("A Google Maps link is required")).toBeOnTheScreen();
    expect(screen.queryByText("Link added")).not.toBeOnTheScreen();
  });

  it("accepts a link, shows 'Link added' without printing it, and removes it with the cross", async () => {
    await renderCreate();
    await acceptLink(MAPS);
    expect(await screen.findByText("Link added")).toBeOnTheScreen();
    expect(screen.queryByText(MAPS)).not.toBeOnTheScreen();
    await userEvent.press(screen.getByRole("button", { name: "Remove link" }));
    expect(screen.getByTestId("car-form-maps").props.value).toBe("");
  });

  it("opens the checked link with Linking.openURL and reports a refusal in the form", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValueOnce(true).mockRejectedValueOnce(new Error("no"));
    await renderCreate();
    await acceptLink(MAPS);
    await userEvent.press(await screen.findByRole("button", { name: "Open" }));
    expect(open).toHaveBeenCalledWith(MAPS);
    await userEvent.press(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByText("Could not open the link")).toBeOnTheScreen();
    open.mockRestore();
  });

  it("saves the accepted link", async () => {
    await fillValid();
    await userEvent.type(screen.getByTestId("car-form-maps"), MAPS);
    await userEvent.press(saveButton());
    await waitFor(() => expect(createCarMock).toHaveBeenCalledTimes(1));
    expect(savedForm()).toMatchObject({ mapsUrl: MAPS });
  });
});

describe("phone (AC-26)", () => {
  it("shows phone.invalid after leaving the field and blocks saving; a valid phone is sent as typed", async () => {
    await fillValid();
    await userEvent.type(screen.getByTestId("car-form-phone"), "12");
    fireEvent(screen.getByTestId("car-form-phone"), "blur");
    expect(await screen.findByText("Enter a valid phone number")).toBeOnTheScreen();
    await userEvent.press(saveButton());
    expect(createCarMock).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByTestId("car-form-phone"));
    await userEvent.type(screen.getByTestId("car-form-phone"), "+351 308 810 777");
    await userEvent.press(saveButton());
    await waitFor(() => expect(createCarMock).toHaveBeenCalledTimes(1));
    expect(savedForm()).toMatchObject({ phone: "+351 308 810 777" });
  });
});

describe("cost, deposit and currency (AC-27, AC-28)", () => {
  it("filters the amount to price characters", async () => {
    await renderCreate();
    const amount = screen.getByTestId("car-form-cost-amount");
    await userEvent.type(amount, "-1a 2e,5x99");
    expect(amount.props.value).toBe("12,59");
  });

  it("asks for a currency under the currency field when an amount is filled", async () => {
    await fillValid();
    await userEvent.type(screen.getByTestId("car-form-cost-amount"), "120.50");
    await userEvent.press(saveButton());
    // The caption turns into the "required" hint and the error repeats it under the button.
    expect(screen.getAllByText("Choose a currency")).toHaveLength(2);
    expect(createCarMock).not.toHaveBeenCalled();
  });

  it("a deposit alone also needs the currency; the deposit label carries the chosen code", async () => {
    await fillValid();
    await userEvent.press(screen.getByRole("button", { name: "Additional fields" }));
    expect(screen.getByTestId("car-form-deposit")).toBeOnTheScreen();
    expect(screen.getByText("Card deposit")).toBeOnTheScreen();
    await userEvent.type(screen.getByTestId("car-form-deposit"), "300");
    await userEvent.press(saveButton());
    expect(createCarMock).not.toHaveBeenCalled();

    await userEvent.press(screen.getByTestId("car-form-cost-currency"));
    await userEvent.press(screen.getByTestId("car-form-currency-sheet-item-EUR"));
    await waitFor(() => expect(screen.queryByTestId("car-form-currency-sheet")).not.toBeOnTheScreen());
    expect(screen.getByText("Card deposit · EUR")).toBeOnTheScreen();
    await userEvent.type(screen.getByTestId("car-form-cost-amount"), "120.5");
    await userEvent.press(saveButton());
    await waitFor(() => expect(createCarMock).toHaveBeenCalledTimes(1));
    expect(savedForm()).toMatchObject({ money: { currency: "EUR", cost: "120.50", deposit: "300.00" } });
  });

  it("a currency without any amount saves as no money, without an error", async () => {
    resetProfileMock("EUR");
    await fillValid();
    await waitFor(() => expect(screen.getByTestId("car-form-cost-currency").props.accessibilityLabel).toBe("Currency: EUR"));
    await userEvent.press(saveButton());
    await waitFor(() => expect(createCarMock).toHaveBeenCalledTimes(1));
    expect(savedForm()).toMatchObject({ money: null });
  });
});
