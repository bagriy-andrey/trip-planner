import { act, fireEvent, screen, userEvent, waitFor } from "@testing-library/react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { ResetPasswordScreen } from "../ResetPasswordScreen";
import { getResetFlow, resetFlowStateForTests, startResetFlow } from "../flowState";
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

const EMAIL = "anna@example.com";
const NEW_PASSWORD = "brand-new-pass";

const release = jest.fn();
const holdGating = jest.fn(() => release);

beforeEach(() => {
  jest.clearAllMocks();
  resetFlowStateForTests();
  holdGating.mockImplementation(() => release);
  mockRouter.canGoBack.mockReturnValue(true);
  mockedApi.signOut.mockResolvedValue({ ok: true });
  // Step 1 sent the code long ago: the resend action is available unless a test says otherwise.
  startResetFlow(EMAIL, Date.now() - 120_000);
});

type User = ReturnType<typeof userEvent.setup>;

const render = (locale: "en" | "ru" = "en") =>
  renderWithProviders(<ResetPasswordScreen />, { locale, session: { holdGating } });

async function fill(user: User, code = "123456", password = NEW_PASSWORD) {
  await user.type(field("Code from the email"), code);
  await user.type(field("New password"), password);
}

const save = (user: User) => user.press(screen.getByRole("button", { name: "Save password" }));

