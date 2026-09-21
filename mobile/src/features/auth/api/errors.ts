// Classifies whatever the backend (or the network) threw into a FIXED set of kinds. Only the
// code / status / error class is read — the server's message text is never returned, shown or
// logged (AC-37): a kind is the contract with the localized strings, and a security boundary.
//
// Deliberately duck-typed: this file does not import `@supabase/supabase-js` (AC-8), and it must
// cope with anything that can be thrown (auth errors, `TypeError: Network request failed`,
// aborts from the request timeout, plain objects).

export const AUTH_ERROR_KINDS = [
  "invalidCredentials",
  "emailExists",
  "weakPassword",
  "otpInvalidOrExpired",
  "samePassword",
  "rateLimited",
  "offline",
  "unknown",
] as const;

export type AuthErrorKind = (typeof AUTH_ERROR_KINDS)[number];

const KIND_BY_CODE: Readonly<Record<string, AuthErrorKind>> = {
  // AC-16: a wrong password and an unknown account are indistinguishable on purpose.
  invalid_credentials: "invalidCredentials",
  user_not_found: "invalidCredentials",
  email_exists: "emailExists",
  user_already_exists: "emailExists",
  weak_password: "weakPassword",
  // AC-31: the server answers a wrong and an expired code identically (`otp_expired`, 403).
  otp_expired: "otpInvalidOrExpired",
  same_password: "samePassword",
  over_request_rate_limit: "rateLimited",
  over_email_send_rate_limit: "rateLimited",
  over_sms_send_rate_limit: "rateLimited",
  // Server-side timeout: from the user's side, a connection problem.
  request_timeout: "offline",
};

// Error classes that mean "the request did not get a usable answer" (supabase-js wraps a failed
// fetch in AuthRetryableFetchError; our timeout surfaces as an AbortError).
const OFFLINE_NAMES: ReadonlySet<string> = new Set([
  "AuthRetryableFetchError",
  "AbortError",
  "TimeoutError",
]);

const OFFLINE_STATUSES: ReadonlySet<number> = new Set([0, 408, 502, 503, 504]);

const NETWORK_MESSAGE = /network request failed|failed to fetch|network error|timed? ?out/i;

function field(error: object, name: string): unknown {
  return (error as Record<string, unknown>)[name];
}

export function mapAuthError(error: unknown): AuthErrorKind {
  if (typeof error !== "object" || error === null) return "unknown";

  const code = field(error, "code");
  if (typeof code === "string") {
    const byCode = KIND_BY_CODE[code];
    if (byCode) return byCode;
  }

  const name = field(error, "name");
  if (typeof name === "string" && OFFLINE_NAMES.has(name)) return "offline";

  const status = field(error, "status");
  if (status === 429) return "rateLimited";
  if (typeof status === "number" && OFFLINE_STATUSES.has(status)) return "offline";

  // A bare fetch rejection (RN: `TypeError: Network request failed`) that nothing wrapped.
  const message = field(error, "message");
  if (name === "TypeError" && typeof message === "string" && NETWORK_MESSAGE.test(message)) {
    return "offline";
  }

  return "unknown";
}

/**
 * The error code, when (and only when) it looks like a server error identifier such as
 * `invalid_credentials`. Safe to log: nothing else from the error object is ever exposed.
 */
export function safeErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const code = field(error, "code");
  return typeof code === "string" && /^[a-z][a-z0-9_]{0,63}$/.test(code) ? code : undefined;
}
