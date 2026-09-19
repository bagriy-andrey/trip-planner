import { screen, userEvent } from "@testing-library/react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { ForgotPasswordScreen } from "../ForgotPasswordScreen";
import { SignInScreen } from "../SignInScreen";
import { SignUpScreen } from "../SignUpScreen";

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

function expectNoNavigation() {
  expect(mockRouter.push).not.toHaveBeenCalled();
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(mockRouter.navigate).not.toHaveBeenCalled();
  expect(mockRouter.back).not.toHaveBeenCalled();
}

describe("SignInScreen (S2)", () => {
  it("renders title, fields and both social stubs with the 'soon' marker", async () => {
    await renderWithProviders(<SignInScreen />);
    expect(screen.getByText("Welcome back")).toBeOnTheScreen();
    expect(screen.getByText("or with email")).toBeOnTheScreen();
    expect(screen.getByLabelText("Email")).toBeOnTheScreen();
    expect(screen.getByLabelText("Password")).toBeOnTheScreen();
    expect(screen.getByTestId("social-apple")).toBeOnTheScreen();
    expect(screen.getByTestId("social-google")).toBeOnTheScreen();
    expect(screen.getAllByText("soon")).toHaveLength(2);
  });

  it("masks the password field", async () => {
    await renderWithProviders(<SignInScreen />);
    expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(true);
    expect(screen.getByLabelText("Email").props.secureTextEntry).toBeFalsy();
  });

  it("enters the tabs via replace('/trips') without any validation (AC-7)", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SignInScreen />);
    await user.press(screen.getByRole("button", { name: "Sign in" }));
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith("/trips");
  });

  it("goes to sign-up and forgot-password from the links", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SignInScreen />);
    await user.press(screen.getByRole("link", { name: "Create one" }));
    expect(mockRouter.navigate).toHaveBeenCalledWith("/sign-up");
    await user.press(screen.getByRole("link", { name: "Forgot password?" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/forgot-password");
  });

  it("social stubs are pressable and do nothing", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SignInScreen />);
    await user.press(screen.getByTestId("social-apple"));
    await user.press(screen.getByTestId("social-google"));
    expectNoNavigation();
  });

  it("renders Russian strings for the ru locale", async () => {
    await renderWithProviders(<SignInScreen />, { locale: "ru" });
    expect(screen.getByText("С возвращением")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Войти" })).toBeOnTheScreen();
    expect(screen.getAllByText("скоро")).toHaveLength(2);
  });
});

describe("SignUpScreen (S3)", () => {
  it("renders name, email and masked password fields", async () => {
    await renderWithProviders(<SignUpScreen />);
    expect(screen.getByText("Create account")).toBeOnTheScreen();
    expect(screen.getByLabelText("Name")).toBeOnTheScreen();
    expect(screen.getByLabelText("Email")).toBeOnTheScreen();
    expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(true);
    expect(screen.getAllByText("soon")).toHaveLength(2);
  });

  it("enters the tabs via replace('/trips') without any validation (AC-7)", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SignUpScreen />);
    await user.press(screen.getByRole("button", { name: "Sign up" }));
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith("/trips");
  });

  it("opens the two legal documents from the consent links", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SignUpScreen />);
    await user.press(screen.getByText("Terms of Use"));
    expect(mockRouter.push).toHaveBeenLastCalledWith("/legal/terms");
    await user.press(screen.getByText("Privacy Policy"));
    expect(mockRouter.push).toHaveBeenLastCalledWith("/legal/privacy");
  });

  it("goes to sign-in from the footer link", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SignUpScreen />);
    await user.press(screen.getByRole("link", { name: "Sign in" }));
    expect(mockRouter.navigate).toHaveBeenCalledWith("/sign-in");
  });

  it("renders the consent line in Russian", async () => {
    await renderWithProviders(<SignUpScreen />, { locale: "ru" });
    expect(screen.getByText("Условиями использования")).toBeOnTheScreen();
    expect(screen.getByText("Политикой конфиденциальности")).toBeOnTheScreen();
  });
});

describe("ForgotPasswordScreen (S10)", () => {
  it("renders title, description and the email field", async () => {
    await renderWithProviders(<ForgotPasswordScreen />);
    expect(screen.getByText("Reset password")).toBeOnTheScreen();
    expect(screen.getByLabelText("Email")).toBeOnTheScreen();
  });

  it("'Back' and 'Send link' both return to the previous screen", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<ForgotPasswordScreen />);
    await user.press(screen.getByRole("button", { name: "Back" }));
    await user.press(screen.getByRole("button", { name: "Send link" }));
    expect(mockRouter.back).toHaveBeenCalledTimes(2);
  });

  it("falls back to /sign-in when there is no history to go back to", async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    const user = userEvent.setup();
    await renderWithProviders(<ForgotPasswordScreen />);
    await user.press(screen.getByRole("button", { name: "Send link" }));
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith("/sign-in");
  });
});
