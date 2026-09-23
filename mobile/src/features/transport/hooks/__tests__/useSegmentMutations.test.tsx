import { act, waitFor } from "@testing-library/react-native";
import { parseSegmentForm } from "@tripplanner/shared";
import type { SegmentFormValue } from "@tripplanner/shared";

import { tripKeys } from "@/features/trips";
import { createQueryClient } from "@/lib/query";
import { renderWithProviders } from "@/test-utils/renderWithProviders";
import type { TestSession } from "@/test-utils/renderWithProviders";

import { createSegment, deleteSegment, TripApiError, updateSegment } from "../../api";
import { segmentKeys } from "../queryKeys";
import { useSegmentMutations } from "../useSegmentMutations";
import type { SegmentMutations } from "../useSegmentMutations";
import { makeSegment } from "./testKit";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("../../api", () => ({
  ...jest.requireActual("../../api"),
  createSegment: jest.fn(),
  updateSegment: jest.fn(),
  deleteSegment: jest.fn(),
}));

const apis = {
  createSegment: createSegment as jest.Mock,
  updateSegment: updateSegment as jest.Mock,
  deleteSegment: deleteSegment as jest.Mock,
};

const SIGNED_IN: TestSession = { status: "signedIn" };
const TRIP_ID = "trip-7";
const SEGMENT = makeSegment({ id: "seg-1", tripId: TRIP_ID });

function formOf(): SegmentFormValue {
  const parsed = parseSegmentForm({
    from: "krk",
    to: "opo",
    departureDate: "2026-06-15",
    departureTime: "10:00",
  });
  if (!parsed.ok) throw new Error("fixture form is invalid");
  return parsed.value;
}

function Probe({ sink }: { sink: { current: SegmentMutations | undefined } }) {
  sink.current = useSegmentMutations();
  return null;
}

// A finished mutation is kept for 5 minutes by a gc timer that would keep jest alive, and
// `clear()` does not stop it: after each test unmount, destroy the mutations, clear the client.
const cleanups: (() => void)[] = [];

async function setup(session: TestSession = SIGNED_IN) {
  const queryClient = createQueryClient({ retry: false, gcTime: Infinity });
  const invalidate = jest.spyOn(queryClient, "invalidateQueries");
  const sink: { current: SegmentMutations | undefined } = { current: undefined };
  const { unmount } = await renderWithProviders(<Probe sink={sink} />, { session, queryClient });
  cleanups.push(unmount, () => {
    for (const mutation of queryClient.getMutationCache().getAll()) mutation.destroy();
    queryClient.clear();
  });
  const mutations = (): SegmentMutations => {
    if (!sink.current) throw new Error("hook not rendered");
    return sink.current;
  };
  return { queryClient, invalidate, mutations };
}