describe("ResetPasswordScreen (S10b) — form", () => {
  it("shows the neutral notice and the address read-only (AC-28)", async () => {
    await render();
    expect(screen.getByText("If an account with this email exists, we sent a code to it")).toBeOnTheScreen();
    const email = field("Email");
    expect(email.props.value).toBe(EMAIL);
    expect(email.props.editable).toBe(false);
  });

  it("gives the code a digit keyboard and a one-time-code hint, and masks the new password (AC-29, AC-38)", async () => {
    await render();
    expect(field("Code from the email").props).toMatchObject({
      keyboardType: "number-pad",
      textContentType: "oneTimeCode",
    });
    expect(field("New password").props).toMatchObject({
      secureTextEntry: true,
      textContentType: "newPassword",
    });
  });

  it("keeps the button inactive and sends nothing until 6 digits are typed (AC-29)", async () => {
    const user = userEvent.setup();
    await render();
    await user.type(field("Code from the email"), "12345");
    await user.type(field("New password"), NEW_PASSWORD);
    const button = screen.getByRole("button", { name: "Save password" });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    await user.press(button);
    fireEvent(field("New password"), "submitEditing");
    expect(mockedApi.verifyRecoveryCodeAndSetPassword).not.toHaveBeenCalled();
    expect(holdGating).not.toHaveBeenCalled();
    await user.type(field("Code from the email"), "6");
    expect(screen.getByRole("button", { name: "Save password" }).props.accessibilityState).toMatchObject({
      disabled: false,
    });
  });

  it("rejects a new password shorter than 8 characters under the field, without a request (AC-35)", async () => {
    const user = userEvent.setup();
    await render();
    await fill(user, "123456", "1234567");
    await save(user);
    expect(erroredField("New password", "At least 8 characters")).toBeOnTheScreen();
    expect(mockedApi.verifyRecoveryCodeAndSetPassword).not.toHaveBeenCalled();
    expect(holdGating).not.toHaveBeenCalled();
  });

  it("reports a non-numeric code under the code field (AC-29)", async () => {
    const user = userEvent.setup();
    await render();
    await fill(user, "12345a");
    await save(user);
    expect(erroredField("Code from the email", "The code contains digits only")).toBeOnTheScreen();
    expect(mockedApi.verifyRecoveryCodeAndSetPassword).not.toHaveBeenCalled();
  });

  it("without an address in the flow state (cold link) goes back to step 1 and shows no form", async () => {
    resetFlowStateForTests();
    await render();
    expect(mockRouter.replace).toHaveBeenCalledWith("/forgot-password");
    expect(screen.queryByTestId("reset-password-screen")).not.toBeOnTheScreen();
  });

  it("'Back' returns, with a /forgot-password fallback without history", async () => {
    const user = userEvent.setup();
    await render();
    await user.press(screen.getByRole("button", { name: "Back" }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    mockRouter.canGoBack.mockReturnValue(false);
    await user.press(screen.getByRole("button", { name: "Back" }));
    expect(mockRouter.replace).toHaveBeenCalledWith("/forgot-password");
  });

  it("renders Russian copy", async () => {
    await render("ru");
    expect(screen.getByText("Если такой аккаунт существует, мы отправили на него код")).toBeOnTheScreen();
    expect(screen.getByLabelText("Код из письма")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Сохранить пароль" })).toBeOnTheScreen();
  });
});

describe("ResetPasswordScreen (S10b) — success and the gating hold (AC-30)", () => {
  it("holds gating BEFORE verifying, then releases it once the password is set", async () => {
    mockedApi.verifyRecoveryCodeAndSetPassword.mockResolvedValue(SESSION_OK);
    const user = userEvent.setup();
    await render();
    await fill(user, "123 456"); // a pasted code with a space is cleaned before validation
    await save(user);
    await waitFor(() => expect(release).toHaveBeenCalledTimes(1));
    expect(mockedApi.verifyRecoveryCodeAndSetPassword).toHaveBeenCalledWith({
      email: EMAIL,
      code: "123456",
      password: NEW_PASSWORD,
    });
    expect(holdGating.mock.invocationCallOrder[0]).toBeLessThan(
      mockedApi.verifyRecoveryCodeAndSetPassword.mock.invocationCallOrder[0] ?? 0,
    );
    expect(mockedApi.signOut).not.toHaveBeenCalled();
  });

  it("makes one api call for repeated taps (AC-14 mechanics)", async () => {
    const pending = deferred<never>();
    mockedApi.verifyRecoveryCodeAndSetPassword.mockReturnValue(pending.promise);
    const user = userEvent.setup();
    await render();
    await fill(user);
    await save(user);
    fireEvent(field("New password"), "submitEditing");
    await save(user);
    expect(mockedApi.verifyRecoveryCodeAndSetPassword).toHaveBeenCalledTimes(1);
    expect(holdGating).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve(SESSION_OK);
    });
  });

  it("leaving after success does not sign out", async () => {
    mockedApi.verifyRecoveryCodeAndSetPassword.mockResolvedValue(SESSION_OK);
    const user = userEvent.setup();
    const view = await render();
    await fill(user);
    await save(user);
    await waitFor(() => expect(release).toHaveBeenCalledTimes(1));
    view.unmount();
    expect(mockedApi.signOut).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(1);
  });
});

describe("ResetPasswordScreen (S10b) — wrong or expired code (AC-31)", () => {
  it("shows one message under the code plus the resend action, keeps the password, releases the hold", async () => {
    mockedApi.verifyRecoveryCodeAndSetPassword.mockResolvedValue({
      ok: false,
      kind: "otpInvalidOrExpired",
      codeAccepted: false,
    });
    const user = userEvent.setup();
    await render();
    await fill(user);
    await save(user);
    expect(
      await screen.findByLabelText("Code from the email, The code is incorrect or has expired"),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Send code again" })).toBeOnTheScreen();
    expect(field("New password").props.value).toBe(NEW_PASSWORD);
    expect(release).toHaveBeenCalledTimes(1);
    expect(mockedApi.signOut).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("lets the user type a new code and retry with verify (the old code was never accepted)", async () => {
    mockedApi.verifyRecoveryCodeAndSetPassword.mockResolvedValueOnce({
      ok: false,
      kind: "otpInvalidOrExpired",
      codeAccepted: false,
    });
    const user = userEvent.setup();
    await render();
    await fill(user);
    await save(user);
    await screen.findByLabelText("Code from the email, The code is incorrect or has expired");
    mockedApi.verifyRecoveryCodeAndSetPassword.mockResolvedValueOnce(SESSION_OK);
    await user.clear(field("Code from the email, The code is incorrect or has expired"));
    await user.type(field("Code from the email"), "654321");
    await save(user);
    await waitFor(() => expect(mockedApi.verifyRecoveryCodeAndSetPassword).toHaveBeenCalledTimes(2));
    expect(mockedApi.updatePassword).not.toHaveBeenCalled();
  });
});

describe("ResetPasswordScreen (S10b) — same password (AC-32) and the abandoned reset", () => {
  const samePassword = { ok: false, kind: "samePassword", codeAccepted: true } as const;

  it("shows its own message under the new password, stays on step 2 and keeps the hold", async () => {
    mockedApi.verifyRecoveryCodeAndSetPassword.mockResolvedValue(samePassword);
    const user = userEvent.setup();
    await render();
    await fill(user);
    await save(user);
    expect(
      await screen.findByLabelText("New password, The new password must differ from the old one"),
    ).toBeOnTheScreen();
    expect(release).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
    // The code is spent: it can no longer be edited or requested again from here.
    expect(field("Code from the email").props.editable).toBe(false);
  });

  it("retries through updatePassword (not the spent code) and releases on success", async () => {
    mockedApi.verifyRecoveryCodeAndSetPassword.mockResolvedValue(samePassword);
    mockedApi.updatePassword.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    await render();
    await fill(user);
    await save(user);
    const errored = await screen.findByLabelText("New password, The new password must differ from the old one");
    await user.clear(errored);
    await user.type(field("New password"), "another-new-pass");
    await save(user);
    await waitFor(() => expect(release).toHaveBeenCalledTimes(1));
    expect(mockedApi.verifyRecoveryCodeAndSetPassword).toHaveBeenCalledTimes(1);
    expect(mockedApi.updatePassword).toHaveBeenCalledWith("another-new-pass");
    expect(holdGating).toHaveBeenCalledTimes(1);
    expect(mockedApi.signOut).not.toHaveBeenCalled();
  });

  it("signs the half-open recovery session out when the user leaves without setting a password, then releases", async () => {
    mockedApi.verifyRecoveryCodeAndSetPassword.mockResolvedValue(samePassword);
    const pendingSignOut = deferred<{ ok: true }>();
    mockedApi.signOut.mockReturnValue(pendingSignOut.promise);
    const user = userEvent.setup();
    const view = await render();
    await fill(user);
    await save(user);
    await screen.findByLabelText("New password, The new password must differ from the old one");

    view.unmount();
    expect(mockedApi.signOut).toHaveBeenCalledTimes(1);
    // The hold stays until the session is really gone, or gating would flash /trips.
    expect(release).not.toHaveBeenCalled();
    await act(async () => {
      pendingSignOut.resolve({ ok: true });
    });
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("leaving with a rejected code releases the hold and does not sign out", async () => {
    mockedApi.verifyRecoveryCodeAndSetPassword.mockResolvedValue({
      ok: false,
      kind: "otpInvalidOrExpired",
      codeAccepted: false,
    });
    const user = userEvent.setup();
    const view = await render();
    await fill(user);
    await save(user);
    await screen.findByLabelText("Code from the email, The code is incorrect or has expired");
    view.unmount();
    expect(mockedApi.signOut).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(1); // released once already, never twice
  });

  it("a hold that is still active on unmount is released (leaving mid-request)", async () => {
    const pending = deferred<never>();
    mockedApi.verifyRecoveryCodeAndSetPassword.mockReturnValue(pending.promise);
    const user = userEvent.setup();
    const view = await render();
    await fill(user);
    await save(user);
    view.unmount();
    expect(release).toHaveBeenCalledTimes(1);
    // The late answer says the code WAS accepted but the password failed: nobody stays signed in.
    await act(async () => {
      pending.resolve({ ok: false, kind: "samePassword", codeAccepted: true } as never);
    });
    expect(mockedApi.signOut).toHaveBeenCalledTimes(1);
  });
});

describe("ResetPasswordScreen (S10b) — leaving clears the form (AC-39)", () => {
  it("clears the flow state on unmount and a fresh mount has an empty form", async () => {
    const user = userEvent.setup();
    const view = await render();
    await fill(user);
    view.unmount();
    expect(getResetFlow()).toBeNull();
    startResetFlow(EMAIL, Date.now() - 120_000);
    await render();
    expect(field("Code from the email").props.value).toBe("");
    expect(field("New password").props.value).toBe("");
  });

  it("never puts the code or the new password into a route call", async () => {
    mockedApi.verifyRecoveryCodeAndSetPassword.mockResolvedValue(SESSION_OK);
    const user = userEvent.setup();
    await render();
    await fill(user);
    await save(user);
    await waitFor(() => expect(release).toHaveBeenCalled());
    const calls = JSON.stringify([
      mockRouter.push.mock.calls,
      mockRouter.replace.mock.calls,
      mockRouter.navigate.mock.calls,
    ]);
    expect(calls).not.toContain("123456");
    expect(calls).not.toContain(NEW_PASSWORD);
  });
});

describe("ResetPasswordScreen (S10b) — other errors (AC-36, AC-37)", () => {
  it.each([
    ["rateLimited", "Too many attempts, please try again later"],
    ["offline", "No connection. Check your internet and try again"],
    ["unknown", "Something went wrong. Please try again"],
  ] as const)("%s is a single line above the button; typed values survive", async (kind, text) => {
    mockedApi.verifyRecoveryCodeAndSetPassword.mockResolvedValue({ ok: false, kind, codeAccepted: false });
    const user = userEvent.setup();
    await render();
    await fill(user);
    await save(user);
    expect((await screen.findByTestId("reset-password-error")).props.children).toBe(text);
    expect(field("Code from the email").props.value).toBe("123456");
    expect(field("New password").props.value).toBe(NEW_PASSWORD);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("an unmapped server answer shows only the generic text", async () => {
    mockedApi.verifyRecoveryCodeAndSetPassword.mockResolvedValue({
      ok: false,
      kind: "unknown",
      codeAccepted: false,
      message: "duplicate key value violates unique constraint",
    } as never);
    const user = userEvent.setup();
    await render();
    await fill(user);
    await save(user);
    expect((await screen.findByTestId("reset-password-error")).props.children).toBe(
      "Something went wrong. Please try again",
    );
    expect(screen.queryByText(/duplicate key/)).not.toBeOnTheScreen();
  });
});

describe("ResetPasswordScreen (S10b) — resend (AC-33, AC-34)", () => {
  it("is locked with the remaining time right after the first send", async () => {
    startResetFlow(EMAIL, Date.now() - 10_000);
    await render();
    const resend = screen.getByRole("button", { name: /Send code again in \d+s/ });
    expect(resend.props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByText(/Send code again in (49|50)s/)).toBeOnTheScreen();
  });

  it("sends a new code, locks again, and clears the old code", async () => {
    mockedApi.requestPasswordReset.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    await render();
    await user.type(field("Code from the email"), "111111");
    await user.press(screen.getByRole("button", { name: "Send code again" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /again in 60s/ })).toBeOnTheScreen());
    expect(mockedApi.requestPasswordReset).toHaveBeenCalledWith({ email: EMAIL });
    expect(field("Code from the email").props.value).toBe("");
    expect(screen.getByRole("button", { name: /again in 60s/ }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it("shows 'too often' as a form line when the server limits the email (AC-34)", async () => {
    mockedApi.requestPasswordReset.mockResolvedValue({ ok: false, kind: "rateLimited" });
    const user = userEvent.setup();
    await render();
    await user.press(screen.getByRole("button", { name: "Send code again" }));
    expect((await screen.findByTestId("reset-password-error")).props.children).toBe(
      "Too often, please try again later",
    );
    // Not a lock: the failed send did not start the cooldown.
    expect(screen.getByRole("button", { name: "Send code again" })).toBeOnTheScreen();
  });
});
