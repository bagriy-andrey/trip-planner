import type { Trip } from "@tripplanner/shared";

/** A domain trip for hook tests; every field can be overridden. */
export function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-1",
    destination: "Porto",
    place: { kind: "custom" },
    title: null,
    startDate: null,
    endDate: null,
    archivedAt: null,
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

// A helper file under `__tests__/` is collected by jest, so it carries one tiny test.
describe("makeTrip", () => {
  it("builds a draft trip by default", () => {
    expect(makeTrip()).toMatchObject({ id: "trip-1", startDate: null, archivedAt: null });
  });
});
