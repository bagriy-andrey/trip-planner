import { describe, expect, it } from "vitest";
import { SEGMENT_FIELD_ERROR, isSegmentFieldErrorId } from "../errorCodes";
import { parseSegmentForm, type SegmentFormInput, toSegmentWrite } from "../schemas";

// AC-77: one schema for create and edit — every test below runs against BOTH "modes". Create/edit
// never differ at the schema level (there is no `mode` argument to `parseSegmentForm`); the
// parametrisation below exists to make that guarantee explicit and to catch a future regression
// where someone adds edit-only leniency.
const MODES = ["create", "edit"] as const;

const validInput: SegmentFormInput = {
  flightNumber: "LO 1234",
  from: "krk",
  to: "opo",
  departureDate: "2026-06-15",
  departureTime: "10:00",
  arrivalDate: "2026-06-15",
  arrivalTime: "13:00",
  baggageIncluded: true,
  passengers: 2,
  seat: "12A",
  ticketNumber: "1234567890",
};

describe.each(MODES)("segmentFormSchema / parseSegmentForm (%s)", () => {
  it("accepts a fully valid submission and normalises it", () => {
    const result = parseSegmentForm(validInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      from: { iata: "KRK" },
      to: { iata: "OPO" },
      flightNumber: "LO1234",
      carrierCode: "LO",
      baggageIncluded: true,
      passengers: 2,
      seat: "12A",
      ticketNumber: "1234567890",
    });
    expect(result.value.departureAt.toISOString()).toBe("2026-06-15T08:00:00.000Z"); // Europe/Warsaw, +2h
    expect(result.value.arrivalAt?.toISOString()).toBe("2026-06-15T12:00:00.000Z"); // Europe/Lisbon, +1h
  });

  // --- AC-26: one failing case per required value -----------------------------------------------
  // The 4th column is the `fieldErrors` KEY, which doesn't always equal the input property name —
  // "from" is reported as "fromAirport" (see the note by `SegmentField` in `../schemas`).
  it.each<[string, Partial<SegmentFormInput>, string, string]>([
    ["missing from", { from: null }, "from.required", "fromAirport"],
    ["missing to", { to: null }, "to.required", "to"],
    ["missing departureDate", { departureDate: null }, "departure.dateRequired", "departureDate"],
    ["missing departureTime", { departureTime: null }, "departure.timeRequired", "departureTime"],
  ])("fails on %s (AC-26)", (_label, patch, expectedId, fieldKey) => {
    const result = parseSegmentForm({ ...validInput, ...patch });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors[fieldKey]).toBe(expectedId);
  });

  // --- AC-27/AC-28: arrival is optional, but partial is rejected ---------------------------------
  it("a segment without any arrival is valid (AC-27)", () => {
    const result = parseSegmentForm({ ...validInput, arrivalDate: null, arrivalTime: null });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.arrivalAt).toBeNull();
  });

  it.each<[string, Partial<SegmentFormInput>]>([
    ["date without time", { arrivalDate: "2026-06-15", arrivalTime: null }],
    ["time without date", { arrivalDate: null, arrivalTime: "13:00" }],
  ])("both arrival fields or neither: %s -> arrival.incomplete (AC-28)", (_label, patch) => {
    const result = parseSegmentForm({ ...validInput, ...patch });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.arrival).toBe("arrival.incomplete");
  });

  // --- AC-31: duration and ordering boundaries ----------------------------------------------------
  // Departure: 2026-06-15 10:00 Europe/Warsaw (+2h summer) = 2026-06-15T08:00:00Z.
  it("arrival exactly equal to departure -> arrival.notAfterDeparture", () => {
    // 09:00 Europe/Lisbon (+1h summer) = 08:00Z, the same instant as the departure.
    const result = parseSegmentForm({ ...validInput, arrivalDate: "2026-06-15", arrivalTime: "09:00" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.arrival).toBe("arrival.notAfterDeparture");
  });

  it("arrival before departure -> arrival.notAfterDeparture", () => {
    const result = parseSegmentForm({ ...validInput, arrivalDate: "2026-06-15", arrivalTime: "08:00" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.arrival).toBe("arrival.notAfterDeparture");
  });

  // Departure: 2026-06-15 10:00 Europe/Warsaw (+2h summer) = 2026-06-15T08:00:00Z.
  // +48h exactly = 2026-06-17T08:00:00Z, which in Europe/Lisbon (+1h summer) reads 09:00.
  it("exactly 48h is valid (AC-31)", () => {
    const result = parseSegmentForm({ ...validInput, arrivalDate: "2026-06-17", arrivalTime: "09:00" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const durationMs = result.value.arrivalAt!.getTime() - result.value.departureAt.getTime();
      expect(durationMs).toBe(48 * 60 * 60 * 1000);
    }
  });

  it("48h and 1 minute is too long -> arrival.tooLong (AC-31)", () => {
    const result = parseSegmentForm({ ...validInput, arrivalDate: "2026-06-17", arrivalTime: "09:01" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.arrival).toBe("arrival.tooLong");
  });

  // --- AC-32: same airport -------------------------------------------------------------------------
  it("from === to -> to.sameAsFrom", () => {
    const result = parseSegmentForm({ ...validInput, to: "krk" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.to).toBe("to.sameAsFrom");
  });

  // --- AC-33/AC-34: airport must be a directory pick ------------------------------------------------
  it.each<[string, string]>([
    ["free text that isn't in the directory", "Козятин"],
    ["a well-formed but unknown IATA code", "ZZZ"],
  ])("%s -> from.notInDirectory", (_label, value) => {
    const result = parseSegmentForm({ ...validInput, from: value });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.fromAirport).toBe("from.notInDirectory");
  });

  // --- AC-35: normalisation and code-point lengths --------------------------------------------------
  it("trims and uppercases the flight number, strips inner spaces/dashes", () => {
    const result = parseSegmentForm({ ...validInput, flightNumber: " lo-1234 " });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.flightNumber).toBe("LO1234");
  });

  it("collapses inner whitespace runs in seat / ticket number and trims them", () => {
    const result = parseSegmentForm({ ...validInput, seat: "  12   A  ", ticketNumber: "  AB 123  " });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.seat).toBe("12 A");
      expect(result.value.ticketNumber).toBe("AB 123");
    }
  });

  it("a whitespace-only seat / ticket number normalises to null (not an error)", () => {
    const result = parseSegmentForm({ ...validInput, seat: "   ", ticketNumber: "\t\n" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.seat).toBeNull();
      expect(result.value.ticketNumber).toBeNull();
    }
  });

  it("seat length is measured in code points, not UTF-16 units (an emoji counts once)", () => {
    const seat = "🧳".repeat(64); // 64 code points, each a surrogate pair (128 UTF-16 units)
    const result = parseSegmentForm({ ...validInput, seat });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.seat).toBe(seat);
  });

  it("seat over 64 code points -> seat.tooLong", () => {
    const result = parseSegmentForm({ ...validInput, seat: "a".repeat(65) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.seat).toBe("seat.tooLong");
  });

  it("seat at exactly 64 code points is valid", () => {
    const result = parseSegmentForm({ ...validInput, seat: "a".repeat(64) });
    expect(result.ok).toBe(true);
  });

  it("ticket number over 160 code points -> ticketNumber.tooLong", () => {
    const result = parseSegmentForm({ ...validInput, ticketNumber: "a".repeat(161) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.ticketNumber).toBe("ticketNumber.tooLong");
  });

  it("ticket number at exactly 160 code points is valid", () => {
    const result = parseSegmentForm({ ...validInput, ticketNumber: "a".repeat(160) });
    expect(result.ok).toBe(true);
  });

  it("nine comma-separated tickets and seats (one per passenger) fit", () => {
    const tickets = Array.from({ length: 9 }, (_, i) => `1234567890${100 + i}`).join(", ");
    const seats = Array.from({ length: 9 }, (_, i) => `${10 + i}A`).join(", ");
    const result = parseSegmentForm({ ...validInput, passengers: 9, seat: seats, ticketNumber: tickets });
    expect(result.ok).toBe(true);
  });

  // --- flightNumber format (Q5: empty is valid; ICAO form rejected) ---------------------------------
  it("an empty flight number is valid (optional field)", () => {
    const result = parseSegmentForm({ ...validInput, flightNumber: "" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.flightNumber).toBeNull();
      expect(result.value.carrierCode).toBeNull();
    }
  });

  it("a malformed flight number -> flightNumber.format", () => {
    const result = parseSegmentForm({ ...validInput, flightNumber: "LOT1234" }); // ICAO form, rejected
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.flightNumber).toBe("flightNumber.format");
  });

  it("an unrecognised (but well-formed) designator saves the number with a null carrierCode (AC-23)", () => {
    const result = parseSegmentForm({ ...validInput, flightNumber: "ZZ999" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.flightNumber).toBe("ZZ999");
      expect(result.value.carrierCode).toBeNull();
    }
  });

  // --- AC-36: passenger count boundaries -------------------------------------------------------------
  it.each([0, 10, -1, 1.5])("passengers=%s -> passengers.range", (value) => {
    const result = parseSegmentForm({ ...validInput, passengers: value });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.passengers).toBe("passengers.range");
  });

  it.each([1, 9])("passengers=%s is valid (the counter's own boundaries)", (value) => {
    const result = parseSegmentForm({ ...validInput, passengers: value });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.passengers).toBe(value);
  });

  it("passengers defaults to 1 when absent (not one of the four required values)", () => {
    const result = parseSegmentForm({ ...validInput, passengers: null });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.passengers).toBe(1);
  });
});

