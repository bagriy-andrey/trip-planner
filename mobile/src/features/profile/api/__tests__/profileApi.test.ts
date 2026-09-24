import { EMPTY_PROFILE } from "@tripplanner/shared";

import { supabase } from "@/lib/supabase";

import { getProfile, saveProfile } from "../profileApi";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));

const from = supabase.from as unknown as jest.Mock;

const USER_ID = "0d4c1f5a-8b6a-4d0e-b0a3-6a6a1c9d7e22";
const SERVER_TEXT = "Raw server sentence that must never reach the UI";

const row = {
  user_id: USER_ID,
  citizenship_country_code: "PT",
  residence_country_code: "PT",
  home_city_place_id: "city-lisbon",
  home_airport_code: "LIS",
  home_currency: "EUR",
};

interface Recorded {
  method: string;
  args: unknown[];
}

function mockRequest(result: unknown) {
  const calls: Recorded[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "upsert", "maybeSingle", "single"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  from.mockReturnValueOnce(builder);
  return calls;
}

const ok = (data: unknown) => ({ data, error: null, status: 200 });
const fail = (error: unknown, status = 400) => ({ data: null, error, status });
const pgError = (code: string) => ({ message: SERVER_TEXT, details: "", hint: "", code });

const CONSOLE_METHODS = ["log", "info", "warn", "error", "debug", "trace"] as const;
let consoleSpies: jest.SpyInstance[] = [];

beforeEach(() => {
  from.mockReset();
  consoleSpies = CONSOLE_METHODS.map((method) => jest.spyOn(console, method).mockImplementation(() => undefined));
});

afterEach(() => {
  for (const spy of consoleSpies) spy.mockRestore();
});

describe("getProfile", () => {
  it("reads the profiles table and maps the row", async () => {
    const calls = mockRequest(ok(row));
    expect(await getProfile()).toEqual({
      ok: true,
      data: {
        citizenship: "PT",
        residence: "PT",
        homeCityId: "city-lisbon",
        homeAirport: "LIS",
        homeCurrency: "EUR",
      },
    });
    expect(from).toHaveBeenCalledWith("profiles");
    expect(calls.map((c) => c.method)).toEqual(["select", "maybeSingle"]);
  });

  it("no row is the empty profile (AC-7)", async () => {
    mockRequest(ok(null));
    expect(await getProfile()).toEqual({ ok: true, data: EMPTY_PROFILE });
  });

  it("an unreadable row is unknown", async () => {
    mockRequest(ok({ ...row, home_airport_code: "lisbon" }));
    expect(await getProfile()).toEqual({ ok: false, kind: "unknown" });
  });

  it("classifies errors by kind (AC-29)", async () => {
    mockRequest(fail(pgError("42501"), 403));
    expect(await getProfile()).toEqual({ ok: false, kind: "denied" });
    mockRequest(fail({ message: "Network request failed" }, 0));
    expect(await getProfile()).toEqual({ ok: false, kind: "offline" });
    mockRequest(fail({ name: "AbortError", message: "aborted" }));
    expect(await getProfile()).toEqual({ ok: false, kind: "timeout" });
    mockRequest(fail(pgError("XX000"), 500));
    expect(await getProfile()).toEqual({ ok: false, kind: "unknown" });
  });

  it("a thrown client is classified, never rethrown", async () => {
    from.mockImplementationOnce(() => {
      throw new TypeError("Network request failed");
    });
    expect(await getProfile()).toEqual({ ok: false, kind: "offline" });
  });
});

describe("saveProfile", () => {
  it("upserts exactly user_id plus the changed columns (AC-8)", async () => {
    const calls = mockRequest(ok(row));
    const result = await saveProfile(USER_ID, { homeCurrency: "EUR" }, EMPTY_PROFILE);
    expect(result.ok).toBe(true);
    expect(calls.find((c) => c.method === "upsert")?.args).toEqual([
      { user_id: USER_ID, home_currency: "EUR" },
      { onConflict: "user_id" },
    ]);
    expect(calls.map((c) => c.method)).toEqual(["upsert", "select", "single"]);
  });

  it("writes null for a cleared column", async () => {
    const calls = mockRequest(ok({ ...row, home_currency: null }));
    await saveProfile(USER_ID, { homeCurrency: null }, { ...EMPTY_PROFILE, homeCurrency: "EUR" });
    expect(calls.find((c) => c.method === "upsert")?.args[0]).toEqual({ user_id: USER_ID, home_currency: null });
  });

  it("an invalid patch is unknown WITHOUT a request", async () => {
    expect(await saveProfile(USER_ID, { homeCurrency: "XXX" }, EMPTY_PROFILE)).toEqual({ ok: false, kind: "unknown" });
    expect(from).not.toHaveBeenCalled();
  });

  it("each error category has its own kind", async () => {
    const cases: [unknown, number, string][] = [
      [pgError("42501"), 403, "denied"],
      [{ message: "Network request failed" }, 0, "offline"],
      [{ name: "AbortError", message: "aborted" }, 0, "timeout"],
      [pgError("XX000"), 500, "unknown"],
    ];
    for (const [error, status, kind] of cases) {
      mockRequest(fail(error, status));
      expect(await saveProfile(USER_ID, { homeCurrency: "EUR" }, EMPTY_PROFILE)).toEqual({ ok: false, kind });
    }
  });

  it("logs only operation and errorCode", async () => {
    mockRequest(fail(pgError("42501"), 403));
    await saveProfile(USER_ID, { homeCurrency: "EUR" }, EMPTY_PROFILE);
    const output = JSON.stringify(consoleSpies.flatMap((spy) => spy.mock.calls));
    expect(output).toContain("profile.save");
    expect(output).toContain("denied");
    for (const secret of [SERVER_TEXT, USER_ID, "EUR"]) expect(output).not.toContain(secret);
  });
});
