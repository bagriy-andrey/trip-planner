import type { QueryClient } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react-native";
import type { ReactElement } from "react";
import type { Trip } from "@tripplanner/shared";

import { createQueryClient, shouldRetry } from "@/lib/query";
import { renderWithProviders } from "@/test-utils/renderWithProviders";
import type { RenderWithProvidersOptions, TestSession } from "@/test-utils/renderWithProviders";

import { getTrip, listTrips, TripApiError } from "../../api";
import { tripKeys } from "../queryKeys";
import { useTripQuery } from "../useTripQuery";
import { useTripsQuery } from "../useTripsQuery";
import type { TripQueryResult } from "../useTripQuery";
import type { TripsQueryResult } from "../useTripsQuery";
import { makeTrip } from "./testKit";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("../../api", () => ({
  ...jest.requireActual("../../api"),
  listTrips: jest.fn(),
  getTrip: jest.fn(),
}));

const listTripsMock = listTrips as jest.Mock;
const getTripMock = getTrip as jest.Mock;

const TODAY = "2026-09-21";
const SIGNED_IN: TestSession = { status: "signedIn" };

const upcoming = makeTrip({ id: "up", startDate: "2026-10-01", endDate: "2026-10-05" });
const later = makeTrip({ id: "later", startDate: "2027-01-10", endDate: "2027-01-12" });
const draft = makeTrip({ id: "draft" });
const past = makeTrip({ id: "past", startDate: "2026-08-01", endDate: "2026-08-05" });
const archived = makeTrip({ id: "arch", startDate: "2026-11-01", endDate: "2026-11-05", archivedAt: "2026-09-10T10:00:00.000Z" });

function Trips({ sink }: { sink: { current: TripsQueryResult | undefined } }) {
  sink.current = useTripsQuery();
  return null;
}

function OneTrip({ id, sink }: { id: string | undefined; sink: { current: TripQueryResult | undefined } }) {
  sink.current = useTripQuery(id);
  return null;
}

const clients: QueryClient[] = [];

