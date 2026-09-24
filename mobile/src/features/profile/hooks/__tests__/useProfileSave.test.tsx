import { act } from "@testing-library/react-native";
import { EMPTY_PROFILE } from "@tripplanner/shared";
import type { Profile } from "@tripplanner/shared";

import { createQueryClient } from "@/lib/query";
import { renderWithProviders } from "@/test-utils/renderWithProviders";
import type { TestSession } from "@/test-utils/renderWithProviders";

import { saveProfile } from "../../api";
import { overlay } from "../pendingPatches";
import { profileKeys } from "../queryKeys";
import { useProfileSave } from "../useProfileSave";
import type { ProfileSave } from "../useProfileSave";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("../../api", () => ({ ...jest.requireActual("../../api"), saveProfile: jest.fn() }));

const api = saveProfile as jest.Mock;
const SIGNED_IN: TestSession = { status: "signedIn", user: { id: "user-1" } };

function Probe({ sink }: { sink: { current: ProfileSave | undefined } }) {
  sink.current = useProfileSave();
  return null;
}

const cleanups: (() => void)[] = [];

async function setup(session: TestSession = SIGNED_IN) {
  const queryClient = createQueryClient({ retry: false, gcTime: Infinity });
  const sink: { current: ProfileSave | undefined } = { current: undefined };
  const { unmount } = await renderWithProviders(<Probe sink={sink} />, { session, queryClient });
  cleanups.push(unmount, () => {
    for (const mutation of queryClient.getMutationCache().getAll()) mutation.destroy();
    queryClient.clear();
  });
  const hook = (): ProfileSave => {
    if (!sink.current) throw new Error("hook not rendered");
    return sink.current;
  };
  return { queryClient, hook };
}

const flush = () => act(async () => void (await new Promise((resolve) => setTimeout(resolve, 0))));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const profileOf = (over: Partial<Profile>): Profile => ({ ...EMPTY_PROFILE, ...over });

beforeEach(() => api.mockReset());
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

describe("useProfileSave", () => {
  it("success puts the server row in the cache and drops the patch", async () => {
    const server = profileOf({ homeCurrency: "EUR" });
    api.mockResolvedValue({ ok: true, data: server });
    const { queryClient, hook } = await setup();

    await act(async () => hook().save("homeCurrency", { homeCurrency: "EUR" }, EMPTY_PROFILE));
    await flush();

    expect(api).toHaveBeenCalledWith("user-1", { homeCurrency: "EUR" }, EMPTY_PROFILE);
    expect(queryClient.getQueryData(profileKeys.mine("user-1"))).toEqual(server);
    expect(hook().queue).toEqual([]);
    expect(hook().lastError).toBeNull();
  });

  it.each(["offline", "timeout", "denied", "unknown"] as const)("a %s failure rolls back and reports it", async (kind) => {
    api.mockResolvedValue({ ok: false, kind });
    const { hook } = await setup();

    await act(async () => hook().save("homeCurrency", { homeCurrency: "EUR" }, EMPTY_PROFILE));
    await flush();

    expect(hook().queue).toEqual([]);
    expect(hook().lastError).toEqual({ field: "homeCurrency", kind });
  });

  it("rolls back a linked group (city + residence + airport) as one", async () => {
    const answer = deferred<unknown>();
    api.mockReturnValue(answer.promise);
    const { hook } = await setup();
    const patch = { homeCityId: "city-lisbon", residence: "PT", homeAirport: "LIS" };

    await act(async () => hook().save("homeCity", patch, EMPTY_PROFILE));
    expect(overlay(EMPTY_PROFILE, hook().queue)).toMatchObject(patch);
    await act(async () => answer.resolve({ ok: false, kind: "offline" }));
    await flush();

    expect(overlay(EMPTY_PROFILE, hook().queue)).toEqual(EMPTY_PROFILE);
    expect(hook().lastError).toEqual({ field: "homeCity", kind: "offline" });
  });

  it("without a session nothing is sent and the error is denied", async () => {
    const { hook } = await setup({ status: "signedOut" });

    await act(async () => hook().save("homeCurrency", { homeCurrency: "EUR" }, EMPTY_PROFILE));
    await flush();

    expect(api).not.toHaveBeenCalled();
    expect(hook().queue).toEqual([]);
    expect(hook().lastError).toEqual({ field: "homeCurrency", kind: "denied" });
  });

  it("serializes writes and the last choice wins (AC-32)", async () => {
    const first = deferred<unknown>();
    const second = deferred<unknown>();
    api.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { queryClient, hook } = await setup();

    await act(async () => {
      hook().save("citizenship", { citizenship: "PT" }, EMPTY_PROFILE);
      hook().save("citizenship", { citizenship: "FR" }, profileOf({ citizenship: "PT" }));
    });
    await flush();

    // The second write has not left before the first was answered; the screen shows the second value.
    expect(api).toHaveBeenCalledTimes(1);
    expect(overlay(EMPTY_PROFILE, hook().queue).citizenship).toBe("FR");

    await act(async () => first.resolve({ ok: true, data: profileOf({ citizenship: "PT" }) }));
    await flush();
    expect(api).toHaveBeenCalledTimes(2);
    expect(api.mock.calls[1]?.[1]).toEqual({ citizenship: "FR" });
    const cached = queryClient.getQueryData<Profile>(profileKeys.mine("user-1")) ?? EMPTY_PROFILE;
    expect(overlay(cached, hook().queue).citizenship).toBe("FR");

    await act(async () => second.resolve({ ok: true, data: profileOf({ citizenship: "FR" }) }));
    await flush();
    expect(queryClient.getQueryData<Profile>(profileKeys.mine("user-1"))?.citizenship).toBe("FR");
    expect(hook().queue).toEqual([]);
  });
});
