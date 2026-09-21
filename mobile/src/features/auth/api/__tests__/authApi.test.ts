import { supabase } from "@/lib/supabase";
import type { Session } from "@/lib/supabase";

import {
  requestPasswordReset,
  signIn,
  signOut,
  signUp,
  updatePassword,
  verifyRecoveryCodeAndSetPassword,
} from "../authApi";

// The real client is never built here: it would need the build's env and would open storage.
jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      verifyOtp: jest.fn(),
      updateUser: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

const auth = supabase.auth as unknown as Record<
  "signUp" | "signInWithPassword" | "resetPasswordForEmail" | "verifyOtp" | "updateUser" | "signOut",
  jest.Mock
>;

const EMAIL = "anna@example.com";
const PASSWORD = "hunter2-secret-pass";
const NEW_PASSWORD = "brand-new-secret-pass";
const CODE = "482913";
const ACCESS_TOKEN = "access-token-value-xyz";
const SESSION = { access_token: ACCESS_TOKEN, refresh_token: "r", user: { id: "u1" } } as unknown as Session;
const SERVER_TEXT = "Raw server sentence that must never reach the UI";

function apiError(status: number, code: string, message = SERVER_TEXT) {
  return Object.assign(new Error(message), { name: "AuthApiError", status, code });
}

const CONSOLE_METHODS = ["log", "info", "warn", "error", "debug", "trace"] as const;

function consoleOutput(spies: jest.SpyInstance[]): string {
  return JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
}

let consoleSpies: jest.SpyInstance[] = [];

beforeEach(() => {
  for (const fn of Object.values(auth)) fn.mockReset();
  consoleSpies = CONSOLE_METHODS.map((method) =>
    jest.spyOn(console, method).mockImplementation(() => undefined),
  );
});

afterEach(() => {
  for (const spy of consoleSpies) spy.mockRestore();
});

describe("signUp (AC-10, AC-11, AC-13)", () => {
  it("AC-11: puts the trimmed name into options.data.display_name", async () => {
    auth.signUp.mockResolvedValue({ data: { session: SESSION, user: SESSION.user }, error: null });
    const result = await signUp({ name: "Анна 🌍", email: EMAIL, password: PASSWORD });
    expect(auth.signUp).toHaveBeenCalledTimes(1);
    expect(auth.signUp).toHaveBeenCalledWith({
      email: EMAIL,
      password: PASSWORD,
      options: { data: { display_name: "Анна 🌍" } },
    });
    expect(result).toEqual({ ok: true, session: SESSION });
  });

  it("AC-13: an existing email is classified as emailExists", async () => {
    auth.signUp.mockResolvedValue({ data: {}, error: apiError(422, "user_already_exists") });
    await expect(signUp({ name: "A", email: EMAIL, password: PASSWORD })).resolves.toEqual({
      ok: false,
      kind: "emailExists",
    });
  });

  it("a success without a session (confirmation enabled by mistake) is not a silent success", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null, user: SESSION.user }, error: null });
    await expect(signUp({ name: "A", email: EMAIL, password: PASSWORD })).resolves.toEqual({
      ok: false,
      kind: "unknown",
    });
  });

  it("never throws: a rejected call becomes a classified failure", async () => {
    auth.signUp.mockRejectedValue(new TypeError("Network request failed"));
    await expect(signUp({ name: "A", email: EMAIL, password: PASSWORD })).resolves.toEqual({
      ok: false,
      kind: "offline",
    });
  });
});

