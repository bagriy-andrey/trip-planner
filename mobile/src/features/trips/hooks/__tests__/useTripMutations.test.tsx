import { act, waitFor } from "@testing-library/react-native";
import { parseTripForm } from "@tripplanner/shared";
import type { TripFormValue } from "@tripplanner/shared";

import { createQueryClient } from "@/lib/query";
import { renderWithProviders } from "@/test-utils/renderWithProviders";
import type { TestSession } from "@/test-utils/renderWithProviders";

import { archiveTrip, createTrip, deleteTrip, TripApiError, unarchiveTrip, updateTrip } from "../../api";
import { tripKeys } from "../queryKeys";
import { useTripMutations } from "../useTripMutations";
import type { TripMutations } from "../useTripMutations";
import { makeTrip } from "./testKit";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("../../api", () => ({
  ...jest.requireActual("../../api"),
  createTrip: jest.fn(),
  updateTrip: jest.fn(),
  archiveTrip: jest.fn(),
  unarchiveTrip: jest.fn(),
  deleteTrip: jest.fn(),
}));

const apis = {
  createTrip: createTrip as jest.Mock,
  updateTrip: updateTrip as jest.Mock,
  archiveTrip: archiveTrip as jest.Mock,
  unarchiveTrip: unarchiveTrip as jest.Mock,
  deleteTrip: deleteTrip as jest.Mock,
};

const SIGNED_IN: TestSession = { status: "signedIn" };
const TRIP = makeTrip({ id: "trip-7", destination: "Porto" });

function formOf(): TripFormValue {
  const parsed = parseTripForm({ destination: "Porto" });
  if (!parsed.ok) throw new Error("fixture form is invalid");
  return parsed.value;
}

function Probe({ sink }: { sink: { current: TripMutations | undefined } }) {
  sink.current = useTripMutations();
  return null;
}

// A finished mutation is kept for 5 minutes by a gc timer that would keep jest alive, and
// `clear()` does not stop it: after each test unmount, destroy the mutations, clear the client.
const cleanups: (() => void)[] = [];

async function setup(session: TestSession = SIGNED_IN) {
  const queryClient = createQueryClient({ retry: false, gcTime: Infinity });
  const invalidate = jest.spyOn(queryClient, "invalidateQueries");
  const sink: { current: TripMutations | undefined } = { current: undefined };
  const { unmount } = await renderWithProviders(<Probe sink={sink} />, { session, queryClient });
  cleanups.push(unmount, () => {
    for (const mutation of queryClient.getMutationCache().getAll()) mutation.destroy();
    queryClient.clear();
  });
  const mutations = (): TripMutations => {
    if (!sink.current) throw new Error("hook not rendered");
    return sink.current;
  };
  return { queryClient, invalidate, mutations };
}

function invalidatedKeys(invalidate: jest.SpyInstance): unknown[] {
  return invalidate.mock.calls.map(([filters]) => (filters as { queryKey: unknown }).queryKey);
}

/**
 * Runs `task` inside `act` and lets the query client's batched notifications (scheduled with a
 * zero timeout) reach React before `act` closes. Resolves to what `task` rejected with, if it did.
 */
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

