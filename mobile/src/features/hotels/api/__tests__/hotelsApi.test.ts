import { parseHotelForm } from "@tripplanner/shared";
import type { HotelFormValue } from "@tripplanner/shared";

import { supabase } from "@/lib/supabase";

import { createHotel, deleteHotel, getHotel, listHotels, updateHotel } from "../hotelsApi";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));

const from = supabase.from as unknown as jest.Mock;

const TRIP_ID = "0d4c1f5a-8b6a-4d0e-b0a3-6a6a1c9d7e22";
const HOTEL_ID = "5b1e3c0e-1c3f-4c6e-9a53-3b7f0f8d2a11";
const BOOKING_REF = "SECRET-REF-0001";
const SERVER_TEXT = "Raw server sentence that must never reach the UI";

const goodRow = {
  id: HOTEL_ID,
  trip_id: TRIP_ID,
  source: "manual",
  name: "Casa Alfama",
  city_place_id: "city-lisbon",
  time_zone: "Europe/Lisbon",
  address: "Rua 1",
  maps_url: null,
  check_in_at: "2026-06-15T14:00:00+00:00",
  check_out_at: "2026-06-18T10:00:00+00:00",
  guests: 2,
  parking: "none",
  breakfast: "none",
  breakfast_days: null,
  cost_amount: null,
  cost_currency: null,
  booking_ref: BOOKING_REF,
  notes: null,
  created_at: "2026-05-01T10:00:00+00:00",
  updated_at: "2026-05-01T10:00:00+00:00",
};

function formOf(): HotelFormValue {
  const parsed = parseHotelForm({
    name: "Casa Alfama",
    cityPlaceId: "city-lisbon",
    checkInDate: "2026-06-15",
    checkInTime: "15:00",
    checkOutDate: "2026-06-18",
    checkOutTime: "11:00",
    bookingRef: BOOKING_REF,
  });
  if (!parsed.ok) throw new Error("fixture form is invalid");
  return parsed.value;
}

interface Recorded {
  method: string;
  args: unknown[];
}

