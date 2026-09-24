import { act } from "@testing-library/react-native";
import { EMPTY_PROFILE } from "@tripplanner/shared";

import { createQueryClient } from "@/lib/query";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { getProfile } from "../../api";
import { profileKeys } from "../queryKeys";
import { useProfileQuery } from "../useProfileQuery";
import type { ProfileQueryResult } from "../useProfileQuery";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("../../api", () => ({ ...jest.requireActual("../../api"), getProfile: jest.fn() }));

const load = getProfile as jest.Mock;

function Probe({ sink }: { sink: { current: ProfileQueryResult | undefined } }) {
  sink.current = useProfileQuery();
  return null;
}

const tick = () => act(async () => void (await new Promise((resolve) => setTimeout(resolve, 0))));

afterEach(() => load.mockReset());

describe("profile cache identity (AC-30)", () => {
  it("keys differ per user", () => {
    expect(profileKeys.mine("a")).not.toEqual(profileKeys.mine("b"));
    expect(profileKeys.mine("a")).toEqual(["profile", "a"]);
  });

  it("another user does not read the first user's cached profile", async () => {
    const queryClient = createQueryClient({ retry: false, gcTime: Infinity });
    queryClient.setQueryData(profileKeys.mine("user-1"), { ...EMPTY_PROFILE, citizenship: "PT" });
    load.mockResolvedValue({ ok: true, data: EMPTY_PROFILE });
    const sink: { current: ProfileQueryResult | undefined } = { current: undefined };

    const { unmount } = await renderWithProviders(<Probe sink={sink} />, {
      session: { status: "signedIn", user: { id: "user-2" } },
      queryClient,
    });
    await tick();
    expect(sink.current?.profile).toEqual(EMPTY_PROFILE);
    expect(load).toHaveBeenCalledTimes(1);

    unmount();
    queryClient.clear();
    expect(queryClient.getQueryData(profileKeys.mine("user-1"))).toBeUndefined();
  });

  it("does not load without a session", async () => {
    const queryClient = createQueryClient({ retry: false, gcTime: Infinity });
    const sink: { current: ProfileQueryResult | undefined } = { current: undefined };
    const { unmount } = await renderWithProviders(<Probe sink={sink} />, {
      session: { status: "signedOut" },
      queryClient,
    });
    await tick();
    expect(load).not.toHaveBeenCalled();
    unmount();
    queryClient.clear();
  });
});
