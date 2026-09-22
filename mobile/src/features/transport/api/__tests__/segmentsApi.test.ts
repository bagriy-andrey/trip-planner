import { parseSegmentForm, toSegmentWrite } from "@tripplanner/shared";
import type { SegmentFormInput, SegmentFormValue } from "@tripplanner/shared";

import { supabase } from "@/lib/supabase";

import { createSegment, deleteSegment, getSegment, listSegments, updateSegment } from "../segmentsApi";

// The real client is never built here: it would need the build's env and would open storage.
jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));

const from = supabase.from as unknown as jest.Mock;

const TRIP_ID = "0d4c1f5a-8b6a-4d0e-b0a3-6a6a1c9d7e22";
const SEGMENT_ID = "5b1e3c0e-1c3f-4c6e-9a53-3b7f0f8d2a11";
const SEAT = "12A";
const TICKET_NUMBER = "SECRET-TICKET-0001";
const SERVER_TEXT = "Raw server sentence that must never reach the UI";

const goodRow = {
  id: SEGMENT_ID,
  trip_id: TRIP_ID,
  mode: "flight",
  source: "manual",
  flight_number: "LO1234",
  carrier_code: "LO",
  from_airport_code: "KRK",
  from_time_zone: "Europe/Warsaw",
  to_airport_code: "OPO",
  to_time_zone: "Europe/Lisbon",
  departure_at: "2026-06-15T08:00:00+00:00",
  arrival_at: "2026-06-15T12:00:00+00:00",
  baggage_included: true,
  passengers: 2,
  seat: SEAT,
  ticket_number: TICKET_NUMBER,
  created_at: "2026-05-01T10:00:00+00:00",
  updated_at: "2026-05-01T10:00:00+00:00",
};

const validFormInput: SegmentFormInput = {
  flightNumber: "LO 1234",
  from: "krk",
  to: "opo",
  departureDate: "2026-06-15",
  departureTime: "10:00",
  arrivalDate: "2026-06-15",
  arrivalTime: "13:00",
  baggageIncluded: true,
  passengers: 2,
  seat: SEAT,
  ticketNumber: TICKET_NUMBER,
};

function formOf(input: SegmentFormInput = validFormInput): SegmentFormValue {
  const parsed = parseSegmentForm(input);
  if (!parsed.ok) throw new Error("fixture form is invalid");
  return parsed.value;
}

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

/** A request that never settles: proves the caller relies on the client's own timeout (AC-84),
 * not a second one here — this module starts no timer of its own. */
function mockHang() {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "insert", "update", "delete", "eq", "order", "maybeSingle"]) {
    builder[method] = () => builder;
  }
  builder.then = () => new Promise(() => undefined);
  from.mockReturnValueOnce(builder);
}

function callOf(calls: Recorded[], method: string): unknown[] {
  const found = calls.find((call) => call.method === method);
  if (!found) throw new Error(`no ${method} call`);
  return found.args;
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

describe("listSegments", () => {
  it("reads trip_segments filtered by trip id and maps every row to a Segment", async () => {
    const calls = mockRequest(ok([goodRow]));
    const result = await listSegments(TRIP_ID);

    expect(from).toHaveBeenCalledWith("trip_segments");
    expect(callOf(calls, "eq")).toEqual(["trip_id", TRIP_ID]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: SEGMENT_ID,
      tripId: TRIP_ID,
      from: { iata: "KRK" },
      to: { iata: "OPO" },
      flightNumber: "LO1234",
    });
  });

  it("an empty table is a successful empty list", async () => {
    mockRequest(ok([]));
    await expect(listSegments(TRIP_ID)).resolves.toEqual({ ok: true, data: [] });
  });

  it("AC-85/AC-86: one corrupted row fails the whole load - no partial data", async () => {
    mockRequest(ok([goodRow, { ...goodRow, id: "x", mode: "train" }]));
    const result = await listSegments(TRIP_ID);
    expect(result).toEqual({ ok: false, kind: "unknown" });
    expect(result).not.toHaveProperty("data");

    const warn = console.warn as jest.Mock;
    expect(warn).toHaveBeenCalledWith("[segments]", "listSegments", "unreadable row");
  });

  it("AC-86: an unknown airport code is a corrupted row too", async () => {
    mockRequest(ok([{ ...goodRow, from_airport_code: "ZZZ" }]));
    await expect(listSegments(TRIP_ID)).resolves.toEqual({ ok: false, kind: "unknown" });
  });

  it("a non-array payload is a load failure too", async () => {
    mockRequest(ok({ not: "a list" }));
    await expect(listSegments(TRIP_ID)).resolves.toEqual({ ok: false, kind: "unknown" });
  });
});

describe("getSegment", () => {
  it("filters by trip id and segment id", async () => {
    const calls = mockRequest(ok(goodRow));
    const result = await getSegment(TRIP_ID, SEGMENT_ID);
    expect(calls.filter((c) => c.method === "eq").map((c) => c.args)).toEqual([
      ["trip_id", TRIP_ID],
      ["id", SEGMENT_ID],
    ]);
    expect(result.ok && result.data.id).toBe(SEGMENT_ID);
  });

  it("zero rows (deleted, or someone else's - RLS) is notFound", async () => {
    mockRequest(ok(null));
    await expect(getSegment(TRIP_ID, SEGMENT_ID)).resolves.toEqual({ ok: false, kind: "notFound" });
  });
});

