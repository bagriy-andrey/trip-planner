import { act } from "@testing-library/react-native";
import { EMPTY_PROFILE } from "@tripplanner/shared";

import { createQueryClient } from "@/lib/query";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { getProfile } from "../../api";
import { useHomeDefaults } from "../useHomeDefaults";
import type { HomeDefaults } from "../useHomeDefaults";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("../../api", () => ({ ...jest.requireActual("../../api"), getProfile: jest.fn() }));

const load = getProfile as jest.Mock;

function Probe({ sink }: { sink: { current: HomeDefaults | undefined } }) {
  sink.current = useHomeDefaults();
  return null;
}

const cleanups: (() => void)[] = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  load.mockReset();
});

async function mount() {
  const queryClient = createQueryClient({ retry: false, gcTime: Infinity });
  const sink: { current: HomeDefaults | undefined } = { current: undefined };
  const { unmount } = await renderWithProviders(<Probe sink={sink} />, {
    session: { status: "signedIn", user: { id: "user-1" } },
    queryClient,
  });
  cleanups.push(unmount, () => queryClient.clear());
  return sink;
}

const tick = () => act(async () => void (await new Promise((resolve) => setTimeout(resolve, 0))));

describe("useHomeDefaults", () => {
  it("is null while loading and picks the data up when it arrives", async () => {
    let resolve!: (value: unknown) => void;
    load.mockReturnValue(new Promise((r) => (resolve = r)));
    const sink = await mount();
    expect(sink.current).toEqual({ homeAirport: null, homeCurrency: null });

    await act(async () => resolve({ ok: true, data: { ...EMPTY_PROFILE, homeAirport: "LIS", homeCurrency: "EUR" } }));
    await tick();
    expect(sink.current).toEqual({ homeAirport: "LIS", homeCurrency: "EUR" });
  });

  it("is null on an error and for a currency outside the supported list", async () => {
    load.mockResolvedValue({ ok: false, kind: "offline" });
    const failed = await mount();
    await tick();
    expect(failed.current).toEqual({ homeAirport: null, homeCurrency: null });

    load.mockResolvedValue({ ok: true, data: { ...EMPTY_PROFILE, homeCurrency: "ZZZ" } });
    const foreign = await mount();
    await tick();
    expect(foreign.current?.homeCurrency).toBeNull();
  });
});