describe("every mutation invalidates the list and its own trip (AC-42)", () => {
  const cases: [string, keyof typeof apis, (m: TripMutations) => Promise<unknown>][] = [
    ["create", "createTrip", (m) => m.create.mutateAsync(formOf())],
    ["update", "updateTrip", (m) => m.update.mutateAsync({ id: "trip-7", form: formOf() })],
    ["archive", "archiveTrip", (m) => m.archive.mutateAsync("trip-7")],
    ["unarchive", "unarchiveTrip", (m) => m.unarchive.mutateAsync("trip-7")],
    ["delete", "deleteTrip", (m) => m.remove.mutateAsync("trip-7")],
  ];

  it.each(cases)("%s", async (_name, api, run) => {
    apis[api].mockResolvedValue({ ok: true, data: api === "deleteTrip" ? { id: "trip-7" } : TRIP });
    const { invalidate, mutations } = await setup();

    await attempt(() => run(mutations()));

    expect(apis[api]).toHaveBeenCalledTimes(1);
    expect(invalidatedKeys(invalidate)).toEqual(
      expect.arrayContaining([tripKeys.all, tripKeys.one("trip-7")]),
    );
  });

  it("create/update/archive/unarchive pass their arguments to the api", async () => {
    apis.createTrip.mockResolvedValue({ ok: true, data: TRIP });
    apis.updateTrip.mockResolvedValue({ ok: true, data: TRIP });
    apis.archiveTrip.mockResolvedValue({ ok: true, data: TRIP });
    apis.unarchiveTrip.mockResolvedValue({ ok: true, data: TRIP });
    const { mutations } = await setup();
    const form = formOf();
    await attempt(async () => {
      await mutations().create.mutateAsync(form);
      await mutations().update.mutateAsync({ id: "trip-7", form });
      await mutations().archive.mutateAsync("trip-7");
      await mutations().unarchive.mutateAsync("trip-7");
    });
    expect(apis.createTrip).toHaveBeenCalledWith(form);
    expect(apis.updateTrip).toHaveBeenCalledWith("trip-7", form);
    expect(apis.archiveTrip).toHaveBeenCalledWith("trip-7");
    expect(apis.unarchiveTrip).toHaveBeenCalledWith("trip-7");
  });

  it("create invalidates the id the SERVER assigned", async () => {
    apis.createTrip.mockResolvedValue({ ok: true, data: makeTrip({ id: "new-id" }) });
    const { invalidate, mutations } = await setup();
    await attempt(() => mutations().create.mutateAsync(formOf()));
    expect(invalidatedKeys(invalidate)).toContainEqual(tripKeys.one("new-id"));
  });

  it("delete does not refetch the deleted trip's own (possibly open) entry, so no 'not found' flash (AC-56)", async () => {
    apis.deleteTrip.mockResolvedValue({ ok: true, data: { id: "trip-7" } });
    const { invalidate, mutations } = await setup();
    await attempt(() => mutations().remove.mutateAsync("trip-7"));
    const own = invalidate.mock.calls.find(
      ([filters]) => JSON.stringify((filters as { queryKey: unknown }).queryKey) === JSON.stringify(tripKeys.one("trip-7")),
    );
    expect(own?.[0]).toMatchObject({ refetchType: "none" });
  });
});

describe("failures (AC-57, AC-58)", () => {
  it("a failed write throws a TripApiError with the kind, invalidates nothing and changes no cached data", async () => {
    apis.archiveTrip.mockResolvedValue({ ok: false, kind: "offline" });
    const { queryClient, invalidate, mutations } = await setup();
    queryClient.setQueryData(tripKeys.all, [TRIP]);
    queryClient.setQueryData(tripKeys.one("trip-7"), TRIP);

    const caught = await attempt(() => mutations().archive.mutateAsync("trip-7"));

    expect(caught).toBeInstanceOf(TripApiError);
    expect((caught as TripApiError).kind).toBe("offline");
    expect(invalidate).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(tripKeys.all)).toEqual([TRIP]);
    expect(queryClient.getQueryData(tripKeys.one("trip-7"))).toEqual(TRIP);
    await waitFor(() => expect(mutations().archive.isError).toBe(true));
    expect(mutations().archive.error?.kind).toBe("offline");
  });

  it("no optimistic update: while the request is in flight the cache is untouched", async () => {
    let finish: (value: unknown) => void = () => undefined;
    apis.archiveTrip.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { queryClient, mutations } = await setup();
    queryClient.setQueryData(tripKeys.all, [TRIP]);

    let whileInFlight: unknown;
    await attempt(async () => {
      const pending = mutations().archive.mutateAsync("trip-7");
      await new Promise((resolve) => setTimeout(resolve, 0));
      whileInFlight = queryClient.getQueryData(tripKeys.all);
      finish({ ok: true, data: TRIP });
      await pending;
    });
    expect(apis.archiveTrip).toHaveBeenCalledTimes(1);
    expect(whileInFlight).toEqual([TRIP]);
  });

  it("mutations are never retried", async () => {
    apis.deleteTrip.mockResolvedValue({ ok: false, kind: "timeout" });
    const { mutations } = await setup();
    await attempt(() => mutations().remove.mutateAsync("trip-7").catch(() => undefined));
    expect(apis.deleteTrip).toHaveBeenCalledTimes(1);
  });
});

describe("AC-62: no session, no request", () => {
  it.each(["signedOut", "restoring"] as const)("%s: the api is never called and the mutation is denied", async (status) => {
    const { invalidate, mutations } = await setup({ status });
    const caught = await attempt(() => mutations().create.mutateAsync(formOf()));
    expect((caught as TripApiError).kind).toBe("denied");
    for (const fn of Object.values(apis)) expect(fn).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });
});
