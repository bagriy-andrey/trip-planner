import { act, fireEvent, screen, userEvent, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";
import { darkTokens } from "@/lib/theme";

import { SignInScreen } from "../SignInScreen";
import { resetFlowStateForTests, setSignInPrefill } from "../flowState";
import { SESSION_OK, deferred, erroredField, field, mockRouter, mockedApi } from "./testKit";

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
  resetFlowStateForTests();
  mockRouter.canGoBack.mockReturnValue(true);
});

const VALID = { email: "anna@example.com", password: "correct-horse" };

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, email = VALID.email, password = VALID.password) {
  await user.type(field("Email"), email);
  await user.type(field("Password"), password);
  await user.press(screen.getByRole("button", { name: "Sign in" }));
}

describe("SignInScreen (S2) — success and validation", () => {
  it("signs in with the normalised email and opens /trips (AC-15, AC-17)", async () => {
    mockedApi.signIn.mockResolvedValue(SESSION_OK);
    const user = userEvent.setup();
    await renderWithProviders(<SignInScreen />);
    await fillAndSubmit(user, "  Anna@Example.COM ");
    expect(mockedApi.signIn).toHaveBeenCalledTimes(1);
    expect(mockedApi.signIn).toHaveBeenCalledWith({ email: "anna@example.com", password: VALID.password });
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/trips"));
  });

  it("shows field errors under the fields and calls no api for invalid input (AC-12 style, AC-36)", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SignInScreen />);
    await user.type(field("Email"), "not an email");
    await user.type(field("Password"), "short");
    await user.press(screen.getByRole("button", { name: "Sign in" }));
    expect(erroredField("Email", "Enter a valid email")).toBeOnTheScreen();
    expect(erroredField("Password", "At least 8 characters")).toBeOnTheScreen();
    expect(mockedApi.signIn).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("clears a field error as soon as the field is edited", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SignInScreen />);
    await user.press(screen.getByRole("button", { name: "Sign in" }));
    expect(erroredField("Email", "Enter a valid email")).toBeOnTheScreen();
    await user.type(erroredField("Email", "Enter a valid email"), "a");
    expect(field("Email")).toBeOnTheScreen();
  });

  it("moves from the email to the password with the keyboard and submits from the last field (AC-38)", async () => {
    mockedApi.signIn.mockResolvedValue(SESSION_OK);
    const user = userEvent.setup();
    await renderWithProviders(<SignInScreen />);
    expect(field("Email").props.returnKeyType).toBe("next");
    expect(field("Password").props.returnKeyType).toBe("go");
    await user.type(field("Email"), VALID.email);
    await user.type(field("Password"), VALID.password);
    fireEvent(field("Password"), "submitEditing");
    await waitFor(() => expect(mockedApi.signIn).toHaveBeenCalledTimes(1));
  });

  it("uses email and current-password presets (AC-38)", async () => {
    await renderWithProviders(<SignInScreen />);
    expect(field("Email").props).toMatchObject({
      keyboardType: "email-address",
      autoCapitalize: "none",
      autoCorrect: false,
      textContentType: "emailAddress",
    });
    expect(field("Password").props).toMatchObject({
      secureTextEntry: true,
      textContentType: "password",
      autoCapitalize: "none",
    });
  });
});

