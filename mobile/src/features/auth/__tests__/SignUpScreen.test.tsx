import { act, screen, userEvent, waitFor } from "@testing-library/react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { SignUpScreen } from "../SignUpScreen";
import { getSignInPrefill, resetFlowStateForTests } from "../flowState";
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
});

const VALID = { name: "Anna", email: "anna@example.com", password: "correct-horse" };

type User = ReturnType<typeof userEvent.setup>;

async function fill(user: User, values: Partial<typeof VALID> = {}) {
  const { name, email, password } = { ...VALID, ...values };
  await user.type(field("Name"), name);
  await user.type(field("Email"), email);
  await user.type(field("Password"), password);
}

const submit = (user: User) => user.press(screen.getByRole("button", { name: "Sign up" }));

describe("SignUpScreen (S3) — success", () => {
  it("creates the account with the trimmed name and normalised email, then opens /trips (AC-10)", async () => {
    mockedApi.signUp.mockResolvedValue(SESSION_OK);
    const user = userEvent.setup();
    await renderWithProviders(<SignUpScreen />);
    await fill(user, { name: "  Anna ", email: " Anna@Example.com " });
    await submit(user);
    expect(mockedApi.signUp).toHaveBeenCalledTimes(1);
    expect(mockedApi.signUp).toHaveBeenCalledWith({
      name: "Anna",
      email: "anna@example.com",
      password: VALID.password,
    });
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/trips"));
  });

  it("makes exactly one api call for repeated taps, with the spinner inside the button (AC-14)", async () => {
    const pending = deferred<never>();
    mockedApi.signUp.mockReturnValue(pending.promise);
    const user = userEvent.setup();
    await renderWithProviders(<SignUpScreen />);
    await fill(user);
    await submit(user);
    await submit(user);
    await submit(user);
    expect(mockedApi.signUp).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("sign-up-submit-spinner")).toBeOnTheScreen();
    await act(async () => {
      pending.resolve(SESSION_OK);
    });
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  });
});

describe("SignUpScreen (S3) — validation before any request (AC-12)", () => {
  it("rejects a 7-character password under the password field", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SignUpScreen />);
    await fill(user, { password: "1234567" });
    await submit(user);
    expect(erroredField("Password", "At least 8 characters")).toBeOnTheScreen();
    expect(mockedApi.signUp).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("rejects a malformed email under the email field", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SignUpScreen />);
    await fill(user, { email: "not an email" });
    await submit(user);
    expect(erroredField("Email", "Enter a valid email")).toBeOnTheScreen();
    expect(mockedApi.signUp).not.toHaveBeenCalled();
  });

  it("rejects a name made of spaces under the name field", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SignUpScreen />);
    await fill(user, { name: "   " });
    await submit(user);
    expect(erroredField("Name", "Enter your name")).toBeOnTheScreen();
    expect(mockedApi.signUp).not.toHaveBeenCalled();
  });

  it("reports every invalid field at once", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SignUpScreen />);
    await submit(user);
    expect(erroredField("Name", "Enter your name")).toBeOnTheScreen();
    expect(erroredField("Email", "Enter a valid email")).toBeOnTheScreen();
    expect(erroredField("Password", "At least 8 characters")).toBeOnTheScreen();
  });

  it("shows the password hint until the password has an error", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<SignUpScreen />);
    expect(screen.getByText("At least 8 characters")).toBeOnTheScreen();
    await submit(user);
    // The same sentence is now the error, rendered once (by the field), not twice.
    expect(screen.getAllByText("At least 8 characters")).toHaveLength(1);
  });
});

describe("SignUpScreen (S3) — email already registered (AC-13)", () => {
  it("shows the message under the email with a 'Sign in' action that goes to S2 with the email prefilled", async () => {
    mockedApi.signUp.mockResolvedValue({ ok: false, kind: "emailExists" });
    const user = userEvent.setup();
    await renderWithProviders(<SignUpScreen />);
    await fill(user, { email: "Taken@Example.com" });
    await submit(user);
    expect(
      await screen.findByLabelText("Email, An account with this email already exists"),
    ).toBeOnTheScreen();

    await user.press(screen.getByTestId("sign-up-exists-signin"));
    // Through the flow state, never through a route param (AC-39).
    expect(getSignInPrefill()).toBe("taken@example.com");
    expect(mockRouter.navigate).toHaveBeenCalledWith("/sign-in");
    expect(mockRouter.navigate.mock.calls[0]).toEqual(["/sign-in"]);
  });

  it("drops the message and the action when the email is edited", async () => {
    mockedApi.signUp.mockResolvedValue({ ok: false, kind: "emailExists" });
    const user = userEvent.setup();
    await renderWithProviders(<SignUpScreen />);
    await fill(user);
    await submit(user);
    await screen.findByTestId("sign-up-exists-signin");
    await user.type(field("Email, An account with this email already exists"), "x");
    expect(screen.queryByTestId("sign-up-exists-signin")).not.toBeOnTheScreen();
  });
});

describe("SignUpScreen (S3) — other api errors (AC-36, AC-37)", () => {
  it.each([
    ["offline", "No connection. Check your internet and try again"],
    ["rateLimited", "Too many attempts, please try again later"],
    ["unknown", "Something went wrong. Please try again"],
  ] as const)("%s is one line above the button and the form keeps its values", async (kind, text) => {
    mockedApi.signUp.mockResolvedValue({ ok: false, kind });
    const user = userEvent.setup();
    await renderWithProviders(<SignUpScreen />);
    await fill(user);
    await submit(user);
    expect((await screen.findByTestId("sign-up-error")).props.children).toBe(text);
    expect(field("Name").props.value).toBe(VALID.name);
    expect(field("Email").props.value).toBe(VALID.email);
    expect(field("Password").props.value).toBe(VALID.password);
  });

  it("puts a server 'weak password' under the password field", async () => {
    mockedApi.signUp.mockResolvedValue({ ok: false, kind: "weakPassword" });
    const user = userEvent.setup();
    await renderWithProviders(<SignUpScreen />);
    await fill(user);
    await submit(user);
    expect(
      await screen.findByLabelText("Password, This password is too weak. Use at least 8 characters"),
    ).toBeOnTheScreen();
  });
});

describe("SignUpScreen (S3) — field traits (AC-38)", () => {
  it("gives every field the right keyboard, autofill hint and masking", async () => {
    await renderWithProviders(<SignUpScreen />);
    expect(field("Name").props).toMatchObject({ textContentType: "name", autoCapitalize: "words" });
    expect(field("Email").props).toMatchObject({
      keyboardType: "email-address",
      textContentType: "emailAddress",
      autoCapitalize: "none",
      autoCorrect: false,
    });
    expect(field("Password").props).toMatchObject({
      secureTextEntry: true,
      textContentType: "newPassword",
      autoCapitalize: "none",
    });
  });

  it("shows the design placeholders in both locales", async () => {
    await renderWithProviders(<SignUpScreen />);
    expect(field("Name").props.placeholder).toBe("Andrew");
    expect(field("Email").props.placeholder).toBe("you@example.com");
  });

  it("shows the design placeholders and subtitle in Russian", async () => {
    await renderWithProviders(<SignUpScreen />, { locale: "ru" });
    expect(field("Имя").props.placeholder).toBe("Andrew");
    expect(field("Email").props.placeholder).toBe("you@example.com");
    expect(screen.getByText("Одна поездка, все детали — под рукой")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Зарегистрироваться" })).toBeOnTheScreen();
  });
});
