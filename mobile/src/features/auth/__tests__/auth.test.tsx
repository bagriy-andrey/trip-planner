// Structure, the Apple/Google stubs and the links of S2/S3 (SPEC-01 behaviour that SPEC-02 keeps,
// AC-49). What S2/S3/S10/S10b DO on submit — validation, api calls, errors — lives in the
// per-screen files next to this one; the old "Sign in enters the tabs without checks" tests
// (SPEC-01 AC-7) are gone, replaced by that behaviour.
import { screen, userEvent } from "@testing-library/react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { SignInScreen } from "../SignInScreen";
import { SignUpScreen } from "../SignUpScreen";
import { mockRouter, mockedApi } from "./testKit";

jest.mock("expo-router", () => ({ useRouter: () => jest.requireActual("./testKit").mockRouter }));
jest.mock("../api", () => ({
  signIn: jest.fn(),
  signUp: jest.fn(),
  requestPasswordReset: jest.fn(),
  verifyRecoveryCodeAndSetPassword: jest.fn(),
  updatePassword: jest.fn(),
  signOut: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

function expectNoNavigation() {
  expect(mockRouter.push).not.toHaveBeenCalled();
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(mockRouter.navigate).not.toHaveBeenCalled();
  expect(mockRouter.back).not.toHaveBeenCalled();
}

function expectNoAuthCalls() {
  for (const call of Object.values(mockedApi)) {
    if (typeof call === "function") expect(call).not.toHaveBeenCalled();
  }
}

describe("SignInScreen (S2)", () => {
  it("renders title, subtitle, fields and both social stubs with the 'soon' marker", async () => {
    await renderWithProviders(<SignInScreen />);
    expect(screen.getByText("Welcome back")).toBeOnTheScreen();
    expect(screen.getByText("Sign in to sync your trips")).toBeOnTheScreen();
    expect(screen.getByText("or with email")).toBeOnTheScreen();
    expect(screen.getByLabelText("Email")).toBeOnTheScreen();
    expect(screen.getByLabelText("Password")).toBeOnTheScreen();
    expect(screen.getByTestId("social-apple")).toBeOnTheScreen();
    expect(screen.getByTestId("social-google")).toBeOnTheScreen();
    expect(screen.getAllByText("soon")).toHaveLength(2);
  });

  it("masks the password field and shows the design placeholders", async () => {
    await renderWithProviders(<SignInScreen />);
    expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(true);
    expect(screen.getByLabelText("Email").props.secureTextEntry).toBeFalsy();
    expect(screen.getByLabelText("Email").props.placeholder).toBe("you@example.com");
  });

  it("goes to sign-up and forgot-password from the links", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SignInScreen />);
    await user.press(screen.getByRole("link", { name: "Create one" }));
    expect(mockRouter.navigate).toHaveBeenCalledWith("/sign-up");
    await user.press(screen.getByRole("link", { name: "Forgot password?" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/forgot-password");
  });

  it("social stubs are pressable and do nothing (AC-49)", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SignInScreen />);
    await user.press(screen.getByTestId("social-apple"));
    await user.press(screen.getByTestId("social-google"));
    expectNoNavigation();
    expectNoAuthCalls();
  });

  it("renders Russian strings for the ru locale", async () => {
    await renderWithProviders(<SignInScreen />, { locale: "ru" });
    expect(screen.getByText("С возвращением")).toBeOnTheScreen();
    expect(screen.getByText("Войдите, чтобы синхронизировать поездки")).toBeOnTheScreen();
    expect(screen.getByLabelText("Email")).toBeOnTheScreen();
    expect(screen.getByLabelText("Пароль")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Войти" })).toBeOnTheScreen();
    expect(screen.getAllByText("скоро")).toHaveLength(2);
  });
});

describe("SignUpScreen (S3)", () => {
  it("renders name, email and masked password fields with the social stubs", async () => {
    await renderWithProviders(<SignUpScreen />);
    expect(screen.getByText("Create account")).toBeOnTheScreen();
    expect(screen.getByText("One trip, every detail at hand")).toBeOnTheScreen();
    expect(screen.getByLabelText("Name")).toBeOnTheScreen();
    expect(screen.getByLabelText("Email")).toBeOnTheScreen();
    expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(true);
    expect(screen.getAllByText("soon")).toHaveLength(2);
  });

  it("social stubs are pressable and do nothing (AC-49)", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SignUpScreen />);
    await user.press(screen.getByTestId("social-apple"));
    await user.press(screen.getByTestId("social-google"));
    expectNoNavigation();
    expectNoAuthCalls();
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
