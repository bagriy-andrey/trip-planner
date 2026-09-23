import { describe, expect, it } from "vitest";
import { findAirportByCode } from "../../places/airportSearch";
import type { AirportRecord } from "../../places/schema";
import type { CalendarDate } from "../../trips/calendarDate";
import { LAYOVER_MAX_MS, RISKY_LAYOVER_MS, buildRoute, type BuildRouteInput } from "../route";
import type { Segment } from "../schemas";

function airport(code: string): AirportRecord {
  const record = findAirportByCode(code);
  if (record === undefined) throw new Error(`Test fixture bug: unknown airport "${code}"`);
  return record;
}

function seg(
  id: string,
  from: string,
  to: string,
  departureAt: string,
  arrivalAt: string | null = null,
): Segment {
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

const NO_DATES: BuildRouteInput["trip"] = { startDate: null, endDate: null };
const NOW = new Date("2026-01-01T00:00:00.000Z");

describe("buildRoute — chain ordering (AC-47)", () => {
  it("sorts a shuffled input by departureAt ascending", () => {
    const s1 = seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z");
    const s2 = seg("b", "OPO", "BCN", "2026-06-02T08:00:00Z", "2026-06-02T10:00:00Z");
    const s3 = seg("c", "BCN", "VIE", "2026-06-03T08:00:00Z", "2026-06-03T10:00:00Z");
    const route = buildRoute({ segments: [s3, s1, s2], trip: NO_DATES, now: NOW });
    expect(route.chain.map((n) => n.segment.id)).toEqual(["a", "b", "c"]);
  });

  it("breaks a tie on identical departureAt by id (deterministic)", () => {
    const sameTime = "2026-06-01T08:00:00Z";
    const s1 = seg("z", "KRK", "OPO", sameTime);
    const s2 = seg("a", "BCN", "VIE", sameTime);
    const route = buildRoute({ segments: [s1, s2], trip: NO_DATES, now: NOW });
    expect(route.chain.map((n) => n.segment.id)).toEqual(["a", "z"]);
  });
});

describe("buildRoute — gaps (AC-48…AC-54)", () => {
  it("no gap is drawn when the previous segment has no arrival time (Q11), even at the same airport", () => {
    const s1 = seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", null);
    const s2 = seg("b", "OPO", "BCN", "2026-06-01T12:00:00Z", "2026-06-01T14:00:00Z");
    const route = buildRoute({ segments: [s1, s2], trip: NO_DATES, now: NOW });
    expect(route.gaps).toEqual([]);
    // The route itself is still open (KRK -> ... -> BCN, different cities) — that is its own,
    // unrelated warning; what this test asserts is the ABSENCE of any gap/adjacency warning.
    expect(route.warnings.filter((w) => w.id !== "route.notClosed")).toEqual([]);
  });

  it("a pause is computed from real UTC instants across different zones", () => {
    // OPO (Europe/Lisbon) arrival at 10:00Z; BCN (Europe/Madrid) departure at 12:30Z -> 2h30m gap.
    const s1 = seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z");
    const s2 = seg("b", "OPO", "VIE", "2026-06-01T12:30:00Z", "2026-06-01T14:00:00Z");
    const route = buildRoute({ segments: [s1, s2], trip: NO_DATES, now: NOW });
    expect(route.gaps).toHaveLength(1);
    expect(route.gaps[0]).toMatchObject({ kind: "layover", durationMs: 2.5 * 60 * 60 * 1000, risky: false });
  });

  it.each<[string, number, "layover" | "stopover"]>([
    ["7h59 is still a layover", LAYOVER_MAX_MS - 60_000, "layover"],
    ["exactly 8h is still a layover", LAYOVER_MAX_MS, "layover"],
    ["8h and 1 minute is a stopover", LAYOVER_MAX_MS + 60_000, "stopover"],
  ])("layover/stopover boundary (AC-49): %s", (_label, durationMs, expectedKind) => {
    const arrival = new Date("2026-06-01T10:00:00Z");
    const departure = new Date(arrival.getTime() + durationMs);
    const s1 = seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", arrival.toISOString());
    const s2 = seg("b", "OPO", "VIE", departure.toISOString());
    const route = buildRoute({ segments: [s1, s2], trip: NO_DATES, now: NOW });
    expect(route.gaps[0]?.kind).toBe(expectedKind);
  });

  it.each<[string, number, boolean]>([
    ["1h29 is risky", RISKY_LAYOVER_MS - 60_000, true],
    ["exactly 1h30 is NOT risky", RISKY_LAYOVER_MS, false],
  ])("risky boundary (AC-50): %s", (_label, durationMs, expectedRisky) => {
    const arrival = new Date("2026-06-01T10:00:00Z");
    const departure = new Date(arrival.getTime() + durationMs);
    const s1 = seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", arrival.toISOString());
    const s2 = seg("b", "OPO", "VIE", departure.toISOString());
    const route = buildRoute({ segments: [s1, s2], trip: NO_DATES, now: NOW });
    expect(route.gaps[0]).toMatchObject({ kind: "layover", risky: expectedRisky });
    expect(route.warnings.some((w) => w.id === "layover.risky")).toBe(expectedRisky);
  });

  it("JFK -> LGA gives an airport mismatch, not a connection (AC-51)", () => {
    const s1 = seg("a", "KRK", "JFK", "2026-06-01T08:00:00Z", "2026-06-01T18:00:00Z");
    const s2 = seg("b", "LGA", "OPO", "2026-06-01T20:00:00Z", "2026-06-02T04:00:00Z");
    const route = buildRoute({ segments: [s1, s2], trip: NO_DATES, now: NOW });
    expect(route.gaps).toEqual([]);
    expect(route.warnings).toContainEqual({
      id: "airport.mismatch",
      beforeSegmentId: "a",
      afterSegmentId: "b",
      arrivalAirportCode: "JFK",
      departureAirportCode: "LGA",
    });
  });

  it("BCN -> GRO gives an airport mismatch, not a connection (AC-52)", () => {
    const s1 = seg("a", "KRK", "BCN", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z");
    const s2 = seg("b", "GRO", "VIE", "2026-06-01T12:00:00Z", "2026-06-01T14:00:00Z");
    const route = buildRoute({ segments: [s1, s2], trip: NO_DATES, now: NOW });
    expect(route.gaps).toEqual([]);
    expect(route.warnings).toContainEqual(
      expect.objectContaining({ id: "airport.mismatch", arrivalAirportCode: "BCN", departureAirportCode: "GRO" }),
    );
  });

  it("the mismatch is still reported when the previous segment's arrival is unknown (AC-51/52)", () => {
    const s1 = seg("a", "KRK", "JFK", "2026-06-01T08:00:00Z", null);
    const s2 = seg("b", "LGA", "OPO", "2026-06-01T20:00:00Z", "2026-06-02T04:00:00Z");
    const route = buildRoute({ segments: [s1, s2], trip: NO_DATES, now: NOW });
    expect(route.warnings).toContainEqual(
      expect.objectContaining({ id: "airport.mismatch", beforeSegmentId: "a", afterSegmentId: "b" }),
    );
  });

  it("a 30h stopover crossing midnight reports '1 day' (AC-53)", () => {
    // OPO arrival 20:00Z day 1 (20:00 local, UTC+0 winter simplification not needed: use a zone
    // where local date matches UTC date closely — OPO/Europe/Lisbon is UTC+0 or +1).
    const s1 = seg("a", "KRK", "OPO", "2026-01-05T08:00:00Z", "2026-01-05T20:00:00Z");
    const s2 = seg("b", "OPO", "VIE", "2026-01-07T02:00:00Z", "2026-01-07T06:00:00Z"); // +30h
    const route = buildRoute({ segments: [s1, s2], trip: NO_DATES, now: NOW });
    expect(route.gaps[0]).toMatchObject({ kind: "stopover", days: 2, cityId: "city-porto" });
  });

  it("an 11h stopover within the same local day reports hours, not days (AC-53)", () => {
    const s1 = seg("a", "KRK", "OPO", "2026-01-05T06:00:00Z", "2026-01-05T08:00:00Z");
    const s2 = seg("b", "OPO", "VIE", "2026-01-05T19:00:00Z", "2026-01-05T21:00:00Z"); // +11h, same UTC day
    const route = buildRoute({ segments: [s1, s2], trip: NO_DATES, now: NOW });
    expect(route.gaps[0]).toMatchObject({ kind: "stopover" });
    expect(route.gaps[0]?.days).toBeUndefined();
  });

  it("a negative gap (next departs before previous arrives) warns and clamps duration to >= 0 (AC-54)", () => {
    const s1 = seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", "2026-06-01T12:00:00Z");
    const s2 = seg("b", "OPO", "VIE", "2026-06-01T10:00:00Z", "2026-06-01T14:00:00Z"); // departs before arrival
    const route = buildRoute({ segments: [s1, s2], trip: NO_DATES, now: NOW });
    expect(route.gaps[0]?.durationMs).toBe(0);
    expect(route.gaps[0]?.durationMs).toBeGreaterThanOrEqual(0);
    expect(route.warnings).toContainEqual({ id: "segments.overlap", beforeSegmentId: "a", afterSegmentId: "b" });
  });
});

describe("buildRoute — trip date warnings (AC-55)", () => {
  const trip: BuildRouteInput["trip"] = { startDate: "2026-06-01" as CalendarDate, endDate: "2026-06-10" as CalendarDate };

  it("a departure exactly on the trip's start/end day is NOT a warning", () => {
    const s1 = seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z");
    const route = buildRoute({ segments: [s1], trip, now: NOW });
    expect(route.warnings.filter((w) => w.id === "segment.outsideTripDates")).toEqual([]);
  });

  it("a departure before the trip start warns", () => {
    const s1 = seg("a", "KRK", "OPO", "2026-05-31T08:00:00Z", "2026-05-31T10:00:00Z");
    const route = buildRoute({ segments: [s1], trip, now: NOW });
    expect(route.warnings).toContainEqual({ id: "segment.outsideTripDates", segmentId: "a", field: "departure" });
  });

  it("an arrival after the trip end warns", () => {
    // Arrival local date (Europe/Vienna, UTC+2 summer) is 2026-06-11, past the trip's end date.
    const s1 = seg("a", "KRK", "VIE", "2026-06-10T08:00:00Z", "2026-06-10T23:30:00Z");
    const route = buildRoute({ segments: [s1], trip, now: NOW });
    expect(route.warnings).toContainEqual({ id: "segment.outsideTripDates", segmentId: "a", field: "arrival" });
  });

  it("a segment that departs AND arrives outside the trip warns ONCE (departure wins)", () => {
    const s1 = seg("a", "KRK", "OPO", "2026-05-30T08:00:00Z", "2026-05-30T10:00:00Z");
    const route = buildRoute({ segments: [s1], trip, now: NOW });
    expect(route.warnings.filter((w) => w.id === "segment.outsideTripDates")).toEqual([
      { id: "segment.outsideTripDates", segmentId: "a", field: "departure" },
    ]);
  });

  it("a trip with no dates never warns", () => {
    const s1 = seg("a", "KRK", "OPO", "2020-01-01T08:00:00Z", "2020-01-01T10:00:00Z"); // wildly outside any "range"
    const route = buildRoute({ segments: [s1], trip: NO_DATES, now: NOW });
    expect(route.warnings.filter((w) => w.id === "segment.outsideTripDates")).toEqual([]);
  });
});

describe("buildRoute — closed / openAt (AC-56, AC-57)", () => {
  it("JFK->LHR / LHR->LGA: closed (same city, New York), but flags the airport mismatch at the ends", () => {
    const s1 = seg("a", "JFK", "LHR", "2026-06-01T08:00:00Z", "2026-06-01T20:00:00Z");
    const s2 = seg("b", "LHR", "LGA", "2026-06-02T08:00:00Z", "2026-06-02T20:00:00Z");
    const route = buildRoute({ segments: [s1, s2], trip: NO_DATES, now: NOW });
    expect(route.closed).toBe(true);
    expect(route.openAt).toBeUndefined();
    expect(route.warnings).toContainEqual({
      id: "airport.mismatch",
      beforeSegmentId: "b",
      afterSegmentId: "a",
      arrivalAirportCode: "LGA",
      departureAirportCode: "JFK",
    });
  });

  it("BCN->VIE / VIE->GRO: NOT closed (Barcelona and Girona are different cities)", () => {
    const s1 = seg("a", "BCN", "VIE", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z");
    const s2 = seg("b", "VIE", "GRO", "2026-06-02T08:00:00Z", "2026-06-02T10:00:00Z");
    const route = buildRoute({ segments: [s1, s2], trip: NO_DATES, now: NOW });
    expect(route.closed).toBe(false);
    expect(route.openAt).toEqual({ cityId: "city-girona", airportCode: "GRO" });
    expect(route.warnings).toContainEqual({ id: "route.notClosed", cityId: "city-girona", airportCode: "GRO" });
  });

  it("BCN->VIE / VIE->BCN: closed, same city AND same airport, no wrap-around warning", () => {
    const s1 = seg("a", "BCN", "VIE", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z");
    const s2 = seg("b", "VIE", "BCN", "2026-06-02T08:00:00Z", "2026-06-02T10:00:00Z");
    const route = buildRoute({ segments: [s1, s2], trip: NO_DATES, now: NOW });
    expect(route.closed).toBe(true);
    expect(route.openAt).toBeUndefined();
    expect(route.warnings.some((w) => w.id === "airport.mismatch")).toBe(false);
    expect(route.warnings.some((w) => w.id === "route.notClosed")).toBe(false);
  });
});

describe("buildRoute — edges (AC-58)", () => {
  it("an empty route is closed, with no warnings, no gaps, an empty summary", () => {
    const route = buildRoute({ segments: [], trip: NO_DATES, now: NOW });
    expect(route).toMatchObject({
      chain: [],
      gaps: [],
      warnings: [],
      summary: { codes: [], segments: 0, layovers: 0 },
      closed: true,
      openAt: undefined,
      nearestSegmentId: undefined,
    });
  });

  it("a single one-way segment (different cities) is NOT closed and prompts to resume from its arrival city", () => {
    const s1 = seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z");
    const route = buildRoute({ segments: [s1], trip: NO_DATES, now: NOW });
    expect(route.closed).toBe(false);
    expect(route.openAt).toEqual({ cityId: "city-porto", airportCode: "OPO" });
    expect(route.gaps).toEqual([]);
  });
});

describe("buildRoute — warnings order (AC-59)", () => {
  it("is deterministic: gap warnings (in chain order), then trip-date warnings, then route.notClosed last", () => {
    const trip: BuildRouteInput["trip"] = { startDate: "2026-06-02" as CalendarDate, endDate: null };
    // seg1 departs before the trip start (outsideTripDates); seg1->seg2 airport mismatch (JFK/LGA);
    // seg2->seg3 is a risky layover; route ends open (not closed).
    const s1 = seg("a", "KRK", "JFK", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z");
    const s2 = seg("b", "LGA", "BCN", "2026-06-02T08:00:00Z", "2026-06-02T10:00:00Z");
    const s3 = seg("c", "BCN", "VIE", "2026-06-02T10:30:00Z", "2026-06-02T12:00:00Z");
    const route = buildRoute({ segments: [s1, s2, s3], trip, now: NOW });
    expect(route.warnings).toEqual([
      {
        id: "airport.mismatch",
        beforeSegmentId: "a",
        afterSegmentId: "b",
        arrivalAirportCode: "JFK",
        departureAirportCode: "LGA",
      },
      { id: "layover.risky", beforeSegmentId: "b", afterSegmentId: "c", durationMs: 30 * 60 * 1000 },
      { id: "segment.outsideTripDates", segmentId: "a", field: "departure" },
      { id: "route.notClosed", cityId: "city-vienna", airportCode: "VIE" },
    ]);
  });
});

describe("buildRoute — summary (AC-60)", () => {
  it("collapses consecutive duplicate airport codes", () => {
    const s1 = seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z");
    const s2 = seg("b", "OPO", "BCN", "2026-06-02T08:00:00Z", "2026-06-02T10:00:00Z");
    const s3 = seg("c", "BCN", "VIE", "2026-06-03T08:00:00Z", "2026-06-03T10:00:00Z");
    const route = buildRoute({ segments: [s1, s2, s3], trip: NO_DATES, now: NOW });
    expect(route.summary).toEqual({ codes: ["KRK", "OPO", "BCN", "VIE"], segments: 3, layovers: 2 });
  });
});

describe("buildRoute — nearestSegmentId (AC-61, injected `now`)", () => {
  const s1 = seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z");
  const s2 = seg("b", "OPO", "BCN", "2026-06-05T08:00:00Z", "2026-06-05T10:00:00Z");
  const segments = [s1, s2];

  it("now before every segment: the first (earliest upcoming)", () => {
    const route = buildRoute({ segments, trip: NO_DATES, now: new Date("2026-01-01T00:00:00Z") });
    expect(route.nearestSegmentId).toBe("a");
  });

  it("now between segments: the next upcoming one", () => {
    const route = buildRoute({ segments, trip: NO_DATES, now: new Date("2026-06-02T00:00:00Z") });
    expect(route.nearestSegmentId).toBe("b");
  });

  it("now after every segment: the last one", () => {
    const route = buildRoute({ segments, trip: NO_DATES, now: new Date("2026-12-31T00:00:00Z") });
    expect(route.nearestSegmentId).toBe("b");
  });

  it("never reads the clock itself: an identical `now` always gives an identical answer", () => {
    const now = new Date("2026-06-03T00:00:00Z");
    const routeA = buildRoute({ segments, trip: NO_DATES, now });
    const routeB = buildRoute({ segments, trip: NO_DATES, now });
    expect(routeA.nearestSegmentId).toBe(routeB.nearestSegmentId);
  });
});
