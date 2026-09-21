import { TRIP_ERROR_KINDS, TripApiError, mapTripError, safeErrorCode } from "../errors";

const SERVER_TEXT = "Raw server sentence that must never reach the UI";

function pgError(code: string, message = SERVER_TEXT) {
  return { message, details: "", hint: "", code };
}

describe("mapTripError", () => {
  it("lists exactly the five closed kinds", () => {
    expect([...TRIP_ERROR_KINDS]).toEqual(["notFound", "offline", "timeout", "denied", "unknown"]);
  });

  it("row-level security / permission failures are denied", () => {
    expect(mapTripError(pgError("42501"))).toBe("denied");
    expect(mapTripError(pgError("PGRST301"))).toBe("denied");
    expect(mapTripError(pgError(""), 401)).toBe("denied");
    expect(mapTripError(pgError(""), 403)).toBe("denied");
  });

  it("'no rows' and a malformed id are notFound (AC-56)", () => {
    expect(mapTripError(pgError("PGRST116"))).toBe("notFound");
    expect(mapTripError(pgError("22P02"))).toBe("notFound");
  });

  it("the request timeout (an abort) is timeout, however it is shaped (AC-59)", () => {
    expect(mapTripError(Object.assign(new Error("x"), { name: "AbortError" }))).toBe("timeout");
    expect(mapTripError(pgError("", "AbortError: signal is aborted without reason"), 0)).toBe("timeout");
    expect(mapTripError(pgError("57014", "canceling statement due to statement timeout"))).toBe("timeout");
    expect(mapTripError(pgError(""), 504)).toBe("timeout");
    expect(mapTripError(pgError(""), 408)).toBe("timeout");
  });

  it("a failed network request is offline", () => {
    expect(mapTripError(new TypeError("Network request failed"))).toBe("offline");
    expect(mapTripError(pgError("", "TypeError: Failed to fetch"), 0)).toBe("offline");
    expect(mapTripError(pgError("", "FetchError: whatever"))).toBe("offline");
    expect(mapTripError(pgError(""), 0)).toBe("offline");
    expect(mapTripError(pgError(""), 503)).toBe("offline");
  });

  it("anything else is unknown, and the result is only a kind (AC-60)", () => {
    for (const input of [pgError("XX000"), pgError("23514"), null, undefined, "boom", 42, {}]) {
      const kind = mapTripError(input);
      expect(kind).toBe("unknown");
      expect(JSON.stringify(kind)).not.toContain("server sentence");
    }
    expect(mapTripError(pgError("23514"), 400)).toBe("unknown");
  });

  it("a code wins over the message text", () => {
    expect(mapTripError(pgError("42501", "Network request failed"))).toBe("denied");
  });
});

describe("safeErrorCode", () => {
  it("returns identifier-shaped codes only", () => {
    expect(safeErrorCode(pgError("42501"))).toBe("42501");
    expect(safeErrorCode(pgError("PGRST116"))).toBe("PGRST116");
    expect(safeErrorCode(pgError(""))).toBeUndefined();
    expect(safeErrorCode(pgError("not a code, it is a sentence"))).toBeUndefined();
    expect(safeErrorCode("PGRST116")).toBeUndefined();
    expect(safeErrorCode(null)).toBeUndefined();
  });
});

describe("TripApiError", () => {
  it("carries the kind (the query client's retry rule reads it) and no server text", () => {
    const error = new TripApiError("offline");
    expect(error).toBeInstanceOf(Error);
    expect(error.kind).toBe("offline");
    expect(error.message).toBe("offline");
  });
});
