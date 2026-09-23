import { findAirportByCode } from "@tripplanner/shared";
import type { Segment } from "@tripplanner/shared";

function knownAirport(code: string) {
  const airport = findAirportByCode(code);
  if (airport === undefined) throw new Error(`fixture airport "${code}" missing from directory`);
  return airport;
}

const KRK = knownAirport("KRK");
const OPO = knownAirport("OPO");

/** A domain segment for hook tests; every field can be overridden. */
export function makeSegment(overrides: Partial<Segment> = {}): Segment {
  return {
    id: "segment-1",
    tripId: "trip-7",
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

// A helper file under `__tests__/` is collected by jest, so it carries one tiny test.
describe("makeSegment", () => {
  it("builds a segment with known airports by default", () => {
    expect(makeSegment()).toMatchObject({ id: "segment-1", from: { iata: "KRK" }, to: { iata: "OPO" } });
  });
});