describe("departure rules (past / before the trip starts)", () => {
  // validInput departs 2026-06-15 10:00 Europe/Warsaw = 08:00Z.
  const before = new Date("2026-06-14T12:00:00Z");
  const after = new Date("2026-06-15T09:00:00Z");

  it("passes when no rules are given (shape-only validation)", () => {
    expect(parseSegmentForm(validInput).ok).toBe(true);
  });

  it("passes when the departure is in the future and inside the trip", () => {
    const result = parseSegmentForm(validInput, { now: before, tripStartDate: "2026-06-10" });
    expect(result.ok).toBe(true);
  });

  it("rejects a departure earlier than `now` as departure.inPast", () => {
    const result = parseSegmentForm(validInput, { now: after, tripStartDate: null });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.departureDate).toBe("departure.inPast");
  });

  it("a departure exactly at `now` is not in the past", () => {
    const at = new Date("2026-06-15T08:00:00Z");
    expect(parseSegmentForm(validInput, { now: at, tripStartDate: null }).ok).toBe(true);
  });

  it("rejects a departure on a day before the trip starts as departure.beforeTripStart", () => {
    const result = parseSegmentForm(validInput, { now: before, tripStartDate: "2026-06-16" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.departureDate).toBe("departure.beforeTripStart");
  });

  it("a departure on the trip's first day is fine (compared by the departure airport's local date)", () => {
    expect(parseSegmentForm(validInput, { now: before, tripStartDate: "2026-06-15" }).ok).toBe(true);
  });

  it("a trip without dates only enforces the past rule", () => {
    expect(parseSegmentForm(validInput, { now: before, tripStartDate: null }).ok).toBe(true);
  });

  it("reports the past error first when both apply", () => {
    const result = parseSegmentForm(validInput, { now: after, tripStartDate: "2026-06-20" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.departureDate).toBe("departure.inPast");
  });
});

describe("SEGMENT_FIELD_ERROR (AC-37)", () => {
  it("is pinned to exactly this literal list of ids", () => {
    expect(Object.values(SEGMENT_FIELD_ERROR).sort()).toEqual(
      [
        "arrival.incomplete",
        "arrival.notAfterDeparture",
        "arrival.tooLong",
        "departure.beforeTripStart",
        "departure.dateRequired",
        "departure.inPast",
        "departure.timeRequired",
        "flightNumber.format",
        "from.notInDirectory",
        "from.required",
        "passengers.range",
        "seat.tooLong",
        "ticketNumber.tooLong",
        "to.notInDirectory",
        "to.required",
        "to.sameAsFrom",
      ].sort(),
    );
  });

  it("isSegmentFieldErrorId rejects anything not in the list", () => {
    expect(isSegmentFieldErrorId("from.required")).toBe(true);
    expect(isSegmentFieldErrorId("from.bogus")).toBe(false);
    expect(isSegmentFieldErrorId(42)).toBe(false);
    expect(isSegmentFieldErrorId(undefined)).toBe(false);
  });
});

describe("toSegmentWrite (AC-39)", () => {
  it("always writes mode:'flight' and source:'manual'", () => {
    const result = parseSegmentForm(validInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const write = toSegmentWrite(result.value, "trip-1");
    expect(write.mode).toBe("flight");
    expect(write.source).toBe("manual");
    expect(write.trip_id).toBe("trip-1");
    expect(write.from_airport_code).toBe("KRK");
    expect(write.to_airport_code).toBe("OPO");
    expect(write.departure_at).toBe("2026-06-15T08:00:00.000Z");
    expect(write.arrival_at).toBe("2026-06-15T12:00:00.000Z");
  });

  it("writes a null arrival_at when the form has no arrival", () => {
    const result = parseSegmentForm({ ...validInput, arrivalDate: null, arrivalTime: null });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(toSegmentWrite(result.value, "trip-1").arrival_at).toBeNull();
  });
});