describe("signIn (AC-15, AC-16, AC-18, AC-19)", () => {
  it("returns the session on success", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { session: SESSION }, error: null });
    await expect(signIn({ email: EMAIL, password: PASSWORD })).resolves.toEqual({
      ok: true,
      session: SESSION,
    });
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: EMAIL, password: PASSWORD });
  });

  it.each([
    ["invalid_credentials", 400, "invalidCredentials"],
    ["user_not_found", 400, "invalidCredentials"],
    ["over_request_rate_limit", 429, "rateLimited"],
  ] as const)("%s -> %s", async (code, status, kind) => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: apiError(status, code) });
    await expect(signIn({ email: EMAIL, password: PASSWORD })).resolves.toEqual({ ok: false, kind });
  });

  it("AC-19: a connection failure is offline", async () => {
    const retryable = Object.assign(new Error("fetch failed"), {
      name: "AuthRetryableFetchError",
      status: 0,
    });
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: retryable });
    await expect(signIn({ email: EMAIL, password: PASSWORD })).resolves.toEqual({
      ok: false,
      kind: "offline",
    });
  });

  it("AC-37: the failure carries a kind only — never the server text or code", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: apiError(500, "totally_new_code") });
    const result = await signIn({ email: EMAIL, password: PASSWORD });
    expect(result).toEqual({ ok: false, kind: "unknown" });
    expect(JSON.stringify(result)).not.toContain(SERVER_TEXT);
    expect(JSON.stringify(result)).not.toContain("totally_new_code");
  });
});

describe("requestPasswordReset (AC-28, AC-34)", () => {
  it("asks for a code for the given email and reports plain success", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    await expect(requestPasswordReset({ email: EMAIL })).resolves.toEqual({ ok: true });
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(EMAIL);
  });

  it("AC-34: the email rate limit is rateLimited", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: apiError(429, "over_email_send_rate_limit"),
    });
    await expect(requestPasswordReset({ email: EMAIL })).resolves.toEqual({
      ok: false,
      kind: "rateLimited",
    });
  });
});

describe("verifyRecoveryCodeAndSetPassword (AC-30, AC-31, AC-32)", () => {
  it("AC-30: verifies the code FIRST, then updates the password", async () => {
    auth.verifyOtp.mockResolvedValue({ data: { session: SESSION }, error: null });
    auth.updateUser.mockResolvedValue({ data: { user: SESSION.user }, error: null });

    const result = await verifyRecoveryCodeAndSetPassword({
      email: EMAIL,
      code: CODE,
      password: NEW_PASSWORD,
    });

    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: EMAIL, token: CODE, type: "recovery" });
    expect(auth.updateUser).toHaveBeenCalledWith({ password: NEW_PASSWORD });
    const verifyOrder = auth.verifyOtp.mock.invocationCallOrder[0] ?? Infinity;
    const updateOrder = auth.updateUser.mock.invocationCallOrder[0] ?? -Infinity;
    expect(verifyOrder).toBeLessThan(updateOrder);
    expect(result).toEqual({ ok: true, session: SESSION });
  });

  it("AC-31: a wrong/expired code stops before any password change", async () => {
    auth.verifyOtp.mockResolvedValue({ data: {}, error: apiError(403, "otp_expired") });
    const result = await verifyRecoveryCodeAndSetPassword({
      email: EMAIL,
      code: CODE,
      password: NEW_PASSWORD,
    });
    expect(result).toEqual({ ok: false, kind: "otpInvalidOrExpired", codeAccepted: false });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("AC-32: same_password after a good code fails as samePassword and reports the code as used", async () => {
    auth.verifyOtp.mockResolvedValue({ data: { session: SESSION }, error: null });
    auth.updateUser.mockResolvedValue({ data: {}, error: apiError(422, "same_password") });
    await expect(
      verifyRecoveryCodeAndSetPassword({ email: EMAIL, code: CODE, password: NEW_PASSWORD }),
    ).resolves.toEqual({ ok: false, kind: "samePassword", codeAccepted: true });
  });

  it("a thrown verify call is a classified failure, not an exception", async () => {
    auth.verifyOtp.mockRejectedValue(new TypeError("Network request failed"));
    await expect(
      verifyRecoveryCodeAndSetPassword({ email: EMAIL, code: CODE, password: NEW_PASSWORD }),
    ).resolves.toEqual({ ok: false, kind: "offline", codeAccepted: false });
  });
});

