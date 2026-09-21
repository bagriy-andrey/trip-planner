import { parseTripForm, toTripWrite } from "@tripplanner/shared";
import type { TripFormValue } from "@tripplanner/shared";

import { supabase } from "@/lib/supabase";

import { archiveTrip, createTrip, deleteTrip, getTrip, listTrips, unarchiveTrip, updateTrip } from "../tripsApi";

// The real client is never built here: it would need the build's env and would open storage.
jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));

const from = supabase.from as unknown as jest.Mock;

const TRIP_ID = "5b1e3c0e-1c3f-4c6e-9a53-3b7f0f8d2a11";
const DESTINATION = "Zanzibar-Secret-Destination";
const TITLE = "Secret trip title";
const USER_ID = "0d4c1f5a-8b6a-4d0e-b0a3-6a6a1c9d7e22";
const SERVER_TEXT = "Raw server sentence that must never reach the UI";

const cityRow = {
  id: TRIP_ID,
  user_id: USER_ID,
  destination: DESTINATION,
  place_kind: "city",
  place_id: "city-porto",
  country_code: "PT",
  iana_timezone: "Europe/Lisbon",
  airport_code: "OPO",
  title: TITLE,
  start_date: "2026-09-12",
  end_date: "2026-09-18",
  archived_at: null,
  created_at: "2026-09-21T19:39:35.123456+00:00",
  updated_at: "2026-09-21T19:39:35.123456+00:00",
};
const customRow = {
  ...cityRow,
  place_kind: "custom",
  place_id: null,
  country_code: null,
  iana_timezone: null,
  airport_code: null,
  title: null,
  start_date: null,
  end_date: null,
};

interface Recorded {
  method: string;
  args: unknown[];
}

/** A chainable PostgREST builder double: records every call, resolves to `result` when awaited. */
function mockRequest(result: unknown) {
  const calls: Recorded[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "insert", "update", "delete", "eq", "order", "maybeSingle", "single"]) {
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

function mockRejection(reason: unknown) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "insert", "update", "delete", "eq", "maybeSingle"]) {
    builder[method] = () => builder;
  }
  builder.then = (_resolve: unknown, reject: (reason: unknown) => unknown) => Promise.reject(reason).catch(reject);
  from.mockReturnValueOnce(builder);
}

function callOf(calls: Recorded[], method: string): unknown[] {
  const found = calls.find((call) => call.method === method);
  if (!found) throw new Error(`no ${method} call`);
  return found.args;
}

function formOf(input: Record<string, string | null>): TripFormValue {
  const parsed = parseTripForm(input);
  if (!parsed.ok) throw new Error("fixture form is invalid");
  return parsed.value;
}

const ok = (data: unknown) => ({ data, error: null, status: 200 });
const fail = (error: unknown, status = 400) => ({ data: null, error, status });
const pgError = (code: string, message = SERVER_TEXT) => ({ message, details: "", hint: "", code });

const CONSOLE_METHODS = ["log", "info", "warn", "error", "debug", "trace"] as const;
let consoleSpies: jest.SpyInstance[] = [];

function consoleOutput(): string {
  return JSON.stringify(consoleSpies.flatMap((spy) => spy.mock.calls));
}

beforeEach(() => {
  from.mockReset();
  consoleSpies = CONSOLE_METHODS.map((method) =>
    jest.spyOn(console, method).mockImplementation(() => undefined),
  );
});

afterEach(() => {
  for (const spy of consoleSpies) spy.mockRestore();
});

describe("listTrips", () => {
  it("reads the trips table with explicit columns (no user_id) and maps every row to a Trip", async () => {
    const calls = mockRequest(ok([cityRow, customRow]));
    const result = await listTrips();

    expect(from).toHaveBeenCalledWith("trips");
    const [columns] = callOf(calls, "select");
    expect(columns).not.toContain("user_id");
    expect(columns).toContain("archived_at");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toMatchObject({
      id: TRIP_ID,
      destination: DESTINATION,
      place: { kind: "city", placeId: "city-porto", airportCode: "OPO" },
      startDate: "2026-09-12",
    });
    expect(result.data[1]?.place).toEqual({ kind: "custom" });
    expect(JSON.stringify(result.data)).not.toContain(USER_ID);
  });

  it("an empty table is a successful empty list", async () => {
    mockRequest(ok([]));
    await expect(listTrips()).resolves.toEqual({ ok: true, data: [] });
  });

  it("AC-61: one unparsable row fails the whole load - no partial data - logged apart from network errors", async () => {
    mockRequest(ok([cityRow, { ...cityRow, id: "x", place_kind: "custom" }]));
    const result = await listTrips();
    expect(result).toEqual({ ok: false, kind: "unknown" });
    expect(result).not.toHaveProperty("data");

    const warn = console.warn as jest.Mock;
    expect(warn).toHaveBeenCalledWith("[trips]", "listTrips", "unreadable row");
    expect(warn).not.toHaveBeenCalledWith("[trips]", "listTrips", "failed", expect.anything());
  });

  it("AC-61: a non-array payload is a load failure too", async () => {
    mockRequest(ok({ not: "a list" }));
    await expect(listTrips()).resolves.toEqual({ ok: false, kind: "unknown" });
  });

  it("a network failure is logged as a failed request, not as an unreadable row", async () => {
    mockRequest(fail(pgError("", "TypeError: Network request failed"), 0));
    await expect(listTrips()).resolves.toEqual({ ok: false, kind: "offline" });
    const warn = console.warn as jest.Mock;
    expect(warn).toHaveBeenCalledWith("[trips]", "listTrips", "failed", "offline");
    expect(warn).not.toHaveBeenCalledWith("[trips]", "listTrips", "unreadable row");
  });
});

