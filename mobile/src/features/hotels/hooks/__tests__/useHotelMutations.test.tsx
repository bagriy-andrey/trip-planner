import { act } from "@testing-library/react-native";
import { parseHotelForm } from "@tripplanner/shared";
import type { HotelFormValue } from "@tripplanner/shared";

import { createQueryClient } from "@/lib/query";
import { renderWithProviders } from "@/test-utils/renderWithProviders";
import type { TestSession } from "@/test-utils/renderWithProviders";

import { createHotel, deleteHotel, TripApiError, updateHotel } from "../../api";
import { hotelKeys } from "../queryKeys";
import { useHotelMutations } from "../useHotelMutations";
import type { HotelMutations } from "../useHotelMutations";
import { makeHotel } from "./testKit";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("../../api", () => ({
  ...jest.requireActual("../../api"),
  createHotel: jest.fn(),
  updateHotel: jest.fn(),
  deleteHotel: jest.fn(),
}));

const apis = {
  createHotel: createHotel as jest.Mock,
  updateHotel: updateHotel as jest.Mock,
  deleteHotel: deleteHotel as jest.Mock,
};

const SIGNED_IN: TestSession = { status: "signedIn" };
const TRIP_ID = "trip-7";
const HOTEL = makeHotel({ id: "hotel-1", tripId: TRIP_ID });

function formOf(): HotelFormValue {
  const parsed = parseHotelForm({
    name: "Casa Alfama",
    cityPlaceId: "city-lisbon",
    checkInDate: "2026-06-15",
    checkInTime: "15:00",
    checkOutDate: "2026-06-18",
    checkOutTime: "11:00",
  });
  if (!parsed.ok) throw new Error("fixture form is invalid");
  return parsed.value;
}

function Probe({ sink }: { sink: { current: HotelMutations | undefined } }) {
  sink.current = useHotelMutations();
  return null;
}

// Destroy mutations before clearing the client: their gc timers would keep jest alive.
const cleanups: (() => void)[] = [];

async function setup(session: TestSession = SIGNED_IN) {
  const queryClient = createQueryClient({ retry: false, gcTime: Infinity });
  const invalidate = jest.spyOn(queryClient, "invalidateQueries");
  const sink: { current: HotelMutations | undefined } = { current: undefined };
  const { unmount } = await renderWithProviders(<Probe sink={sink} />, { session, queryClient });
  cleanups.push(unmount, () => {
    for (const mutation of queryClient.getMutationCache().getAll()) mutation.destroy();
    queryClient.clear();
  });
  const mutations = (): HotelMutations => {
    if (!sink.current) throw new Error("hook not rendered");
    return sink.current;
  };
  return { queryClient, invalidate, mutations };
}

async function attempt(task: () => Promise<unknown>): Promise<unknown> {
  let caught: unknown;
  await act(async () => {
    try {
      await task();
    } catch (error) {
      caught = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return caught;
}

beforeEach(() => {
  for (const fn of Object.values(apis)) fn.mockReset();
});

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

describe("every mutation invalidates hotelKeys.ofTrip", () => {
  const cases: [string, keyof typeof apis, (m: HotelMutations) => Promise<unknown>][] = [
    ["create", "createHotel", (m) => m.create.mutateAsync({ tripId: TRIP_ID, form: formOf() })],
    [
      "update",
      "updateHotel",
      (m) => m.update.mutateAsync({ tripId: TRIP_ID, hotelId: "hotel-1", form: formOf() }),
    ],
    ["delete", "deleteHotel", (m) => m.remove.mutateAsync({ tripId: TRIP_ID, hotelId: "hotel-1" })],
  ];

  it.each(cases)("%s", async (_name, api, run) => {
    apis[api].mockResolvedValue({ ok: true, data: api === "deleteHotel" ? { id: "hotel-1" } : HOTEL });
    const { invalidate, mutations } = await setup();

    await attempt(() => run(mutations()));

    expect(apis[api]).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: hotelKeys.ofTrip(TRIP_ID) });
  });
});

describe("failures", () => {
  it("a failed write throws a TripApiError with the kind and changes no cached data", async () => {
    apis.updateHotel.mockResolvedValue({ ok: false, kind: "offline" });
    const { queryClient, invalidate, mutations } = await setup();
    queryClient.setQueryData(hotelKeys.ofTrip(TRIP_ID), [HOTEL]);

    const caught = await attempt(() =>
      mutations().update.mutateAsync({ tripId: TRIP_ID, hotelId: "hotel-1", form: formOf() }),
    );

    expect(caught).toBeInstanceOf(TripApiError);
    expect((caught as TripApiError).kind).toBe("offline");
    expect(invalidate).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(hotelKeys.ofTrip(TRIP_ID))).toEqual([HOTEL]);
  });

  it("without a session nothing is sent and the mutation fails as denied", async () => {
    const { mutations } = await setup({ status: "signedOut" });

    const caught = await attempt(() =>
      mutations().create.mutateAsync({ tripId: TRIP_ID, form: formOf() }),
    );

    expect((caught as TripApiError).kind).toBe("denied");
    expect(apis.createHotel).not.toHaveBeenCalled();
  });
});