beforeEach(() => {
  listTripsMock.mockReset();
  getTripMock.mockReset();
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

describe("tripKeys", () => {
  it("has the contract shapes", () => {
    expect(tripKeys.all).toEqual(["trips"]);
    expect(tripKeys.one("abc")).toEqual(["trips", "abc"]);
  });
});

describe("useTripsQuery", () => {
  it("ONE request serves both lists, split by the shared selectors and today (AC-35, AC-36)", async () => {
    listTripsMock.mockResolvedValue({ ok: true, data: [later, past, archived, draft, upcoming] });
    const sink: { current: TripsQueryResult | undefined } = { current: undefined };
    await render(<Trips sink={sink} />, { session: SIGNED_IN, today: TODAY });

    await waitFor(() => expect(sink.current?.isPending).toBe(false));
    expect(listTripsMock).toHaveBeenCalledTimes(1);
    expect(sink.current?.trips).toHaveLength(5);
    expect(sink.current?.active.map((trip: Trip) => trip.id)).toEqual(["up", "later", "draft"]);
    expect(sink.current?.history.map((trip: Trip) => trip.id)).toEqual(["arch", "past"]);
  });

  it("'today' moves a trip between the lists without a new request", async () => {
    listTripsMock.mockResolvedValue({ ok: true, data: [upcoming] });
    const sink: { current: TripsQueryResult | undefined } = { current: undefined };
    await render(<Trips sink={sink} />, { session: SIGNED_IN, today: "2026-10-06" });
    await waitFor(() => expect(sink.current?.isPending).toBe(false));
    expect(sink.current?.active).toEqual([]);
    expect(sink.current?.history.map((trip: Trip) => trip.id)).toEqual(["up"]);
    expect(listTripsMock).toHaveBeenCalledTimes(1);
  });

  it.each(["signedOut", "restoring"] as const)("AC-62: %s sends no request", async (status) => {
    const sink: { current: TripsQueryResult | undefined } = { current: undefined };
    const { queryClient } = await render(<Trips sink={sink} />, { session: { status }, today: TODAY });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(listTripsMock).not.toHaveBeenCalled();
    expect(sink.current?.trips).toBeUndefined();
    expect(sink.current?.isFetching).toBe(false);
    expect(queryClient.isFetching()).toBe(0);
  });

  it("a failed load throws a TripApiError that carries the kind, so the client can classify it (AC-41)", async () => {
    listTripsMock.mockResolvedValue({ ok: false, kind: "offline" });
    const sink: { current: TripsQueryResult | undefined } = { current: undefined };
    await render(<Trips sink={sink} />, { session: SIGNED_IN, today: TODAY });
    await waitFor(() => expect(sink.current?.isError).toBe(true));
    expect(sink.current?.error).toBeInstanceOf(TripApiError);
    expect(sink.current?.error?.kind).toBe("offline");
    expect(sink.current?.trips).toBeUndefined();
    expect(sink.current?.active).toEqual([]);
    expect(sink.current?.history).toEqual([]);
  });

  it("refetch calls the api again (the Retry action)", async () => {
    listTripsMock.mockResolvedValueOnce({ ok: false, kind: "timeout" });
    listTripsMock.mockResolvedValueOnce({ ok: true, data: [upcoming] });
    const sink: { current: TripsQueryResult | undefined } = { current: undefined };
    await render(<Trips sink={sink} />, { session: SIGNED_IN, today: TODAY });
    await waitFor(() => expect(sink.current?.isError).toBe(true));

    await sink.current?.refetch();
    await waitFor(() => expect(sink.current?.isError).toBe(false));
    expect(listTripsMock).toHaveBeenCalledTimes(2);
    expect(sink.current?.active.map((trip: Trip) => trip.id)).toEqual(["up"]);
  });
});

describe("retry rule integration (step 5 contract)", () => {
  it("the thrown errors are retried only when transient", () => {
    expect(shouldRetry(0, new TripApiError("offline"))).toBe(true);
    expect(shouldRetry(0, new TripApiError("timeout"))).toBe(true);
    expect(shouldRetry(1, new TripApiError("offline"))).toBe(false);
    for (const kind of ["notFound", "denied", "unknown"] as const) {
      expect(shouldRetry(0, new TripApiError(kind))).toBe(false);
    }
  });
});

describe("useTripQuery", () => {
  it("loads one trip by id", async () => {
    getTripMock.mockResolvedValue({ ok: true, data: upcoming });
    const sink: { current: TripQueryResult | undefined } = { current: undefined };
    await render(<OneTrip id="up" sink={sink} />, { session: SIGNED_IN, today: TODAY });
    await waitFor(() => expect(sink.current?.trip?.id).toBe("up"));
    expect(getTripMock).toHaveBeenCalledWith("up");
  });

  it("AC-56: a missing trip is an error carrying kind notFound", async () => {
    getTripMock.mockResolvedValue({ ok: false, kind: "notFound" });
    const sink: { current: TripQueryResult | undefined } = { current: undefined };
    await render(<OneTrip id="gone" sink={sink} />, { session: SIGNED_IN, today: TODAY });
    await waitFor(() => expect(sink.current?.isError).toBe(true));
    expect(sink.current?.error?.kind).toBe("notFound");
    expect(sink.current?.trip).toBeUndefined();
  });

  it.each(["signedOut", "restoring"] as const)("AC-62: %s sends no request", async (status) => {
    const sink: { current: TripQueryResult | undefined } = { current: undefined };
    await render(<OneTrip id="up" sink={sink} />, { session: { status }, today: TODAY });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(getTripMock).not.toHaveBeenCalled();
  });

  it("no id, no request", async () => {
    const sink: { current: TripQueryResult | undefined } = { current: undefined };
    await render(<OneTrip id={undefined} sink={sink} />, { session: SIGNED_IN, today: TODAY });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(getTripMock).not.toHaveBeenCalled();
  });
});