describe("getTrip", () => {
  it("filters by id and returns the trip", async () => {
    const calls = mockRequest(ok(cityRow));
    const result = await getTrip(TRIP_ID);
    expect(callOf(calls, "eq")).toEqual(["id", TRIP_ID]);
    expect(result.ok && result.data.id).toBe(TRIP_ID);
  });

  it("zero rows (deleted, or someone else's - RLS) is notFound (AC-56)", async () => {
    mockRequest(ok(null));
    await expect(getTrip(TRIP_ID)).resolves.toEqual({ ok: false, kind: "notFound" });
  });

  it("an id that is not a uuid is notFound, not a failure of the whole app", async () => {
    mockRequest(fail(pgError("22P02", 'invalid input syntax for type uuid: "../../etc"')));
    await expect(getTrip("../../etc")).resolves.toEqual({ ok: false, kind: "notFound" });
  });
});

describe("createTrip (AC-15, AC-31)", () => {
  it("sends the toTripWrite body, minus an empty title, with the directory fields of a picked suggestion", async () => {
    const form = formOf({ destination: "Porto", placeId: "city-porto", title: "", startDate: "2026-09-12", endDate: "2026-09-18" });
    const calls = mockRequest(ok(cityRow));
    const result = await createTrip(form);

    const [body] = callOf(calls, "insert");
    const { title: _title, ...withoutTitle } = toTripWrite(form);
    expect(body).toEqual(withoutTitle);
    expect(body).not.toHaveProperty("title");
    expect(body).toMatchObject({
      place_kind: "city",
      place_id: "city-porto",
      country_code: "PT",
      iana_timezone: "Europe/Lisbon",
      airport_code: "OPO",
    });
    expect(body).not.toHaveProperty("user_id");
    expect(result.ok).toBe(true);
  });

  it("free text: place_kind custom and no directory field filled", async () => {
    const form = formOf({ destination: "Somewhere nice" });
    const calls = mockRequest(ok(customRow));
    await createTrip(form);
    const [body] = callOf(calls, "insert");
    expect(body).toMatchObject({
      destination: "Somewhere nice",
      place_kind: "custom",
      place_id: null,
      country_code: null,
      iana_timezone: null,
      airport_code: null,
      start_date: null,
      end_date: null,
    });
    expect(body).not.toHaveProperty("title");
  });

  it("a title the user typed is sent as typed (normalised by the form)", async () => {
    const form = formOf({ destination: "Porto", title: "  Summer   trip " });
    const calls = mockRequest(ok(cityRow));
    await createTrip(form);
    expect(callOf(calls, "insert")[0]).toEqual({ ...toTripWrite(form), title: "Summer trip" });
  });

  it("an insert that comes back without a row is an unknown failure", async () => {
    mockRequest(ok(null));
    await expect(createTrip(formOf({ destination: "Porto" }))).resolves.toEqual({ ok: false, kind: "unknown" });
  });

  it("a denied insert is denied", async () => {
    mockRequest(fail(pgError("42501", 'new row violates row-level security policy for table "trips"'), 403));
    await expect(createTrip(formOf({ destination: "Porto" }))).resolves.toEqual({ ok: false, kind: "denied" });
  });
});

describe("updateTrip", () => {
  it("sends the FULL write so a cleared field is cleared, for one id", async () => {
    const form = formOf({ destination: "Somewhere", title: "" });
    const calls = mockRequest(ok(customRow));
    const result = await updateTrip(TRIP_ID, form);
    const [body] = callOf(calls, "update");
    expect(body).toEqual(toTripWrite(form));
    expect(body).toHaveProperty("title", null);
    expect(body).toHaveProperty("place_id", null);
    expect(callOf(calls, "eq")).toEqual(["id", TRIP_ID]);
    expect(result.ok).toBe(true);
  });
});

