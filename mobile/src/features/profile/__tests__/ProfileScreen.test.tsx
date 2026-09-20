import { screen, userEvent, within } from "@testing-library/react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { ProfileHeader } from "../components/ProfileHeader";
import { ProfileScreen } from "../ProfileScreen";

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

const SOON_ROWS = ["row-notifications", "row-connected-accounts", "row-currency"];

describe("ProfileScreen (S6)", () => {
  it("renders the header, the theme row, three stub rows and sign-out", async () => {
    await renderWithProviders(<ProfileScreen />);
    expect(screen.getByRole("header", { name: "Profile" })).toBeOnTheScreen();
    expect(screen.getByTestId("profile-name")).toHaveTextContent("Anna Kowalska");
    expect(screen.getByTestId("profile-email")).toHaveTextContent("anna.kowalska@example.com");
    expect(screen.getByLabelText("Appearance")).toBeOnTheScreen();
    for (const id of SOON_ROWS) {
      expect(screen.getByTestId(id)).toBeOnTheScreen();
    }
    expect(screen.getByRole("button", { name: "Sign out" })).toBeOnTheScreen();
  });

  it("shows the connected-account and currency values", async () => {
    await renderWithProviders(<ProfileScreen />);
    expect(within(screen.getByTestId("row-connected-accounts")).getByText("Booking.com")).toBeOnTheScreen();
    expect(within(screen.getByTestId("row-currency")).getByText("EUR")).toBeOnTheScreen();
  });

  it("marks every stub row with 'soon' and announces it (Q7)", async () => {
    await renderWithProviders(<ProfileScreen />);
    for (const id of SOON_ROWS) {
      const row = screen.getByTestId(id);
      expect(within(row).getByText("soon")).toBeOnTheScreen();
      expect(row.props.accessibilityHint).toBe("Coming soon");
      expect(String(row.props.accessibilityLabel).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText("soon")).toHaveLength(SOON_ROWS.length);
  });

  it("does not navigate anywhere when a stub row is pressed (Q7)", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<ProfileScreen />);
    for (const id of SOON_ROWS) {
      await user.press(screen.getByTestId(id));
    }
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it.each(["en", "ru"] as const)("has no language-selection row in %s (AC-40)", async (locale) => {
    await renderWithProviders(<ProfileScreen />, { locale });
    expect(screen.queryByText(/language|язык/i)).not.toBeOnTheScreen();
    // The only selector is the theme one, with exactly its three options.
    expect(screen.getAllByLabelText(locale === "en" ? "Appearance" : "Тема оформления")).toHaveLength(1);
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("localizes to Russian", async () => {
    await renderWithProviders(<ProfileScreen />, { locale: "ru" });
    expect(screen.getByRole("radio", { name: "Светлая" })).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: "Тёмная" })).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: "Системная" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Выйти" })).toBeOnTheScreen();
    expect(screen.getAllByText("скоро")).toHaveLength(SOON_ROWS.length);
  });

  it("wraps a very long name to at most two lines without throwing", async () => {
    await renderWithProviders(
      <ProfileHeader name="Alexandra-Catherine Konstantinopolitanskaya-Ivanovna" email="long@example.com" />,
    );
    expect(screen.getByTestId("profile-name").props.numberOfLines).toBe(2);
  });

  it("signs out by dismissing to the root, then replacing with onboarding (AC-13)", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<ProfileScreen />);
    await user.press(screen.getByRole("button", { name: "Sign out" }));
    expect(mockRouter.dismissAll).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith("/onboarding");
    const dismissOrder = mockRouter.dismissAll.mock.invocationCallOrder[0] ?? 0;
    const replaceOrder = mockRouter.replace.mock.invocationCallOrder[0] ?? 0;
    expect(dismissOrder).toBeLessThan(replaceOrder);
  });
});
