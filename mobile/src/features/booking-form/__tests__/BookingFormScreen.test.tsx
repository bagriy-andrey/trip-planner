import { screen, userEvent } from "@testing-library/react-native";

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
  hotel: {
    title: "Hotel",
    texts: ["Name", "City", "Check-in", "Check-out", "Breakfasts"],
  },
  car: {
    title: "Car",
    texts: ["Company", "Pick-up", "Drop-off", "Dates"],
  },
};

describe("BookingFormScreen (S9, hotel/car stub — flight moved to segment-form)", () => {
  it.each(["hotel", "car"] as const)("renders the %s field set from fields.ts", async (variant) => {
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

  it("draws mono ticket-style data (check-in/out dates) in the mono face (AC-38)", async () => {
    await renderWithProviders(<BookingFormScreen variant="hotel" />);
    for (const label of ["Check-in", "Check-out"]) {
      expect(screen.getByLabelText(label)).toHaveStyle({ fontFamily: family.mono });
    }
    for (const label of ["Name", "City", "Breakfasts"]) {
      expect(screen.getByLabelText(label)).not.toHaveStyle({ fontFamily: family.mono });
    }
  });

  it("draws the car dates field in the mono face and the rest not (AC-38)", async () => {
    await renderWithProviders(<BookingFormScreen variant="car" />);
    expect(screen.getByLabelText("Dates")).toHaveStyle({ fontFamily: family.mono });
    for (const label of ["Company", "Pick-up", "Drop-off"]) {
      expect(screen.getByLabelText(label)).not.toHaveStyle({ fontFamily: family.mono });
    }
  });

  it.each(["hotel", "car"] as const)("closes with back() on every header button and Save (%s, AC-12)", async (variant) => {
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
    await renderWithProviders(<BookingFormScreen variant="hotel" />, { locale: "ru" });
    expect(screen.getByRole("header", { name: "Отель" })).toBeOnTheScreen();
    expect(screen.getByLabelText("Завтраки")).toBeOnTheScreen();
    expect(screen.getByLabelText("Название")).toBeOnTheScreen();
  });

  it("gives every button a non-empty accessibility label (AC-19)", async () => {
    await renderWithProviders(<BookingFormScreen variant="hotel" />);
    const buttons = screen.getAllByRole("button");
    // Cancel, Done, Save.
    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      expect(String(button.props.accessibilityLabel ?? "").length).toBeGreaterThan(0);
    }
  });
});
