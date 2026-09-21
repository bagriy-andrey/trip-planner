import { act, renderHook } from "@testing-library/react-native";
import { isCalendarDate } from "@tripplanner/shared";
import type { CalendarDate } from "@tripplanner/shared";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";
import type { ReactNode } from "react";

import { ClockProvider, createClock, fixedClock, realClock, useToday } from "..";

function withClock(props: { today?: CalendarDate; now?: () => Date }) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ClockProvider {...props}>{children}</ClockProvider>;
  };
}

describe("clock sources", () => {
  it("fixedClock always answers the given calendar date", () => {
    expect(fixedClock("2026-09-21").today()).toBe("2026-09-21");
  });

  it("createClock reads the LOCAL calendar fields of the instant, not the UTC day", () => {
    // Built from local fields, so the expectation holds in any device time zone: 23:59 local
    // is still that local day even where UTC has already rolled over.
    expect(createClock(() => new Date(2026, 11, 31, 23, 59)).today()).toBe("2026-12-31");
    expect(createClock(() => new Date(2027, 0, 1, 0, 1)).today()).toBe("2027-01-01");
  });

  it("the real clock answers a well-formed calendar date", () => {
    expect(isCalendarDate(realClock.today())).toBe(true);
  });
});

describe("useToday", () => {
  it("returns the fixed date given to the provider", () => {
    const { result } = renderHook(() => useToday(), { wrapper: withClock({ today: "2026-09-21" }) });
    expect(result.current).toBe("2026-09-21");
  });

  it("without a provider it follows the real clock (device-local calendar date)", () => {
    const { result } = renderHook(() => useToday());
    expect(result.current).toBe(realClock.today());
  });

  it("uses the injected instant's device-local calendar date", () => {
    const now = () => new Date(2026, 2, 8, 23, 30);
    const { result } = renderHook(() => useToday(), { wrapper: withClock({ now }) });
    expect(result.current).toBe("2026-03-08");
  });

  describe("returning from the background", () => {
    let handler: ((state: AppStateStatus) => void) | undefined;
    const remove = jest.fn();

    beforeEach(() => {
      handler = undefined;
      remove.mockClear();
      jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
        handler = listener;
        return { remove };
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("recomputes on 'active' and picks up the new day", () => {
      let instant = new Date(2026, 8, 21, 23, 50);
      const { result } = renderHook(() => useToday(), {
        wrapper: withClock({ now: () => instant }),
      });
      expect(result.current).toBe("2026-09-21");

      instant = new Date(2026, 8, 22, 8, 0);
      // Still the old day until the app comes back: no timer runs in between.
      expect(result.current).toBe("2026-09-21");

      act(() => handler?.("active"));
      expect(result.current).toBe("2026-09-22");
    });

    it("ignores other app states", () => {
      let instant = new Date(2026, 8, 21, 23, 50);
      const { result } = renderHook(() => useToday(), {
        wrapper: withClock({ now: () => instant }),
      });
      instant = new Date(2026, 8, 22, 8, 0);

      act(() => handler?.("background"));
      act(() => handler?.("inactive"));
      expect(result.current).toBe("2026-09-21");
    });

    it("stops listening on unmount", () => {
      const { unmount } = renderHook(() => useToday(), {
        wrapper: withClock({ today: "2026-09-21" }),
      });
      unmount();
      expect(remove).toHaveBeenCalledTimes(1);
    });
  });
});
