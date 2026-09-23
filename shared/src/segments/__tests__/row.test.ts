import { describe, expect, it } from "vitest";
import type { Tables } from "../../db/database.types";
import { segmentFromRowSchema, segmentRowSchema, toSegment } from "../schemas";

// A row exactly as PostgREST returns it (typed by the generated DB type: a renamed column fails tsc).
const goodRow: Tables<"trip_segments"> = {
  id: "5b1e3c0e-1c3f-4c6e-9a53-3b7f0f8d2a11",
  trip_id: "0d4c1f5a-8b6a-4d0e-b0a3-6a6a1c9d7e22",
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
  seat: "12A",
  ticket_number: "1234567890",
  created_at: "2026-05-01T10:00:00+00:00",
  updated_at: "2026-05-01T10:00:00+00:00",
};

function parse(row: unknown) {
  return segmentFromRowSchema.safeParse(row);
}

describe("segmentRowSchema / toSegment (AC-85)", () => {
  it("turns a good row into the domain segment (camelCase, resolved airports)", () => {
    const result = parse(goodRow);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      id: goodRow.id,
      tripId: goodRow.trip_id,
      from: expect.objectContaining({ iata: "KRK", cityId: "city-krakow" }),
      to: expect.objectContaining({ iata: "OPO", cityId: "city-porto" }),
      departureAt: new Date("2026-06-15T08:00:00+00:00"),
      arrivalAt: new Date("2026-06-15T12:00:00+00:00"),
      flightNumber: "LO1234",
      carrierCode: "LO",
      baggageIncluded: true,
      passengers: 2,
      seat: "12A",
      ticketNumber: "1234567890",
    });
  });

  it("a null arrival_at / flight_number / carrier_code / seat / ticket_number round-trips as null", () => {
    const result = parse({
      ...goodRow,
      arrival_at: null,
      flight_number: null,
      carrier_code: null,
      seat: null,
      ticket_number: null,
    });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      arrivalAt: null,
      flightNumber: null,
      carrierCode: null,
      seat: null,
      ticketNumber: null,
    });
  });

  it("exposes the validated row and toSegment separately", () => {
    const row = segmentRowSchema.parse(goodRow);
    expect(toSegment(row)).toEqual(parse(goodRow).data);
  });

  it("fails (never throws) on non-row input", () => {
    for (const input of [null, undefined, 42, "row", [], {}]) {
      expect(parse(input).success).toBe(false);
    }
  });

  // --- AC-86: three ways a row is corrupted ------------------------------------------------------
  it("an unknown mode ('train') fails to parse", () => {
    expect(parse({ ...goodRow, mode: "train" }).success).toBe(false);
  });

  it("a garbage mode fails to parse", () => {
    expect(parse({ ...goodRow, mode: "spaceship" }).success).toBe(false);
  });

  it("an airport code the directory doesn't know fails to parse", () => {
    expect(parse({ ...goodRow, from_airport_code: "ZZZ" }).success).toBe(false);
    expect(parse({ ...goodRow, to_airport_code: "ZZZ" }).success).toBe(false);
  });

  it("a broken time zone fails to parse", () => {
    expect(parse({ ...goodRow, from_time_zone: "Europe/Atlantis" }).success).toBe(false);
    expect(parse({ ...goodRow, to_time_zone: "Not/AZone" }).success).toBe(false);
  });

  it.each<[string, Record<string, unknown>]>([
    ["a missing id", { id: undefined }],
    ["an empty id", { id: "" }],
    ["a missing trip_id", { trip_id: undefined }],
    ["an unknown source", { source: "invented" }],
    ["a lower-case from_airport_code", { from_airport_code: "krk" }],
    ["a two-letter to_airport_code", { to_airport_code: "OP" }],
    ["passengers = 0", { passengers: 0 }],
    ["passengers = 10", { passengers: 10 }],
    ["a non-integer passengers", { passengers: 2.5 }],
    ["an empty seat (the DB stores null)", { seat: "" }],
    ["a 65-character seat", { seat: "a".repeat(65) }],
    ["a 161-character ticket_number", { ticket_number: "a".repeat(161) }],
    ["a departure_at without a timezone offset", { departure_at: "2026-06-15T08:00:00" }],
  ])("fails on %s", (_label, patch) => {
    expect(parse({ ...goodRow, ...patch }).success).toBe(false);
  });
});