function mockRequest(result: unknown) {
  const calls: Recorded[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "insert", "update", "delete", "eq", "order", "maybeSingle"]) {
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

function callOf(calls: Recorded[], method: string): unknown[] {
  const found = calls.find((call) => call.method === method);
  if (!found) throw new Error(`no ${method} call`);
  return found.args;
}

const ok = (data: unknown) => ({ data, error: null, status: 200 });
const fail = (error: unknown, status = 400) => ({ data: null, error, status });
const pgError = (code: string) => ({ message: SERVER_TEXT, details: "", hint: "", code });

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

describe("listHotels", () => {
  it("reads trip_hotels of the trip ordered by check_in_at and maps rows", async () => {
    const calls = mockRequest(ok([goodRow]));
    const result = await listHotels(TRIP_ID);

    expect(from).toHaveBeenCalledWith("trip_hotels");
    expect(callOf(calls, "eq")).toEqual(["trip_id", TRIP_ID]);
    expect(callOf(calls, "order")).toEqual(["check_in_at", { ascending: true }]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data[0]).toMatchObject({ id: HOTEL_ID, tripId: TRIP_ID, name: "Casa Alfama" });
  });

  it("an empty table is a successful empty list", async () => {
    mockRequest(ok([]));
    expect(await listHotels(TRIP_ID)).toEqual({ ok: true, data: [] });
  });

  it("a corrupt row fails the whole call, no partial data", async () => {
    mockRequest(ok([goodRow, { ...goodRow, city_place_id: "city-nowhere" }]));
    expect(await listHotels(TRIP_ID)).toEqual({ ok: false, kind: "unknown" });
  });

  it("a request error is classified and never logs ids, refs or server text", async () => {
    mockRequest(fail(pgError("42501"), 403));
    const result = await listHotels(TRIP_ID);
    expect(result.ok).toBe(false);
    const output = consoleOutput();
    expect(output).not.toContain(TRIP_ID);
    expect(output).not.toContain(BOOKING_REF);
    expect(output).not.toContain(SERVER_TEXT);
  });

  it("a thrown fetch becomes a closed failure", async () => {
    from.mockImplementationOnce(() => {
      throw new Error(SERVER_TEXT);
    });
    const result = await listHotels(TRIP_ID);
    expect(result.ok).toBe(false);
    expect(consoleOutput()).not.toContain(SERVER_TEXT);
  });
});

describe("getHotel", () => {
  it("filters by trip id and hotel id", async () => {
    const calls = mockRequest(ok(goodRow));
    const result = await getHotel(TRIP_ID, HOTEL_ID);
    expect(result.ok).toBe(true);
    expect(calls.filter((c) => c.method === "eq").map((c) => c.args)).toEqual([
      ["trip_id", TRIP_ID],
      ["id", HOTEL_ID],
    ]);
  });

  it("a non-UUID hotel id is notFound WITHOUT calling the client (AC-33)", async () => {
    expect(await getHotel(TRIP_ID, "not-a-uuid")).toEqual({ ok: false, kind: "notFound" });
    expect(await getHotel("nope", HOTEL_ID)).toEqual({ ok: false, kind: "notFound" });
    expect(from).not.toHaveBeenCalled();
  });

  it("no row is notFound", async () => {
    mockRequest(ok(null));
    expect(await getHotel(TRIP_ID, HOTEL_ID)).toEqual({ ok: false, kind: "notFound" });
  });

  it("a corrupt row is an error, not a half-filled hotel", async () => {
    mockRequest(ok({ ...goodRow, time_zone: "Mars/Base" }));
    expect(await getHotel(TRIP_ID, HOTEL_ID)).toEqual({ ok: false, kind: "unknown" });
  });
});

describe("createHotel", () => {
  it("inserts the write mapping with source manual and returns the saved hotel", async () => {
    const calls = mockRequest(ok(goodRow));
    const result = await createHotel(TRIP_ID, formOf());
    expect(result.ok).toBe(true);
    expect(callOf(calls, "insert")[0]).toMatchObject({
      trip_id: TRIP_ID,
      source: "manual",
      city_place_id: "city-lisbon",
      time_zone: "Europe/Lisbon",
    });
  });

  it("an insert that returns nothing is unknown", async () => {
    mockRequest(ok(null));
    expect(await createHotel(TRIP_ID, formOf())).toEqual({ ok: false, kind: "unknown" });
  });
});

describe("updateHotel", () => {
  it("sends the full write scoped to trip and id", async () => {
    const calls = mockRequest(ok(goodRow));
    const result = await updateHotel(TRIP_ID, HOTEL_ID, formOf());
    expect(result.ok).toBe(true);
    expect(callOf(calls, "update")[0]).toMatchObject({ trip_id: TRIP_ID, source: "manual" });
    expect(calls.filter((c) => c.method === "eq").map((c) => c.args)).toEqual([
      ["trip_id", TRIP_ID],
      ["id", HOTEL_ID],
    ]);
  });

  it("zero rows is notFound", async () => {
    mockRequest(ok(null));
    expect(await updateHotel(TRIP_ID, HOTEL_ID, formOf())).toEqual({ ok: false, kind: "notFound" });
  });
});

describe("deleteHotel", () => {
  it("deletes by trip and id and reports the id", async () => {
    const calls = mockRequest(ok({ id: HOTEL_ID }));
    expect(await deleteHotel(TRIP_ID, HOTEL_ID)).toEqual({ ok: true, data: { id: HOTEL_ID } });
    expect(calls.some((c) => c.method === "delete")).toBe(true);
  });

  it("zero rows deleted is notFound", async () => {
    mockRequest(ok(null));
    expect(await deleteHotel(TRIP_ID, HOTEL_ID)).toEqual({ ok: false, kind: "notFound" });
  });

  it("a non-UUID id is notFound without a request", async () => {
    expect(await deleteHotel(TRIP_ID, "x")).toEqual({ ok: false, kind: "notFound" });
    expect(from).not.toHaveBeenCalled();
  });
});