function invalidatedKeys(invalidate: jest.SpyInstance): unknown[] {
  return invalidate.mock.calls.map(([filters]) => (filters as { queryKey: unknown }).queryKey);
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

describe("every mutation invalidates segmentKeys.ofTrip AND tripKeys.one (AC-75)", () => {
  const cases: [string, keyof typeof apis, (m: SegmentMutations) => Promise<unknown>][] = [
    ["create", "createSegment", (m) => m.create.mutateAsync({ tripId: TRIP_ID, form: formOf() })],
    [
      "update",
      "updateSegment",
      (m) => m.update.mutateAsync({ tripId: TRIP_ID, segmentId: "seg-1", form: formOf() }),
    ],
    ["delete", "deleteSegment", (m) => m.remove.mutateAsync({ tripId: TRIP_ID, segmentId: "seg-1" })],
  ];

  it.each(cases)("%s", async (_name, api, run) => {
    apis[api].mockResolvedValue({ ok: true, data: api === "deleteSegment" ? { id: "seg-1" } : SEGMENT });
    const { invalidate, mutations } = await setup();

    await attempt(() => run(mutations()));

    expect(apis[api]).toHaveBeenCalledTimes(1);
    expect(invalidatedKeys(invalidate)).toEqual(
      expect.arrayContaining([segmentKeys.ofTrip(TRIP_ID), tripKeys.one(TRIP_ID)]),
    );
  });

  it("create/update pass their arguments to the api", async () => {
    apis.createSegment.mockResolvedValue({ ok: true, data: SEGMENT });
    apis.updateSegment.mockResolvedValue({ ok: true, data: SEGMENT });
    const { mutations } = await setup();
    const form = formOf();
    await attempt(async () => {
      await mutations().create.mutateAsync({ tripId: TRIP_ID, form });
      await mutations().update.mutateAsync({ tripId: TRIP_ID, segmentId: "seg-1", form });
    });
    expect(apis.createSegment).toHaveBeenCalledWith(TRIP_ID, form);
    expect(apis.updateSegment).toHaveBeenCalledWith(TRIP_ID, "seg-1", form);
  });
});

describe("failures (AC-82: no optimistic update, state unchanged on error)", () => {
  it("a failed write throws a TripApiError with the kind, invalidates nothing and changes no cached data", async () => {
    apis.updateSegment.mockResolvedValue({ ok: false, kind: "offline" });
    const { queryClient, invalidate, mutations } = await setup();
    queryClient.setQueryData(segmentKeys.ofTrip(TRIP_ID), [SEGMENT]);
    queryClient.setQueryData(segmentKeys.one(TRIP_ID, "seg-1"), SEGMENT);

    const caught = await attempt(() =>
      mutations().update.mutateAsync({ tripId: TRIP_ID, segmentId: "seg-1", form: formOf() }),
    );

    expect(caught).toBeInstanceOf(TripApiError);
    expect((caught as TripApiError).kind).toBe("offline");
    expect(invalidate).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(segmentKeys.ofTrip(TRIP_ID))).toEqual([SEGMENT]);
    expect(queryClient.getQueryData(segmentKeys.one(TRIP_ID, "seg-1"))).toEqual(SEGMENT);
    await waitFor(() => expect(mutations().update.isError).toBe(true));
    expect(mutations().update.error?.kind).toBe("offline");
  });

  it("no optimistic update: while the request is in flight the cache is untouched", async () => {
    let finish: (value: unknown) => void = () => undefined;
    apis.deleteSegment.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { queryClient, mutations } = await setup();
    queryClient.setQueryData(segmentKeys.ofTrip(TRIP_ID), [SEGMENT]);

    let whileInFlight: unknown;
    await attempt(async () => {
      const pending = mutations().remove.mutateAsync({ tripId: TRIP_ID, segmentId: "seg-1" });
      await new Promise((resolve) => setTimeout(resolve, 0));
      whileInFlight = queryClient.getQueryData(segmentKeys.ofTrip(TRIP_ID));
      finish({ ok: true, data: { id: "seg-1" } });
      await pending;
    });
    expect(apis.deleteSegment).toHaveBeenCalledTimes(1);
    expect(whileInFlight).toEqual([SEGMENT]);
  });

  it("mutations are never retried", async () => {
    apis.deleteSegment.mockResolvedValue({ ok: false, kind: "timeout" });
    const { mutations } = await setup();
    await attempt(() =>
      mutations()
        .remove.mutateAsync({ tripId: TRIP_ID, segmentId: "seg-1" })
        .catch(() => undefined),
    );
    expect(apis.deleteSegment).toHaveBeenCalledTimes(1);
  });
});

describe("no session, no request", () => {
  it.each(["signedOut", "restoring"] as const)("%s: the api is never called and the mutation is denied", async (status) => {
    const { invalidate, mutations } = await setup({ status });
    const caught = await attempt(() => mutations().create.mutateAsync({ tripId: TRIP_ID, form: formOf() }));
    expect((caught as TripApiError).kind).toBe("denied");
    for (const fn of Object.values(apis)) expect(fn).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });
});
