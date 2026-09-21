import { screen, userEvent, waitFor } from "@testing-library/react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { ForgotPasswordScreen } from "../ForgotPasswordScreen";
import { getResetFlow, resetFlowStateForTests } from "../flowState";
import { erroredField, field, mockRouter, mockedApi } from "./testKit";

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

const send = (user: ReturnType<typeof userEvent.setup>) =>
  user.press(screen.getByRole("button", { name: "Send code" }));

describe("ForgotPasswordScreen (S10)", () => {
  it("renders the code-based copy and an email field", async () => {
    await renderWithProviders(<ForgotPasswordScreen />);
    expect(screen.getByText("Reset password")).toBeOnTheScreen();
    expect(screen.getByText(/we will send you a code/)).toBeOnTheScreen();
    expect(field("Email").props.keyboardType).toBe("email-address");
  });

  it("requests the code and pushes S10b with NO params; the email goes into the flow state (AC-28, AC-39)", async () => {
    mockedApi.requestPasswordReset.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    await renderWithProviders(<ForgotPasswordScreen />);
    await user.type(field("Email"), " Anna@Example.COM ");
    await send(user);
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledTimes(1));
    expect(mockedApi.requestPasswordReset).toHaveBeenCalledWith({ email: "anna@example.com" });
    expect(mockRouter.push.mock.calls[0]).toEqual(["/reset-password"]);
    expect(getResetFlow()?.email).toBe("anna@example.com");
  });

  it("registered and unknown addresses give the same result: one and the same next screen (AC-28)", async () => {
    // The api answers `ok` for both (the server does not tell); the screen must not branch.
    mockedApi.requestPasswordReset.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    await renderWithProviders(<ForgotPasswordScreen />);
    await user.type(field("Email"), "known@example.com");
    await send(user);
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledTimes(1));
    await user.clear(field("Email"));
    await user.type(field("Email"), "unknown@example.com");
    await send(user);
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledTimes(2));
    expect(mockRouter.push.mock.calls[1]).toEqual(mockRouter.push.mock.calls[0]);
    expect(screen.queryByTestId("forgot-password-error")).not.toBeOnTheScreen();
  });

  it("validates the email before the request", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<ForgotPasswordScreen />);
    await user.type(field("Email"), "nope");
    await send(user);
    expect(erroredField("Email", "Enter a valid email")).toBeOnTheScreen();
    expect(mockedApi.requestPasswordReset).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("shows 'too often' as a form line, not a field error, and stays put (AC-34)", async () => {
    mockedApi.requestPasswordReset.mockResolvedValue({ ok: false, kind: "rateLimited" });
    const user = userEvent.setup();
    await renderWithProviders(<ForgotPasswordScreen />);
    await user.type(field("Email"), "anna@example.com");
    await send(user);
    expect((await screen.findByTestId("forgot-password-error")).props.children).toBe(
      "Too often, please try again later",
    );
    expect(field("Email")).toBeOnTheScreen(); // no ", error" appended: not a field error
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(getResetFlow()).toBeNull();
  });

  it.each([
    ["offline", "No connection. Check your internet and try again"],
    ["unknown", "Something went wrong. Please try again"],
  ] as const)("%s keeps the typed email and shows a generic line", async (kind, text) => {
    mockedApi.requestPasswordReset.mockResolvedValue({ ok: false, kind });
    const user = userEvent.setup();
    await renderWithProviders(<ForgotPasswordScreen />);
    await user.type(field("Email"), "anna@example.com");
    await send(user);
    expect((await screen.findByTestId("forgot-password-error")).props.children).toBe(text);
    expect(field("Email").props.value).toBe("anna@example.com");
  });

  it("'Back' returns, with a /sign-in fallback when there is no history", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<ForgotPasswordScreen />);
    await user.press(screen.getByRole("button", { name: "Back" }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    mockRouter.canGoBack.mockReturnValue(false);
    await user.press(screen.getByRole("button", { name: "Back" }));
    expect(mockRouter.replace).toHaveBeenCalledWith("/sign-in");
  });

  it("renders Russian copy", async () => {
    await renderWithProviders(<ForgotPasswordScreen />, { locale: "ru" });
    expect(screen.getByRole("button", { name: "Отправить код" })).toBeOnTheScreen();
    expect(screen.getByText(/отправим на него код/)).toBeOnTheScreen();
  });
});