describe("createSegment (AC-39)", () => {
  it("sends mode:'flight', source:'manual' and the normalised toSegmentWrite body", async () => {
    const form = formOf();
    const calls = mockRequest(ok(goodRow));
    const result = await createSegment(TRIP_ID, form);

    const [body] = callOf(calls, "insert");
    expect(body).toEqual(toSegmentWrite(form, TRIP_ID));
    expect(body).toMatchObject({
      mode: "flight",
      source: "manual",
      from_airport_code: "KRK",
      to_airport_code: "OPO",
    });
    expect(result.ok).toBe(true);
  });

  it("an insert that comes back without a row is an unknown failure", async () => {
    mockRequest(ok(null));
    await expect(createSegment(TRIP_ID, formOf())).resolves.toEqual({ ok: false, kind: "unknown" });
  });

  it("a denied insert is denied", async () => {
    mockRequest(fail(pgError("42501", 'new row violates row-level security policy'), 403));
    await expect(createSegment(TRIP_ID, formOf())).resolves.toEqual({ ok: false, kind: "denied" });
  });
});

describe("updateSegment", () => {
  it("sends the full write for one trip id + segment id", async () => {
    const form = formOf();
    const calls = mockRequest(ok(goodRow));
    const result = await updateSegment(TRIP_ID, SEGMENT_ID, form);
    const [body] = callOf(calls, "update");
    expect(body).toEqual(toSegmentWrite(form, TRIP_ID));
    expect(calls.filter((c) => c.method === "eq").map((c) => c.args)).toEqual([
      ["trip_id", TRIP_ID],
      ["id", SEGMENT_ID],
    ]);
    expect(result.ok).toBe(true);
  });
});

describe("deleteSegment", () => {
  it("deletes by trip id + segment id and asks for the deleted row back", async () => {
    const calls = mockRequest(ok({ id: SEGMENT_ID }));
    const result = await deleteSegment(TRIP_ID, SEGMENT_ID);
    expect(calls.map((call) => call.method)).toContain("delete");
    expect(calls.filter((c) => c.method === "eq").map((c) => c.args)).toEqual([
      ["trip_id", TRIP_ID],
      ["id", SEGMENT_ID],
    ]);
    expect(result).toEqual({ ok: true, data: { id: SEGMENT_ID } });
  });
});

describe.each([
  ["updateSegment", () => updateSegment(TRIP_ID, SEGMENT_ID, formOf())],
  ["deleteSegment", () => deleteSegment(TRIP_ID, SEGMENT_ID)],
] as const)("%s - zero affected rows (AC-81)", (_name, run) => {
  it("is notFound", async () => {
    mockRequest(ok(null));
    await expect(run()).resolves.toEqual({ ok: false, kind: "notFound" });
  });
});

describe.each([
  ["listSegments", () => listSegments(TRIP_ID)],
  ["getSegment", () => getSegment(TRIP_ID, SEGMENT_ID)],
  ["createSegment", () => createSegment(TRIP_ID, formOf())],
  ["updateSegment", () => updateSegment(TRIP_ID, SEGMENT_ID, formOf())],
  ["deleteSegment", () => deleteSegment(TRIP_ID, SEGMENT_ID)],
] as const)("%s - error classification", (_name, run) => {
  it("network failure -> offline", async () => {
    mockRequest(fail(pgError("", "TypeError: Network request failed"), 0));
    await expect(run()).resolves.toEqual({ ok: false, kind: "offline" });
  });

  it("timeout (aborted request) -> timeout, matching the client's own 15s timeout shape (AC-84)", async () => {
    mockRequest(fail(pgError("", "AbortError: signal is aborted without reason"), 0));
    await expect(run()).resolves.toEqual({ ok: false, kind: "timeout" });
  });

  it("permission failure -> denied", async () => {
    mockRequest(fail(pgError("42501"), 403));
    await expect(run()).resolves.toEqual({ ok: false, kind: "denied" });
  });

  it("unknown code -> unknown, and the server's raw text is absent from the result", async () => {
    mockRequest(fail({ message: SERVER_TEXT, details: "secret detail", hint: "", code: "XX999" }, 500));
    const result = await run();
    expect(result).toEqual({ ok: false, kind: "unknown" });
    expect(JSON.stringify(result)).not.toContain("Raw server sentence");
  });

  it("never logs ticket number, seat, airport codes or ids - only operation name and kind", async () => {
    mockRequest(fail({ message: SERVER_TEXT, details: "", hint: "", code: "XX999" }, 500));
    await run();
    const output = consoleOutput();
    for (const secret of [SEAT, TICKET_NUMBER, "KRK", "OPO", SEGMENT_ID, TRIP_ID]) {
      expect(output).not.toContain(secret);
    }
  });
});

describe("timeout: a hung request never resolves here (AC-84)", () => {
  it("listSegments never settles on its own without the client's timeout firing", async () => {
    mockHang();
    let settled = false;
    listSegments(TRIP_ID).then(() => (settled = true));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(settled).toBe(false);
  });
});

describe("logging discipline", () => {
  it("logs nothing on success", async () => {
    mockRequest(ok([goodRow]));
    await listSegments(TRIP_ID);
    expect(consoleSpies.flatMap((spy) => spy.mock.calls)).toEqual([]);
  });

  it("an unreadable row logs no row content", async () => {
    mockRequest(ok({ ...goodRow, departure_at: "not-a-date" }));
    await getSegment(TRIP_ID, SEGMENT_ID);
    const output = consoleOutput();
    expect(output).toContain("unreadable row");
    for (const secret of [SEAT, TICKET_NUMBER, "KRK", "OPO", "not-a-date"]) {
      expect(output).not.toContain(secret);
    }
  });
});
