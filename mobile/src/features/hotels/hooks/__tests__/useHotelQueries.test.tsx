import type { QueryClient } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react-native";
import type { ReactElement } from "react";

import { createQueryClient } from "@/lib/query";
import { renderWithProviders } from "@/test-utils/renderWithProviders";
import type { RenderWithProvidersOptions, TestSession } from "@/test-utils/renderWithProviders";

import { getHotel, listHotels, TripApiError } from "../../api";
import { hotelKeys } from "../queryKeys";
import { useHotelQuery } from "../useHotelQuery";
import type { HotelQueryResult } from "../useHotelQuery";
import { useHotelsQuery } from "../useHotelsQuery";
import type { HotelsQueryResult } from "../useHotelsQuery";
import { makeHotel } from "./testKit";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("../../api", () => ({
  ...jest.requireActual("../../api"),
  listHotels: jest.fn(),
  getHotel: jest.fn(),
}));

const listMock = listHotels as jest.Mock;
const getMock = getHotel as jest.Mock;

const SIGNED_IN: TestSession = { status: "signedIn" };
const TRIP_ID = "trip-7";
const hotel = makeHotel({ id: "hotel-1" });

function Hotels({ sink }: { sink: { current: HotelsQueryResult | undefined } }) {
  sink.current = useHotelsQuery(TRIP_ID);
  return null;
}

function OneHotel({
  hotelId,
  sink,
}: {
  hotelId: string | undefined;
  sink: { current: HotelQueryResult | undefined };
}) {
  sink.current = useHotelQuery(TRIP_ID, hotelId);
  return null;
}

const clients: QueryClient[] = [];

beforeEach(() => {
  listMock.mockReset();
  getMock.mockReset();
});

afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
});

function render(ui: ReactElement, options: RenderWithProvidersOptions) {
  const queryClient = createQueryClient({ retry: false, gcTime: Infinity });
  clients.push(queryClient);
  return renderWithProviders(ui, { ...options, queryClient });
}

describe("hotelKeys", () => {
  it("has the contract shapes", () => {
    expect(hotelKeys.all).toEqual(["hotels"]);
    expect(hotelKeys.ofTrip("t1")).toEqual(["hotels", "t1"]);
    expect(hotelKeys.one("t1", "h1")).toEqual(["hotels", "t1", "h1"]);
  });
});

describe("useHotelsQuery", () => {
  it("ONE request serves all hotels of the trip", async () => {
    listMock.mockResolvedValue({ ok: true, data: [hotel] });
    const sink: { current: HotelsQueryResult | undefined } = { current: undefined };
    await render(<Hotels sink={sink} />, { session: SIGNED_IN });

    await waitFor(() => expect(sink.current?.isPending).toBe(false));
    expect(listMock).toHaveBeenCalledTimes(1);
    expect(listMock).toHaveBeenCalledWith(TRIP_ID);
    expect(sink.current?.hotels).toHaveLength(1);
  });

  it("a failed load throws a TripApiError that carries the kind (AC-39)", async () => {
    listMock.mockResolvedValue({ ok: false, kind: "offline" });
    const sink: { current: HotelsQueryResult | undefined } = { current: undefined };
    await render(<Hotels sink={sink} />, { session: SIGNED_IN });
    await waitFor(() => expect(sink.current?.isError).toBe(true));
    expect(sink.current?.error).toBeInstanceOf(TripApiError);
    expect(sink.current?.error?.kind).toBe("offline");
    expect(sink.current?.hotels).toBeUndefined();
  });

  it.each(["signedOut", "restoring"] as const)("%s sends no request", async (status) => {
    const sink: { current: HotelsQueryResult | undefined } = { current: undefined };
    await render(<Hotels sink={sink} />, { session: { status } });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(listMock).not.toHaveBeenCalled();
  });
});

describe("useHotelQuery", () => {
  it("loads one hotel by trip id + hotel id", async () => {
    getMock.mockResolvedValue({ ok: true, data: hotel });
    const sink: { current: HotelQueryResult | undefined } = { current: undefined };
    await render(<OneHotel hotelId="hotel-1" sink={sink} />, { session: SIGNED_IN });
    await waitFor(() => expect(sink.current?.hotel?.id).toBe("hotel-1"));
    expect(getMock).toHaveBeenCalledWith(TRIP_ID, "hotel-1");
  });

  it("a missing hotel is an error carrying kind notFound", async () => {
    getMock.mockResolvedValue({ ok: false, kind: "notFound" });
    const sink: { current: HotelQueryResult | undefined } = { current: undefined };
    await render(<OneHotel hotelId="gone" sink={sink} />, { session: SIGNED_IN });
    await waitFor(() => expect(sink.current?.isError).toBe(true));
    expect(sink.current?.error?.kind).toBe("notFound");
    expect(sink.current?.hotel).toBeUndefined();
  });

  it("no hotel id, no request", async () => {
    const sink: { current: HotelQueryResult | undefined } = { current: undefined };
    await render(<OneHotel hotelId={undefined} sink={sink} />, { session: SIGNED_IN });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(getMock).not.toHaveBeenCalled();
  });
});