describe("SignInScreen (S2) — errors from the api", () => {
  it("shows one identical text for wrong password and unknown account, keeping the email (AC-16)", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SignInScreen />);
    mockedApi.signIn.mockResolvedValue({ ok: false, kind: "invalidCredentials" });
    await fillAndSubmit(user);
    const first = (await screen.findByTestId("sign-in-error")).props.children;
    expect(first).toBe("Incorrect email or password");
    expect(field("Email").props.value).toBe(VALID.email);

    // A different account/password pair maps to the very same kind, hence the very same text.
    await user.clear(field("Email"));
    await user.type(field("Email"), "nobody@example.com");
    await user.press(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(mockedApi.signIn).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("sign-in-error").props.children).toBe(first);
  });

  it("shows a separate text for rate limiting (AC-18)", async () => {
    const user = userEvent.setup();
    mockedApi.signIn.mockResolvedValue({ ok: false, kind: "rateLimited" });
    await renderWithProviders(<SignInScreen />);
    await fillAndSubmit(user);
    expect((await screen.findByTestId("sign-in-error")).props.children).toBe(
      "Too many attempts, please try again later",
    );
  });

  it("keeps the typed values on a network error and retries with one tap (AC-19)", async () => {
    const user = userEvent.setup();
    mockedApi.signIn.mockResolvedValueOnce({ ok: false, kind: "offline" });
    await renderWithProviders(<SignInScreen />);
    await fillAndSubmit(user);
    expect((await screen.findByTestId("sign-in-error")).props.children).toBe(
      "No connection. Check your internet and try again",
    );
    expect(field("Email").props.value).toBe(VALID.email);
    expect(field("Password").props.value).toBe(VALID.password);

    mockedApi.signIn.mockResolvedValueOnce(SESSION_OK);
    await user.press(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/trips"));
    expect(mockedApi.signIn).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("sign-in-error")).not.toBeOnTheScreen();
  });

  it("shows only a generic text for an unknown error, never server text (AC-37)", async () => {
    const user = userEvent.setup();
    // The api never returns server text; even if a stray field slipped through, it is not rendered.
    mockedApi.signIn.mockResolvedValue({ ok: false, kind: "unknown", message: "PG::Error secret detail" } as never);
    await renderWithProviders(<SignInScreen />);
    await fillAndSubmit(user);
    expect((await screen.findByTestId("sign-in-error")).props.children).toBe(
      "Something went wrong. Please try again",
    );
    expect(screen.queryByText(/PG::Error/)).not.toBeOnTheScreen();
  });

  it("renders the wrong-credentials error in Russian", async () => {
    const user = userEvent.setup();
    mockedApi.signIn.mockResolvedValue({ ok: false, kind: "invalidCredentials" });
    await renderWithProviders(<SignInScreen />, { locale: "ru" });
    await user.type(field("Email"), VALID.email);
    await user.type(field("Пароль"), VALID.password);
    await user.press(screen.getByRole("button", { name: "Войти" }));
    expect((await screen.findByTestId("sign-in-error")).props.children).toBe("Неверный email или пароль");
  });
});

describe("SignInScreen (S2) — single flight (AC-14)", () => {
  it("makes exactly one api call for a double/triple tap and shows the spinner inside the button", async () => {
    const pending = deferred<never>();
    mockedApi.signIn.mockReturnValue(pending.promise);
    const user = userEvent.setup();
    await renderWithProviders(<SignInScreen />);
    await user.type(field("Email"), VALID.email);
    await user.type(field("Password"), VALID.password);
    const button = screen.getByRole("button", { name: "Sign in" });
    await user.press(button);
    // The keyboard path is not blocked by the disabled button: the ref guard has to hold.
    fireEvent(field("Password"), "submitEditing");
    fireEvent(field("Password"), "submitEditing");
    await user.press(button);
    expect(mockedApi.signIn).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("sign-in-submit-spinner")).toBeOnTheScreen();
    expect(screen.getByTestId("sign-in-submit").props.accessibilityState).toMatchObject({ disabled: true });

    await act(async () => {
      pending.resolve(SESSION_OK);
    });
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  });
});

describe("SignInScreen (S2) — links, prefill, styling", () => {
  it("'Forgot password?' is textSecondary with a >= 44 pt hit area (AC-41)", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SignInScreen />, { themePreference: "dark" });
    const link = screen.getByRole("link", { name: "Forgot password?" });
    const flat = StyleSheet.flatten(link.props.style);
    expect(flat.minHeight).toBeGreaterThanOrEqual(44);
    expect(flat.minWidth).toBeGreaterThanOrEqual(44);
    const text = screen.getByText("Forgot password?");
    expect(StyleSheet.flatten(text.props.style).color).toBe(darkTokens.textSecondary);
    await user.press(link);
    expect(mockRouter.push).toHaveBeenCalledWith("/forgot-password");
  });

  it("prefills the email that S3 left in the flow state, also when S2 is already mounted (AC-13)", async () => {
    await renderWithProviders(<SignInScreen />);
    expect(field("Email").props.value).toBe("");
    act(() => setSignInPrefill("taken@example.com"));
    await waitFor(() => expect(field("Email").props.value).toBe("taken@example.com"));
  });

  it("prefills on mount when the flow state is already set", async () => {
    setSignInPrefill("taken@example.com");
    await renderWithProviders(<SignInScreen />);
    expect(field("Email").props.value).toBe("taken@example.com");
  });
});
