import { screen, userEvent } from "@testing-library/react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { LegalScreen } from "../LegalScreen";

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
  mockRouter.canGoBack.mockReturnValue(true);
});

describe("LegalScreen (S11 / S12)", () => {
  it("terms: title and placeholder body in English", async () => {
    await renderWithProviders(<LegalScreen kind="terms" />);
    expect(screen.getByRole("header", { name: "Terms of Use" })).toBeOnTheScreen();
    expect(screen.getByText("Text will be added later")).toBeOnTheScreen();
  });

  it("privacy: title and placeholder body in Russian", async () => {
    await renderWithProviders(<LegalScreen kind="privacy" />, { locale: "ru" });
    expect(screen.getByRole("header", { name: "Политика конфиденциальности" })).toBeOnTheScreen();
    expect(screen.getByText("Текст будет добавлен позже")).toBeOnTheScreen();
  });

  it("'Back' returns to the previous screen", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<LegalScreen kind="terms" />);
    await user.press(screen.getByRole("button", { name: "Back" }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it("'Back' falls back to /sign-up when there is no history", async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    const user = userEvent.setup();
    await renderWithProviders(<LegalScreen kind="privacy" />);
    await user.press(screen.getByRole("button", { name: "Back" }));
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith("/sign-up");
  });
});
