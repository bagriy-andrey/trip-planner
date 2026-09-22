import { renderHook } from "@testing-library/react-native";
import { buildRoute } from "@tripplanner/shared";

import { useRouteView } from "../hooks/useRouteView";
import { makeSegment } from "../hooks/__tests__/testKit";

const TRIP = { startDate: null, endDate: null };

describe("useRouteView", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-15T00:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("is undefined until both the trip and the segments have loaded", () => {
    const { result: noTrip } = renderHook(() => useRouteView([makeSegment()], undefined));
    expect(noTrip.current).toBeUndefined();

    const { result: noSegments } = renderHook(() => useRouteView(undefined, TRIP));
    expect(noSegments.current).toBeUndefined();
  });

  it("matches buildRoute's own output for the same input", () => {
    const segments = [makeSegment()];
    const { result } = renderHook(() => useRouteView(segments, TRIP));
    const now = new Date();
    expect(result.current).toEqual(buildRoute({ segments, trip: TRIP, now }));
  });

  it("is memoized: the same reference across a re-render with unchanged inputs", () => {
    const segments = [makeSegment()];
    const { result, rerender } = renderHook(() => useRouteView(segments, TRIP));
    const first = result.current;
    rerender(undefined);
    expect(result.current).toBe(first);
  });

  it("recomputes when the segments change", () => {
    const segmentsA = [makeSegment({ id: "a" })];
    const segmentsB = [makeSegment({ id: "b" })];
    const { result, rerender } = renderHook(
      ({ segments }: { segments: typeof segmentsA }) => useRouteView(segments, TRIP),
      { initialProps: { segments: segmentsA } },
    );
    const first = result.current;
    rerender({ segments: segmentsB });
    expect(result.current).not.toBe(first);
    expect(result.current?.chain.map((node) => node.segment.id)).toEqual(["b"]);
  });
});
