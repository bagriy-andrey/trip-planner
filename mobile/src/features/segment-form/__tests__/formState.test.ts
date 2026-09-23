import { findAirportByCode } from "@tripplanner/shared";
import type { Segment } from "@tripplanner/shared";

import {
  EMPTY_SEGMENT_FORM,
  airportDisplayText,
  segmentFormEquals,
  segmentFormFromFirstPrefill,
  segmentFormFromNextPrefill,
  segmentFormFromSegment,
} from "../hooks/formState";

function knownAirport(code: string) {
  const airport = findAirportByCode(code);
  if (airport === undefined) throw new Error(`fixture airport "${code}" missing`);
  return airport;
}

const KRK = knownAirport("KRK");
const OPO = knownAirport("OPO");

function makeSegment(overrides: Partial<Segment> = {}): Segment {
  return {
    id: "segment-1",
    tripId: "trip-1",
    from: KRK,
    to: OPO,
    departureAt: new Date("2026-06-15T08:00:00.000Z"),
    arrivalAt: new Date("2026-06-15T12:00:00.000Z"),
    flightNumber: "LO1234",
    carrierCode: "LO",
    baggageIncluded: true,
    passengers: 2,
    seat: "12A",
    ticketNumber: "1234567890",
    ...overrides,
  };
}

describe("EMPTY_SEGMENT_FORM", () => {
  it("starts with SEGMENT_PASSENGERS_MIN passengers and no invented constant", () => {
    expect(EMPTY_SEGMENT_FORM.passengers).toBe(1);
    expect(EMPTY_SEGMENT_FORM.fromAirport).toBeNull();
    expect(EMPTY_SEGMENT_FORM.arrivalDate).toBeNull();
  });
});

describe("airportDisplayText", () => {
  it("joins the localized name and the IATA code", () => {
    expect(airportDisplayText(KRK, "en")).toBe("Krakow Airport · KRK");
  });
});

describe("segmentFormFromFirstPrefill (AC-38)", () => {
  it("fills the departure airport and date for a city trip", () => {
    const state = segmentFormFromFirstPrefill({ fromAirport: KRK, departureDate: "2026-06-10" }, "en");
    expect(state.fromAirport).toBe(KRK);
    expect(state.fromText).toBe(airportDisplayText(KRK, "en"));
    expect(state.departureDate).toBe("2026-06-10");
    expect(state.toAirport).toBeNull();
  });

  it("prefills nothing for a country/free-text trip with no dates", () => {
    const state = segmentFormFromFirstPrefill({ fromAirport: null, departureDate: null }, "en");
    expect(state).toEqual(EMPTY_SEGMENT_FORM);
  });
});

describe("segmentFormFromNextPrefill (AC-41..AC-43)", () => {
  it("carries the arrival airport forward as 'from', with the suggested 'to' and date", () => {
    const state = segmentFormFromNextPrefill(
      { fromAirport: OPO, toAirport: KRK, departureDate: "2026-06-16" },
      "en",
    );
    expect(state.fromAirport).toBe(OPO);
    expect(state.toAirport).toBe(KRK);
    expect(state.departureDate).toBe("2026-06-16");
    // Nothing else carries over from the previous segment.
    expect(state.flightNumber).toBe("");
    expect(state.passengers).toBe(1);
  });

  it("leaves 'to' empty once the route is already closed", () => {
    const state = segmentFormFromNextPrefill({ fromAirport: OPO, toAirport: null, departureDate: null }, "en");
    expect(state.toAirport).toBeNull();
    expect(state.toText).toBe("");
  });
});

describe("segmentFormFromSegment (AC-76)", () => {
  it("prefills every field of an existing segment", () => {
    const state = segmentFormFromSegment(makeSegment(), "en");
    expect(state).toMatchObject({
      flightNumber: "LO1234",
      fromAirport: KRK,
      toAirport: OPO,
      departureDate: "2026-06-15",
      departureTime: "10:00",
      arrivalDate: "2026-06-15",
      arrivalTime: "13:00",
      baggageIncluded: true,
      passengers: 2,
      seat: "12A",
      ticketNumber: "1234567890",
    });
  });

  it("prefills a deliberately empty arrival as null, not a guessed value", () => {
    const state = segmentFormFromSegment(makeSegment({ arrivalAt: null }), "en");
    expect(state.arrivalDate).toBeNull();
    expect(state.arrivalTime).toBeNull();
  });

  it("prefills null flight number / seat / ticket as empty strings", () => {
    const state = segmentFormFromSegment(
      makeSegment({ flightNumber: null, carrierCode: null, seat: null, ticketNumber: null }),
      "en",
    );
    expect(state.flightNumber).toBe("");
    expect(state.seat).toBe("");
    expect(state.ticketNumber).toBe("");
  });
});

describe("segmentFormEquals (AC-40)", () => {
  it("is true for two states with the same values even with different AirportRecord identities", () => {
    const a = segmentFormFromFirstPrefill({ fromAirport: KRK, departureDate: "2026-06-10" }, "en");
    const b = { ...a, fromAirport: { ...KRK } };
    expect(segmentFormEquals(a, b)).toBe(true);
  });

  it("is false once any field differs", () => {
    const a = EMPTY_SEGMENT_FORM;
    expect(segmentFormEquals(a, { ...a, seat: "12A" })).toBe(false);
    expect(segmentFormEquals(a, { ...a, passengers: 2 })).toBe(false);
    expect(segmentFormEquals(a, { ...a, baggageIncluded: true })).toBe(false);
  });
});
