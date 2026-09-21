// The auth screens on the REAL routes, layouts, session provider and route gating, with only the
// backend client mocked (same pattern as mobile/__tests__/navigation.test.tsx). Proves what unit
// tests with a mocked router cannot: that a successful sign-in / sign-up / password reset really
// lands on /trips (AC-10, AC-15, AC-30) and that the gating hold keeps S10b on screen while a
// half-open recovery session exists (AC-32).
import { userEvent } from "@testing-library/react-native";
import { fireEvent, renderRouter, screen, waitFor } from "expo-router/testing-library";

import { i18n } from "@/lib/i18n";
import type { Session } from "@/lib/supabase";

import { resetFlowStateForTests } from "../flowState";

interface AuthMock {
  getSession: jest.Mock;
  signInWithPassword: jest.Mock;
  signUp: jest.Mock;
  resetPasswordForEmail: jest.Mock;
  verifyOtp: jest.Mock;
  updateUser: jest.Mock;
  signOut: jest.Mock;
  emit: (event: string, session: Session | null) => void;
}

jest.mock("@/lib/supabase", () => {
  let listener: ((event: string, session: unknown) => void) | undefined;
  const auth = {
    getSession: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    verifyOtp: jest.fn(),
    updateUser: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn((callback: (event: string, session: unknown) => void) => {
      listener = callback;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    }),
    startAutoRefresh: jest.fn(() => Promise.resolve()),
    stopAutoRefresh: jest.fn(() => Promise.resolve()),
    emit: (event: string, session: unknown) => listener?.(event, session),
  };
  return { __esModule: true, supabase: { auth }, __auth: auth };
});

const auth = (jest.requireMock("@/lib/supabase") as { __auth: AuthMock }).__auth;

const SESSION: Session = {
  access_token: "access-token-value",
  refresh_token: "refresh-token-value",
  token_type: "bearer",
  expires_in: 3600,
  user: {
    id: "user-1",
    aud: "authenticated",
    app_metadata: {},
    user_metadata: { display_name: "Anna" },
    created_at: "2026-01-01T00:00:00.000Z",
    email: "anna@example.com",
  },
};

let current: ReturnType<typeof renderRouter>;

async function renderAt(initialUrl: string) {
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  current = renderRouter("./app", { initialUrl });
  await waitFor(() => expect(screen.getByTestId(/-screen$/)).toBeOnTheScreen());
}

const expectPath = (pathname: string) => waitFor(() => expect(current.getPathname()).toBe(pathname));

beforeEach(async () => {
  jest.clearAllMocks();
  resetFlowStateForTests();
  await i18n.changeLanguage("en");
});

