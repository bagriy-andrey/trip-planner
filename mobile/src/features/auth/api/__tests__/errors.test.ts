import { AUTH_ERROR_KINDS, mapAuthError, safeErrorCode } from "../errors";

// Shapes mirror what supabase-js throws, built as plain objects so the mapper is proven to be
// duck-typed (it must not need the SDK's classes).
function authApiError(status: number, code: string | undefined, message = "server text") {
  return Object.assign(new Error(message), { name: "AuthApiError", status, code });
}

describe("mapAuthError (AC-16, AC-18, AC-19, AC-31, AC-32, AC-34, AC-37)", () => {
  it("AC-16: a wrong password and an unknown account map to the SAME kind", () => {
    const wrongPassword = mapAuthError(authApiError(400, "invalid_credentials"));
    const unknownEmail = mapAuthError(authApiError(400, "user_not_found"));
    expect(wrongPassword).toBe("invalidCredentials");
    expect(unknownEmail).toBe(wrongPassword);
  });

  it("AC-18 / AC-34: rate limits (by code or by HTTP 429) map to rateLimited", () => {
    expect(mapAuthError(authApiError(429, "over_request_rate_limit"))).toBe("rateLimited");
    expect(mapAuthError(authApiError(429, "over_email_send_rate_limit"))).toBe("rateLimited");
    expect(mapAuthError(authApiError(429, undefined))).toBe("rateLimited");
    expect(mapAuthError(authApiError(400, "over_sms_send_rate_limit"))).toBe("rateLimited");
  });

  it("AC-31: a wrong and an expired code are the same kind (otp_expired, 403)", () => {
    expect(mapAuthError(authApiError(403, "otp_expired"))).toBe("otpInvalidOrExpired");
  });

  it("AC-32: same_password maps to samePassword", () => {
    expect(mapAuthError(authApiError(422, "same_password"))).toBe("samePassword");
  });

  it("AC-13: user_already_exists and email_exists map to emailExists", () => {
    expect(mapAuthError(authApiError(422, "user_already_exists"))).toBe("emailExists");
    expect(mapAuthError(authApiError(422, "email_exists"))).toBe("emailExists");
  });

  it("weak_password maps to weakPassword", () => {
    expect(mapAuthError(authApiError(422, "weak_password"))).toBe("weakPassword");
  });

  describe("AC-19: no connection or timeout maps to offline", () => {
    it("supabase-js wraps a failed fetch in AuthRetryableFetchError (status 0)", () => {
      const error = Object.assign(new Error("Network request failed"), {
        name: "AuthRetryableFetchError",
        status: 0,
      });
      expect(mapAuthError(error)).toBe("offline");
    });

    it("our request timeout surfaces as an abort", () => {
      const abort = Object.assign(new Error("Aborted"), { name: "AbortError" });
      expect(mapAuthError(abort)).toBe("offline");
      expect(mapAuthError(Object.assign(new Error("x"), { name: "TimeoutError" }))).toBe("offline");
    });

    it("a bare React Native fetch rejection is offline", () => {
      expect(mapAuthError(new TypeError("Network request failed"))).toBe("offline");
      expect(mapAuthError(new TypeError("Failed to fetch"))).toBe("offline");
    });

    it("gateway timeouts and the server-side request_timeout are offline", () => {
      expect(mapAuthError(authApiError(504, undefined))).toBe("offline");
      expect(mapAuthError(authApiError(408, undefined))).toBe("offline");
      expect(mapAuthError(authApiError(504, "request_timeout"))).toBe("offline");
    });
  });

  describe("AC-37: anything else is 'unknown', and the server text never survives", () => {
    it("maps an unrecognised code to unknown", () => {
      expect(mapAuthError(authApiError(500, "some_future_code", "Database exploded: secret-row-42"))).toBe(
        "unknown",
      );
    });

    it("returns only a kind — no field carries the server string", () => {
      const secret = "leak-me-please-1234";
      const result = mapAuthError(authApiError(500, "brand_new_code", secret));
      expect(JSON.stringify(result)).not.toContain(secret);
      expect(AUTH_ERROR_KINDS).toContain(result);
    });

    it.each([undefined, null, "boom", 42, {}, [], Symbol("s")])("copes with a non-error throwable (%p)", (value) => {
      expect(mapAuthError(value)).toBe("unknown");
    });

    it("a TypeError that is not about the network is unknown", () => {
      expect(mapAuthError(new TypeError("undefined is not a function"))).toBe("unknown");
    });

    it("every result is one of the fixed kinds", () => {
      const samples = [
        authApiError(400, "invalid_credentials"),
        authApiError(500, "x"),
        new TypeError("Network request failed"),
        null,
      ];
      for (const sample of samples) expect(AUTH_ERROR_KINDS).toContain(mapAuthError(sample));
    });
  });

  it("pins the closed set of kinds (Step 8 maps each one to a localized string)", () => {
    expect([...AUTH_ERROR_KINDS]).toEqual([
      "invalidCredentials",
      "emailExists",
      "weakPassword",
      "otpInvalidOrExpired",
      "samePassword",
      "rateLimited",
      "offline",
      "unknown",
    ]);
  });
});

describe("safeErrorCode", () => {
  it("passes through an identifier-shaped code", () => {
    expect(safeErrorCode(authApiError(400, "invalid_credentials"))).toBe("invalid_credentials");
  });

  it("drops anything that could carry user data", () => {
    expect(safeErrorCode(authApiError(400, "anna@example.com"))).toBeUndefined();
    expect(safeErrorCode(authApiError(400, "Invalid login credentials for x"))).toBeUndefined();
    expect(safeErrorCode(authApiError(400, undefined))).toBeUndefined();
    expect(safeErrorCode("invalid_credentials")).toBeUndefined();
    expect(safeErrorCode(null)).toBeUndefined();
  });
});