describe("updatePassword", () => {
  it("sets the password on the current session", async () => {
    auth.updateUser.mockResolvedValue({ data: {}, error: null });
    await expect(updatePassword(NEW_PASSWORD)).resolves.toEqual({ ok: true });
    expect(auth.updateUser).toHaveBeenCalledWith({ password: NEW_PASSWORD });
  });

  it("classifies a failure", async () => {
    auth.updateUser.mockResolvedValue({ data: {}, error: apiError(422, "same_password") });
    await expect(updatePassword(NEW_PASSWORD)).resolves.toEqual({ ok: false, kind: "samePassword" });
  });
});

describe("signOut (AC-22, AC-23)", () => {
  it("a healthy sign-out is a single server-side call", async () => {
    auth.signOut.mockResolvedValue({ error: null });
    await expect(signOut()).resolves.toEqual({ ok: true });
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("AC-23: a server error still clears the local session and still succeeds", async () => {
    auth.signOut
      .mockResolvedValueOnce({ error: apiError(500, "unexpected_failure") })
      .mockResolvedValueOnce({ error: null });
    await expect(signOut()).resolves.toEqual({ ok: true });
    expect(auth.signOut).toHaveBeenCalledTimes(2);
    expect(auth.signOut).toHaveBeenLastCalledWith({ scope: "local" });
  });

  it("AC-23: offline (a rejected call) still clears the local session", async () => {
    auth.signOut
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockResolvedValueOnce({ error: null });
    await expect(signOut()).resolves.toEqual({ ok: true });
    expect(auth.signOut).toHaveBeenLastCalledWith({ scope: "local" });
  });

  it("even when the local clear also fails, it never throws", async () => {
    auth.signOut.mockRejectedValue(new Error("everything is down"));
    await expect(signOut()).resolves.toEqual({ ok: true });
  });
});

describe("AC-39: request data never reaches the logs", () => {
  it("no console method receives the email, password, code, new password or a token", async () => {
    const failing = { data: {}, error: apiError(400, "invalid_credentials", `bad ${EMAIL} ${PASSWORD}`) };
    auth.signUp.mockResolvedValue(failing);
    auth.signInWithPassword.mockResolvedValue(failing);
    auth.resetPasswordForEmail.mockResolvedValue(failing);
    auth.verifyOtp.mockResolvedValue({
      data: {},
      error: apiError(403, "otp_expired", `code ${CODE} for ${EMAIL}`),
    });
    auth.updateUser.mockResolvedValue({ data: {}, error: apiError(422, "same_password") });
    auth.signOut.mockRejectedValue(Object.assign(new Error(ACCESS_TOKEN), { code: ACCESS_TOKEN }));

    await signUp({ name: "Anna", email: EMAIL, password: PASSWORD });
    await signIn({ email: EMAIL, password: PASSWORD });
    await requestPasswordReset({ email: EMAIL });
    await verifyRecoveryCodeAndSetPassword({ email: EMAIL, code: CODE, password: NEW_PASSWORD });
    auth.verifyOtp.mockResolvedValue({ data: { session: SESSION }, error: null });
    await verifyRecoveryCodeAndSetPassword({ email: EMAIL, code: CODE, password: NEW_PASSWORD });
    await updatePassword(NEW_PASSWORD);
    await signOut();

    const output = consoleOutput(consoleSpies);
    for (const secret of [EMAIL, PASSWORD, NEW_PASSWORD, CODE, ACCESS_TOKEN, SERVER_TEXT, "Anna"]) {
      expect(output).not.toContain(secret);
    }
  });

  it("logs at most the operation name and the error code", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: apiError(400, "invalid_credentials") });
    await signIn({ email: EMAIL, password: PASSWORD });
    const calls = consoleSpies.flatMap((spy) => spy.mock.calls as unknown[][]);
    expect(calls).toHaveLength(1);
    for (const args of calls) {
      expect(args).toEqual(["[auth]", "signIn", "failed", "invalid_credentials"]);
    }
  });
});
