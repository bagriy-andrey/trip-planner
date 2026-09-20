import { screen, userEvent, within } from "@testing-library/react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { HistoryScreen } from "../HistoryScreen";

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

describe("HistoryScreen (S5)", () => {
  it("renders the title, the avatar and the completed mock trips", async () => {
    await renderWithProviders(<HistoryScreen />);
    expect(screen.getByRole("header", { name: "History" })).toBeOnTheScreen();
    for (const id of ["trip-rome", "trip-prague", "trip-amsterdam"]) {
      const card = screen.getByTestId(`trip-card-${id}`);
      expect(within(card).getByText("completed")).toBeOnTheScreen();
    }
  });

  it("localizes to Russian", async () => {
    await renderWithProviders(<HistoryScreen />, { locale: "ru" });
    expect(screen.getByRole("header", { name: "История" })).toBeOnTheScreen();
    expect(screen.getAllByText("завершено")).toHaveLength(3);
  });

  it("gives the avatar and every card a non-empty accessibility label (AC-19)", async () => {
    await renderWithProviders(<HistoryScreen />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(4);
    for (const button of buttons) {
      expect(String(button.props.accessibilityLabel ?? "").length).toBeGreaterThan(0);
    }
    expect(screen.getByRole("button", { name: /^Rome, .*completed$/ })).toBeOnTheScreen();
  });

  it("switches to the profile tab from the avatar (Q1)", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<HistoryScreen />);
    await user.press(screen.getByRole("button", { name: "Open profile" }));
    expect(mockRouter.navigate).toHaveBeenCalledWith("/profile");
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("opens the trip details from a card", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<HistoryScreen />);
    await user.press(screen.getByTestId("trip-card-trip-rome"));
    expect(mockRouter.push).toHaveBeenCalledWith("/trips/trip-rome");
  });
});
