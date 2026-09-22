import type { QueryClient } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react-native";
import type { ReactElement } from "react";

import { createQueryClient } from "@/lib/query";
import { renderWithProviders } from "@/test-utils/renderWithProviders";
import type { RenderWithProvidersOptions, TestSession } from "@/test-utils/renderWithProviders";

import { getSegment, listSegments, TripApiError } from "../../api";
import { segmentKeys } from "../queryKeys";
import { useSegmentQuery } from "../useSegmentQuery";
import { useSegmentsQuery } from "../useSegmentsQuery";
import type { SegmentQueryResult } from "../useSegmentQuery";
import type { SegmentsQueryResult } from "../useSegmentsQuery";
import { makeSegment } from "./testKit";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("../../api", () => ({
  ...jest.requireActual("../../api"),
  listSegments: jest.fn(),
  getSegment: jest.fn(),
}));

const listSegmentsMock = listSegments as jest.Mock;
const getSegmentMock = getSegment as jest.Mock;

const SIGNED_IN: TestSession = { status: "signedIn" };
const TRIP_ID = "trip-7";

const first = makeSegment({ id: "seg-1", departureAt: new Date("2026-06-15T08:00:00.000Z") });
const second = makeSegment({ id: "seg-2", departureAt: new Date("2026-06-16T08:00:00.000Z") });

function Segments({ sink }: { sink: { current: SegmentsQueryResult | undefined } }) {
  sink.current = useSegmentsQuery(TRIP_ID);
  return null;
}

function OneSegment({
  tripId,
  segmentId,
  sink,
}: {
  tripId: string | undefined;
  segmentId: string | undefined;
  sink: { current: SegmentQueryResult | undefined };
}) {
  sink.current = useSegmentQuery(tripId, segmentId);
  return null;
}

const clients: QueryClient[] = [];

beforeEach(() => {
  listSegmentsMock.mockReset();
  getSegmentMock.mockReset();
});

afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
});

/** Every test renders with its own client, cleared afterwards so no gc timer outlives it. */
function render(ui: ReactElement, options: RenderWithProvidersOptions) {
  const queryClient = createQueryClient({ retry: false, gcTime: Infinity });
  clients.push(queryClient);
  return renderWithProviders(ui, { ...options, queryClient });
}

describe("segmentKeys", () => {
  it("has the contract shapes", () => {
    expect(segmentKeys.all).toEqual(["segments"]);
    expect(segmentKeys.ofTrip("t1")).toEqual(["segments", "t1"]);
    expect(segmentKeys.one("t1", "s1")).toEqual(["segments", "t1", "s1"]);
  });
});

describe("useSegmentsQuery", () => {
  it("ONE request serves the whole route (Non-functional: no per-segment fan-out)", async () => {
    listSegmentsMock.mockResolvedValue({ ok: true, data: [first, second] });
    const sink: { current: SegmentsQueryResult | undefined } = { current: undefined };
    await render(<Segments sink={sink} />, { session: SIGNED_IN });

    await waitFor(() => expect(sink.current?.isPending).toBe(false));
    expect(listSegmentsMock).toHaveBeenCalledTimes(1);
    expect(listSegmentsMock).toHaveBeenCalledWith(TRIP_ID);
    expect(sink.current?.segments).toHaveLength(2);
  });

  it("a failed load throws a TripApiError that carries the kind", async () => {
    listSegmentsMock.mockResolvedValue({ ok: false, kind: "offline" });
    const sink: { current: SegmentsQueryResult | undefined } = { current: undefined };
    await render(<Segments sink={sink} />, { session: SIGNED_IN });
    await waitFor(() => expect(sink.current?.isError).toBe(true));
    expect(sink.current?.error).toBeInstanceOf(TripApiError);
    expect(sink.current?.error?.kind).toBe("offline");
    expect(sink.current?.segments).toBeUndefined();
  });

  it("refetch calls the api again (the Retry action)", async () => {
    listSegmentsMock.mockResolvedValueOnce({ ok: false, kind: "timeout" });
    listSegmentsMock.mockResolvedValueOnce({ ok: true, data: [first] });
    const sink: { current: SegmentsQueryResult | undefined } = { current: undefined };
    await render(<Segments sink={sink} />, { session: SIGNED_IN });
    await waitFor(() => expect(sink.current?.isError).toBe(true));

    await sink.current?.refetch();
    await waitFor(() => expect(sink.current?.isError).toBe(false));
    expect(listSegmentsMock).toHaveBeenCalledTimes(2);
  });

  it.each(["signedOut", "restoring"] as const)("AC-62 parity: %s sends no request", async (status) => {
    const sink: { current: SegmentsQueryResult | undefined } = { current: undefined };
    await render(<Segments sink={sink} />, { session: { status } });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(listSegmentsMock).not.toHaveBeenCalled();
  });
});

describe("useSegmentQuery", () => {
  it("loads one segment by trip id + segment id", async () => {
    getSegmentMock.mockResolvedValue({ ok: true, data: first });
    const sink: { current: SegmentQueryResult | undefined } = { current: undefined };
    await render(<OneSegment tripId={TRIP_ID} segmentId="seg-1" sink={sink} />, { session: SIGNED_IN });
    await waitFor(() => expect(sink.current?.segment?.id).toBe("seg-1"));
    expect(getSegmentMock).toHaveBeenCalledWith(TRIP_ID, "seg-1");
  });

  it("AC-81 parity: a missing segment is an error carrying kind notFound", async () => {
    getSegmentMock.mockResolvedValue({ ok: false, kind: "notFound" });
    const sink: { current: SegmentQueryResult | undefined } = { current: undefined };
    await render(<OneSegment tripId={TRIP_ID} segmentId="gone" sink={sink} />, { session: SIGNED_IN });
    await waitFor(() => expect(sink.current?.isError).toBe(true));
    expect(sink.current?.error?.kind).toBe("notFound");
    expect(sink.current?.segment).toBeUndefined();
  });

  it("no segment id, no request", async () => {
    const sink: { current: SegmentQueryResult | undefined } = { current: undefined };
    await render(<OneSegment tripId={TRIP_ID} segmentId={undefined} sink={sink} />, { session: SIGNED_IN });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(getSegmentMock).not.toHaveBeenCalled();
  });

  it.each(["signedOut", "restoring"] as const)("%s sends no request", async (status) => {
    const sink: { current: SegmentQueryResult | undefined } = { current: undefined };
    await render(<OneSegment tripId={TRIP_ID} segmentId="seg-1" sink={sink} />, { session: { status } });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(getSegmentMock).not.toHaveBeenCalled();
  });
});
