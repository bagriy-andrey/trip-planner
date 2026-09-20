import { screen, userEvent } from "@testing-library/react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { APP_NAME } from "../../../../app.constants";
import { OnboardingScreen } from "../OnboardingScreen";

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
};
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("OnboardingScreen (S1)", () => {
  it("shows the app name from APP_NAME (AC-2)", async () => {
    await renderWithProviders(<OnboardingScreen />);
    expect(screen.getByText(APP_NAME)).toBeOnTheScreen();
  });

  it("shows title, subtitle and a static page indicator in English", async () => {
    await renderWithProviders(<OnboardingScreen />);
    expect(screen.getByText("All your trips in one place")).toBeOnTheScreen();
    expect(screen.getByLabelText("Page 1 of 3")).toBeOnTheScreen();
  });

  it("renders Russian strings for the ru locale", async () => {
    await renderWithProviders(<OnboardingScreen />, { locale: "ru" });
    expect(screen.getByText("Все поездки — в одном месте")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Начать" })).toBeOnTheScreen();
  });

  it("opens /sign-up from the start button (AC-6)", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<OnboardingScreen />);
    await user.press(screen.getByRole("button", { name: "Get started" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/sign-up");
  });

  it("opens /sign-in from the 'Sign in' link (AC-6)", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<OnboardingScreen />);
    await user.press(screen.getByRole("link", { name: "Sign in" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/sign-in");
  });
});
