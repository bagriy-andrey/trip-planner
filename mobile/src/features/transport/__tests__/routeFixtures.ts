import { buildRoute, findAirportByCode } from "@tripplanner/shared";
import type { AirportRecord, RouteView, Segment } from "@tripplanner/shared";

function airport(code: string): AirportRecord {
  const record = findAirportByCode(code);
  if (record === undefined) throw new Error(`Test fixture bug: unknown airport "${code}"`);
  return record;
}

/** A domain segment for component tests; every field can be overridden (mirrors hooks' `makeSegment`). */
export function seg(
  id: string,
  from: string,
  to: string,
  departureAt: string,
  arrivalAt: string | null = null,
  overrides: Partial<Segment> = {},
): Segment {
  return {
    id,
    tripId: "trip-1",
    from: airport(from),
    to: airport(to),
    departureAt: new Date(departureAt),
    arrivalAt: arrivalAt === null ? null : new Date(arrivalAt),
    flightNumber: "LO123",
    carrierCode: "LO",
    baggageIncluded: true,
    passengers: 2,
    seat: null,
    ticketNumber: null,
    ...overrides,
  };
}

const NO_DATES = { startDate: null, endDate: null } as const;
const NOW = new Date("2026-06-01T00:00:00.000Z");

/** A real `buildRoute` output for component tests — never hand-rolled, so it always matches the
 * shared contract the components are built against. */
export function route(segments: readonly Segment[], now: Date = NOW): RouteView {
  return buildRoute({ segments, trip: NO_DATES, now });
}

// A helper file under `__tests__/` is collected by jest, so it carries one tiny test.
describe("routeFixtures", () => {
  it("builds a real RouteView for a single one-way segment", () => {
    const view = route([seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z")]);
    expect(view.chain).toHaveLength(1);
    expect(view.closed).toBe(false);
  });
});
