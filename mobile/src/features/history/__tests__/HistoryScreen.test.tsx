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

  it("takes the avatar initial from the session's display name, upper-cased (AC-27)", async () => {
    await renderWithProviders(<HistoryScreen />, {
      session: { user: { displayName: "  zoe Adler " } },
    });
    const avatar = screen.getByTestId("history-avatar");
    expect(within(avatar).getByText("Z", { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it("falls back to the email's local part for the initial when there is no display name (AC-26)", async () => {
    await renderWithProviders(<HistoryScreen />, {
      session: { user: { email: "bruno.k@example.com", displayName: null } },
    });
    const avatar = screen.getByTestId("history-avatar");
    expect(within(avatar).getByText("B", { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it("opens the trip details from a card", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<HistoryScreen />);
    await user.press(screen.getByTestId("trip-card-trip-rome"));
    expect(mockRouter.push).toHaveBeenCalledWith("/trips/trip-rome");
  });
});