describe("auth screens on the real routes", () => {
  it("sign-in success lands on /trips (AC-15)", async () => {
    auth.signInWithPassword.mockImplementation(async () => {
      auth.emit("SIGNED_IN", SESSION);
      return { data: { session: SESSION, user: SESSION.user }, error: null };
    });
    const user = userEvent.setup();
    await renderAt("/sign-in");
    await user.type(screen.getByLabelText("Email"), "anna@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse");
    await user.press(screen.getByRole("button", { name: "Sign in" }));
    await expectPath("/trips");
    expect(screen.getByTestId("trips-screen")).toBeOnTheScreen();
  });

  it("sign-up success lands on /trips (AC-10)", async () => {
    auth.signUp.mockImplementation(async () => {
      auth.emit("SIGNED_IN", SESSION);
      return { data: { session: SESSION, user: SESSION.user }, error: null };
    });
    const user = userEvent.setup();
    await renderAt("/sign-up");
    await user.type(screen.getByLabelText("Name"), "Anna");
    await user.type(screen.getByLabelText("Email"), "anna@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse");
    await user.press(screen.getByRole("button", { name: "Sign up" }));
    await expectPath("/trips");
    expect(auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ options: { data: { display_name: "Anna" } } }),
    );
  });

  it("'email already exists' leads to sign-in with the email prefilled, also when S2 is already in the stack (AC-13)", async () => {
    auth.signUp.mockResolvedValue({
      data: { session: null, user: null },
      error: Object.assign(new Error("x"), { name: "AuthApiError", status: 422, code: "user_already_exists" }),
    });
    const user = userEvent.setup();
    await renderAt("/sign-in");
    await user.press(screen.getByRole("link", { name: "Create one" }));
    await expectPath("/sign-up");
    await user.type(screen.getByLabelText("Name"), "Anna");
    await user.type(screen.getByLabelText("Email"), "Anna@Example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse");
    await user.press(screen.getByRole("button", { name: "Sign up" }));
    await user.press(await screen.findByTestId("sign-up-exists-signin"));
    await expectPath("/sign-in");
    await waitFor(() => expect(screen.getByLabelText("Email").props.value).toBe("anna@example.com"));
  });

  describe("password reset (AC-28, AC-30, AC-32)", () => {
    async function reachStepTwo() {
      auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
      const user = userEvent.setup();
      await renderAt("/forgot-password");
      await user.type(screen.getByLabelText("Email"), "anna@example.com");
      await user.press(screen.getByRole("button", { name: "Send code" }));
      await expectPath("/reset-password");
      return user;
    }

    it("opens step 2 without any params, then sets the password and lands on /trips", async () => {
      const user = await reachStepTwo();
      expect(current.getSearchParams()).toEqual({});
      auth.verifyOtp.mockImplementation(async () => {
        auth.emit("SIGNED_IN", SESSION);
        return { data: { session: SESSION, user: SESSION.user }, error: null };
      });
      auth.updateUser.mockResolvedValue({ data: { user: SESSION.user }, error: null });
      await user.type(screen.getByLabelText("Code from the email"), "123456");
      await user.type(screen.getByLabelText("New password"), "brand-new-pass");
      await user.press(screen.getByRole("button", { name: "Save password" }));
      await expectPath("/trips");
      expect(auth.verifyOtp).toHaveBeenCalledWith({ email: "anna@example.com", token: "123456", type: "recovery" });
      expect(auth.signOut).not.toHaveBeenCalled();
    });

    it("stays on step 2 when the new password equals the old one, although a session is open", async () => {
      const user = await reachStepTwo();
      auth.verifyOtp.mockImplementation(async () => {
        auth.emit("SIGNED_IN", SESSION);
        return { data: { session: SESSION, user: SESSION.user }, error: null };
      });
      auth.updateUser.mockResolvedValueOnce({
        data: { user: null },
        error: Object.assign(new Error("x"), { name: "AuthApiError", status: 422, code: "same_password" }),
      });
      await user.type(screen.getByLabelText("Code from the email"), "123456");
      await user.type(screen.getByLabelText("New password"), "old-password-1");
      await user.press(screen.getByRole("button", { name: "Save password" }));
      expect(
        await screen.findByLabelText("New password, The new password must differ from the old one"),
      ).toBeOnTheScreen();
      expect(current.getPathname()).toBe("/reset-password");

      // Retry with a different password: the spent code is not sent again; gating then opens /trips.
      auth.updateUser.mockResolvedValueOnce({ data: { user: SESSION.user }, error: null });
      const errored = screen.getByLabelText("New password, The new password must differ from the old one");
      fireEvent.changeText(errored, "another-new-pass");
      await user.press(screen.getByRole("button", { name: "Save password" }));
      await expectPath("/trips");
      expect(auth.verifyOtp).toHaveBeenCalledTimes(1);
    });

    it("leaving step 2 after the code was accepted signs the recovery session out", async () => {
      const user = await reachStepTwo();
      auth.verifyOtp.mockImplementation(async () => {
        auth.emit("SIGNED_IN", SESSION);
        return { data: { session: SESSION, user: SESSION.user }, error: null };
      });
      auth.updateUser.mockResolvedValueOnce({
        data: { user: null },
        error: Object.assign(new Error("x"), { name: "AuthApiError", status: 422, code: "same_password" }),
      });
      auth.signOut.mockImplementation(async () => {
        auth.emit("SIGNED_OUT", null);
        return { error: null };
      });
      await user.type(screen.getByLabelText("Code from the email"), "123456");
      await user.type(screen.getByLabelText("New password"), "old-password-1");
      await user.press(screen.getByRole("button", { name: "Save password" }));
      await screen.findByLabelText("New password, The new password must differ from the old one");

      await user.press(screen.getByRole("button", { name: "Back" }));
      await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
      // Signed out again: the app never shows the tabs, it is back on a signed-out screen.
      await waitFor(() => expect(current.getPathname()).toBe("/forgot-password"));
      expect(screen.queryByTestId("trips-screen")).not.toBeOnTheScreen();
    });
  });
});
