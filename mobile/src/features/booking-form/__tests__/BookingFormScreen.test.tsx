import { fireEvent, screen, userEvent } from "@testing-library/react-native";

import { family } from "@/lib/theme";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { BookingFormScreen } from "../BookingFormScreen";
import { BOOKING_FORMS } from "../fields";
import type { BookingVariant } from "../fields";

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
  dismissAll: jest.fn(),
};
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));

beforeEach(() => {
  jest.clearAllMocks();
});

const EN_FIELDS: Record<BookingVariant, { title: string; texts: string[] }> = {
  flight: {
    title: "Flight",
    texts: ["From", "To", "Departure date", "Time", "Seat", "Ticket number"],
  },
  hotel: {
    title: "Hotel",
    texts: ["Name", "City", "Check-in", "Check-out", "Breakfasts"],
  },
  car: {
    title: "Car",
    texts: ["Company", "Pick-up", "Drop-off", "Dates"],
  },
};

describe("BookingFormScreen (S9)", () => {
  it.each(["flight", "hotel", "car"] as const)("renders the %s field set from fields.ts", async (variant) => {
    await renderWithProviders(<BookingFormScreen variant={variant} />);
    const { title, texts } = EN_FIELDS[variant];
    expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
    for (const label of texts) {
      const field = screen.getByLabelText(label);
      expect(field.props.editable).toBe(false);
    }
    // Field count in the data equals what the screen draws (text inputs only).
    const textCount = BOOKING_FORMS[variant].fields.filter((field) => field.kind === "text").length;
    expect(texts).toHaveLength(textCount);
    expect(screen.getByRole("button", { name: "Save" })).toBeOnTheScreen();
  });

  it("only the flight form has the baggage switch and the passenger stepper", async () => {
    const flight = await renderWithProviders(<BookingFormScreen variant="flight" />);
    expect(screen.getByRole("switch", { name: "Baggage included" })).toBeOnTheScreen();
    expect(screen.getByLabelText("Passengers, 2")).toBeOnTheScreen();
    flight.unmount();
    for (const variant of ["hotel", "car"] as const) {
      const view = await renderWithProviders(<BookingFormScreen variant={variant} />);
      expect(screen.queryByRole("switch")).not.toBeOnTheScreen();
      expect(screen.queryByLabelText(/Passengers/)).not.toBeOnTheScreen();
      view.unmount();
    }
  });

  it("shows a static '2' passengers value that pressing − and + does not change (Q15)", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<BookingFormScreen variant="flight" />);
    expect(screen.getByLabelText("Passengers, 2")).toHaveTextContent("2");
    await user.press(screen.getByRole("button", { name: "Increase passengers" }));
    await user.press(screen.getByRole("button", { name: "Decrease passengers" }));
    await user.press(screen.getByRole("button", { name: "Decrease passengers" }));
    expect(screen.getByLabelText("Passengers, 2")).toHaveTextContent("2");
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it("toggles the baggage switch locally without navigating", async () => {
    await renderWithProviders(<BookingFormScreen variant="flight" />);
    const toggle = screen.getByRole("switch", { name: "Baggage included" });
    expect(toggle).toBeChecked();
    fireEvent(toggle, "valueChange", false);
    expect(screen.getByRole("switch", { name: "Baggage included" })).not.toBeChecked();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it("draws ticket data fields in the mono face (AC-38)", async () => {
    await renderWithProviders(<BookingFormScreen variant="flight" />);
    for (const label of ["From", "To", "Seat", "Ticket number"]) {
      expect(screen.getByLabelText(label)).toHaveStyle({ fontFamily: family.mono });
    }
  });

  it.each(["flight", "hotel", "car"] as const)("closes with back() on every header button and Save (%s, AC-12)", async (variant) => {
    const user = userEvent.setup();
    await renderWithProviders(<BookingFormScreen variant={variant} />);
    for (const name of ["Cancel", "Done", "Save"]) {
      await user.press(screen.getByRole("button", { name }));
    }
    expect(mockRouter.back).toHaveBeenCalledTimes(3);
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("uses Russian copy in the ru locale", async () => {
    await renderWithProviders(<BookingFormScreen variant="flight" />, { locale: "ru" });
    expect(screen.getByRole("header", { name: "Рейс" })).toBeOnTheScreen();
    expect(screen.getByLabelText("Номер билета")).toBeOnTheScreen();
    expect(screen.getByLabelText("Пассажиры, 2")).toBeOnTheScreen();
    expect(screen.getByRole("switch", { name: "Багаж включён" })).toBeOnTheScreen();
  });

  it("gives every button a non-empty accessibility label (AC-19)", async () => {
    await renderWithProviders(<BookingFormScreen variant="flight" />);
    const buttons = screen.getAllByRole("button");
    // Cancel, Done, minus, plus, Save.
    expect(buttons).toHaveLength(5);
    for (const button of buttons) {
      expect(String(button.props.accessibilityLabel ?? "").length).toBeGreaterThan(0);
    }
  });
});
