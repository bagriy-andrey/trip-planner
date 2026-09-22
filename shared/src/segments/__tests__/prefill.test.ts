import { describe, expect, it } from "vitest";
import { findAirportByCode } from "../../places/airportSearch";
import type { AirportRecord } from "../../places/schema";
import type { CalendarDate } from "../../trips/calendarDate";
import type { Trip } from "../../trips/schemas";
import { buildRoute, type BuildRouteInput } from "../route";
import { firstSegmentPrefill, nextSegmentPrefill } from "../prefill";
import type { Segment } from "../schemas";

function airport(code: string): AirportRecord {
  const record = findAirportByCode(code);
  if (record === undefined) throw new Error(`Test fixture bug: unknown airport "${code}"`);
  return record;
}

function seg(id: string, from: string, to: string, departureAt: string, arrivalAt: string | null = null): Segment {
  return {
    id,
    tripId: "trip-1",
    from: airport(from),
    to: airport(to),
    departureAt: new Date(departureAt),
    arrivalAt: arrivalAt === null ? null : new Date(arrivalAt),
    flightNumber: null,
    carrierCode: null,
    baggageIncluded: false,
    passengers: 1,
    seat: null,
    ticketNumber: null,
  };
}

const NOW = new Date("2026-01-01T00:00:00Z");

describe("firstSegmentPrefill (AC-38)", () => {
  it("a city trip with its own airport pre-fills 'from' with the city's main airport", () => {
    const trip: Pick<Trip, "place" | "startDate"> = {
      place: { kind: "city", placeId: "city-porto", countryCode: "PT", timeZone: "Europe/Lisbon", airportCode: "OPO" },
      startDate: "2026-06-01" as CalendarDate,
    };
    const result = firstSegmentPrefill(trip);
    expect(result.fromAirport?.iata).toBe("OPO");
    expect(result.departureDate).toBe("2026-06-01");
  });

  it("a country trip pre-fills nothing for 'from' (no single airport)", () => {
    const trip: Pick<Trip, "place" | "startDate"> = {
      place: { kind: "country", placeId: "country-pt", countryCode: "PT" },
      startDate: "2026-06-01" as CalendarDate,
    };
    const result = firstSegmentPrefill(trip);
    expect(result.fromAirport).toBeNull();
    expect(result.departureDate).toBe("2026-06-01");
  });

  it("a free-text (custom) trip pre-fills nothing for 'from'", () => {
    const trip: Pick<Trip, "place" | "startDate"> = { place: { kind: "custom" }, startDate: null };
    const result = firstSegmentPrefill(trip);
    expect(result.fromAirport).toBeNull();
    expect(result.departureDate).toBeNull();
  });

  it("a trip without dates never guesses a departure date", () => {
    const trip: Pick<Trip, "place" | "startDate"> = {
      place: { kind: "city", placeId: "city-porto", countryCode: "PT", timeZone: "Europe/Lisbon", airportCode: "OPO" },
      startDate: null,
    };
    const result = firstSegmentPrefill(trip);
    expect(result.departureDate).toBeNull();
    expect(result.fromAirport?.iata).toBe("OPO"); // the airport guess is independent of dates
  });
});

describe("nextSegmentPrefill (AC-41…AC-43)", () => {
  const noDates: BuildRouteInput["trip"] = { startDate: null, endDate: null };

  it("'from' continues from where the just-saved segment landed (AC-41)", () => {
    const justSaved = seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z");
    const route = buildRoute({ segments: [justSaved], trip: noDates, now: NOW });
    const result = nextSegmentPrefill(route, justSaved);
    expect(result.fromAirport.iata).toBe("OPO");
  });

  it("the date comes from the arrival (in the arrival airport's own zone), not the departure", () => {
    // Departs KRK 23:30 UTC 06-01; arrives OPO 01:30 UTC 06-02, which in Europe/Lisbon (+1h summer)
    // reads 02:30 on 06-02 — the day AFTER the departure's own local day (AC-42).
    const justSaved = seg("a", "KRK", "OPO", "2026-06-01T23:30:00Z", "2026-06-02T01:30:00Z");
    const route = buildRoute({ segments: [justSaved], trip: noDates, now: NOW });
    const result = nextSegmentPrefill(route, justSaved);
    expect(result.departureDate).toBe("2026-06-02");
  });

  it("falls back to the departure's own local date when there is no arrival", () => {
    const justSaved = seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", null);
    const route = buildRoute({ segments: [justSaved], trip: noDates, now: NOW });
    const result = nextSegmentPrefill(route, justSaved);
    // KRK is Europe/Warsaw (+2h summer): 08:00Z departure reads 10:00 local, same calendar day.
    expect(result.departureDate).toBe("2026-06-01");
  });

  it("'to' pre-fills the route's start airport when the route is NOT yet closed (AC-43)", () => {
    const first = seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z");
    const route = buildRoute({ segments: [first], trip: noDates, now: NOW });
    const result = nextSegmentPrefill(route, first);
    expect(result.toAirport?.iata).toBe("KRK");
  });

  it("'to' is empty once the route is already closed (AC-43)", () => {
    const s1 = seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z");
    const s2 = seg("b", "OPO", "KRK", "2026-06-02T08:00:00Z", "2026-06-02T10:00:00Z");
    const route = buildRoute({ segments: [s1, s2], trip: noDates, now: NOW });
    const result = nextSegmentPrefill(route, s2);
    expect(result.toAirport).toBeNull();
  });
});
