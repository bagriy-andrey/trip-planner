import { screen, userEvent } from "@testing-library/react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { NewTripScreen } from "../NewTripScreen";

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

describe("NewTripScreen (S8)", () => {
  it("renders the modal header, two inert fields and the save button", async () => {
    await renderWithProviders(<NewTripScreen />);
    expect(screen.getByRole("header", { name: "New trip" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Done" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Save" })).toBeOnTheScreen();
    for (const label of ["City", "Dates"]) {
      expect(screen.getByLabelText(label).props.editable).toBe(false);
    }
  });

  it.each(["Cancel", "Done", "Save"])("closes the modal with back() on '%s' (AC-12)", async (name) => {
    const user = userEvent.setup();
    await renderWithProviders(<NewTripScreen />);
    await user.press(screen.getByRole("button", { name }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("uses Russian copy in the ru locale", async () => {
    await renderWithProviders(<NewTripScreen />, { locale: "ru" });
    expect(screen.getByRole("header", { name: "Новая поездка" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Отмена" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeOnTheScreen();
  });
});