describe("archiveTrip / unarchiveTrip (AC-52, AC-53)", () => {
  it("archiving lets the database clock set the mark; the client sends no instant of its own", async () => {
    const calls = mockRequest(ok({ ...cityRow, archived_at: "2026-09-21T20:00:00.5+00:00" }));
    const result = await archiveTrip(TRIP_ID);
    expect(callOf(calls, "update")).toEqual([{ archived_at: "now" }]);
    expect(callOf(calls, "eq")).toEqual(["id", TRIP_ID]);
    expect(result.ok && result.data.archivedAt).toBe("2026-09-21T20:00:00.5+00:00");
  });

  it("unarchiving clears the mark", async () => {
    const calls = mockRequest(ok(cityRow));
    const result = await unarchiveTrip(TRIP_ID);
    expect(callOf(calls, "update")).toEqual([{ archived_at: null }]);
    expect(result.ok && result.data.archivedAt).toBeNull();
  });
});

describe("deleteTrip (AC-55)", () => {
  it("deletes by id and asks for the deleted row back", async () => {
    const calls = mockRequest(ok({ id: TRIP_ID }));
    const result = await deleteTrip(TRIP_ID);
    expect(calls.map((call) => call.method)).toContain("delete");
    expect(callOf(calls, "eq")).toEqual(["id", TRIP_ID]);
    expect(result).toEqual({ ok: true, data: { id: TRIP_ID } });
  });
});

describe.each([
  ["updateTrip", () => updateTrip(TRIP_ID, formOf({ destination: "Porto" }))],
  ["archiveTrip", () => archiveTrip(TRIP_ID)],
  ["unarchiveTrip", () => unarchiveTrip(TRIP_ID)],
  ["deleteTrip", () => deleteTrip(TRIP_ID)],
] as const)("%s - zero affected rows (AC-55, AC-56)", (_name, run) => {
  it("is notFound", async () => {
    mockRequest(ok(null));
    await expect(run()).resolves.toEqual({ ok: false, kind: "notFound" });
  });
});

describe.each([
  ["listTrips", () => listTrips()],
  ["getTrip", () => getTrip(TRIP_ID)],
  ["createTrip", () => createTrip(formOf({ destination: "Porto" }))],
  ["updateTrip", () => updateTrip(TRIP_ID, formOf({ destination: "Porto" }))],
  ["archiveTrip", () => archiveTrip(TRIP_ID)],
  ["unarchiveTrip", () => unarchiveTrip(TRIP_ID)],
  ["deleteTrip", () => deleteTrip(TRIP_ID)],
] as const)("%s - error classification (AC-59, AC-60)", (_name, run) => {
  it("network failure -> offline", async () => {
    mockRequest(fail(pgError("", "TypeError: Network request failed"), 0));
    await expect(run()).resolves.toEqual({ ok: false, kind: "offline" });
  });

  it("thrown network error -> offline", async () => {
    mockRejection(new TypeError("Network request failed"));
    await expect(run()).resolves.toEqual({ ok: false, kind: "offline" });
  });

  it("timeout (aborted request) -> timeout", async () => {
    mockRequest(fail(pgError("", "AbortError: signal is aborted without reason"), 0));
    await expect(run()).resolves.toEqual({ ok: false, kind: "timeout" });
  });

  it("permission failure -> denied", async () => {
    mockRequest(fail(pgError("42501"), 403));
    await expect(run()).resolves.toEqual({ ok: false, kind: "denied" });
  });

  it("unknown code -> unknown, and the server's raw text and code are absent from the result", async () => {
    mockRequest(fail({ message: SERVER_TEXT, details: "secret detail", hint: "secret hint", code: "XX999" }, 500));
    const result = await run();
    expect(result).toEqual({ ok: false, kind: "unknown" });
    const text = JSON.stringify(result);
    expect(text).not.toContain("Raw server sentence");
    expect(text).not.toContain("secret");
    expect(text).not.toContain("XX999");
  });

  it("never logs destination, title, ids or user data - only operation name and code", async () => {
    mockRequest(fail({ message: `${DESTINATION} ${TITLE} ${USER_ID}`, details: DESTINATION, hint: "", code: "XX999" }, 500));
    await run();
    const output = consoleOutput();
    expect(output).toContain("XX999");
    for (const secret of [DESTINATION, TITLE, USER_ID, TRIP_ID, "Porto"]) {
      expect(output).not.toContain(secret);
    }
  });
});

describe("logging on success and on an unreadable row", () => {
  it("logs nothing on success", async () => {
    mockRequest(ok([cityRow]));
    await listTrips();
    expect(consoleSpies.flatMap((spy) => spy.mock.calls)).toEqual([]);
  });

  it("an unreadable row logs no row content", async () => {
    mockRequest(ok({ ...cityRow, start_date: "not-a-date" }));
    await getTrip(TRIP_ID);
    const output = consoleOutput();
    expect(output).toContain("unreadable row");
    for (const secret of [DESTINATION, TITLE, USER_ID, "not-a-date"]) {
      expect(output).not.toContain(secret);
    }
  });
});
