import { act } from "@testing-library/react-native";
import { EMPTY_PROFILE } from "@tripplanner/shared";
import type { Profile } from "@tripplanner/shared";

import { createQueryClient } from "@/lib/query";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { getProfile, saveProfile } from "../../api";
import { useProfileEditor } from "../useProfileEditor";
import type { ProfileEditor } from "../useProfileEditor";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("../../api", () => ({
  ...jest.requireActual("../../api"),
  getProfile: jest.fn(),
  saveProfile: jest.fn(),
}));

const load = getProfile as jest.Mock;
const save = saveProfile as jest.Mock;

function Probe({ sink }: { sink: { current: ProfileEditor | undefined } }) {
  sink.current = useProfileEditor();
  return null;
}

const cleanups: (() => void)[] = [];

async function setup() {
  const queryClient = createQueryClient({ retry: false, gcTime: Infinity });
  const sink: { current: ProfileEditor | undefined } = { current: undefined };
  const { unmount } = await renderWithProviders(<Probe sink={sink} />, {
    session: { status: "signedIn", user: { id: "user-1" } },
    queryClient,
  });
  cleanups.push(unmount, () => {
    for (const mutation of queryClient.getMutationCache().getAll()) mutation.destroy();
    queryClient.clear();
  });
  const hook = (): ProfileEditor => {
    if (!sink.current) throw new Error("hook not rendered");
    return sink.current;
  };
  await act(async () => void (await new Promise((resolve) => setTimeout(resolve, 0))));
  return hook;
}

const flush = () => act(async () => void (await new Promise((resolve) => setTimeout(resolve, 0))));
const profileOf = (over: Partial<Profile>): Profile => ({ ...EMPTY_PROFILE, ...over });

beforeEach(() => {
  load.mockReset();
  save.mockReset();
});
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

describe("useProfileEditor", () => {
  it("shows the loaded profile", async () => {
    load.mockResolvedValue({ ok: true, data: profileOf({ citizenship: "PT" }) });
    const hook = await setup();
    expect(hook().loading).toBe(false);
    expect(hook().display.citizenship).toBe("PT");
  });

  it("a load failure is loadError, and retry loads again", async () => {
    load.mockResolvedValueOnce({ ok: false, kind: "offline" });
    const hook = await setup();
    expect(hook().loadError).toBe(true);
    load.mockResolvedValueOnce({ ok: true, data: EMPTY_PROFILE });
    await act(async () => hook().retry());
    await flush();
    expect(hook().loadError).toBe(false);
  });

  it("choosing the same value again only closes the sheet: no write (AC-20)", async () => {
    load.mockResolvedValue({ ok: true, data: profileOf({ citizenship: "PT" }) });
    const hook = await setup();
    await act(async () => hook().open("citizenship"));
    await act(async () => hook().choose("PT"));
    expect(save).not.toHaveBeenCalled();
    expect(hook().activeField).toBeNull();
  });

  it("opening while a sheet is open is ignored", async () => {
    load.mockResolvedValue({ ok: true, data: EMPTY_PROFILE });
    const hook = await setup();
    await act(async () => {
      hook().open("citizenship");
      hook().open("residence");
    });
    expect(hook().activeField).toBe("citizenship");
  });

  it("choosing null on an empty field writes nothing", async () => {
    load.mockResolvedValue({ ok: true, data: EMPTY_PROFILE });
    const hook = await setup();
    await act(async () => hook().open("homeCurrency"));
    await act(async () => hook().choose(null));
    expect(save).not.toHaveBeenCalled();
  });

  it("a choice shows at once and a failure reports on the right card", async () => {
    load.mockResolvedValue({ ok: true, data: EMPTY_PROFILE });
    save.mockResolvedValue({ ok: false, kind: "offline" });
    const hook = await setup();

    await act(async () => hook().open("homeCurrency"));
    await act(async () => hook().choose("EUR"));
    await flush();

    expect(save).toHaveBeenCalledTimes(1);
    expect(hook().display.homeCurrency).toBeNull();
    expect(hook().saveError).toEqual({ card: "settings", kind: "offline" });

    await act(async () => hook().open("citizenship"));
    await act(async () => hook().choose("PT"));
    await flush();
    expect(hook().saveError).toEqual({ card: "aboutMe", kind: "offline" });
  });
});
