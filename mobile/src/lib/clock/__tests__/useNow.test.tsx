import { act, renderHook } from "@testing-library/react-native";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";

import { useNow } from "..";

describe("useNow", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 21, 12, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("starts at the current instant", () => {
    const { result } = renderHook(() => useNow());
    expect(result.current.getTime()).toBe(new Date(2026, 8, 21, 12, 0, 0).getTime());
  });

  it("does NOT update on every render, only on its own schedule", () => {
    const { result, rerender } = renderHook(() => useNow());
    const first = result.current.getTime();
    jest.setSystemTime(new Date(2026, 8, 21, 12, 0, 30));
    rerender(undefined);
    expect(result.current.getTime()).toBe(first);
  });

  it("refreshes on a minute interval, not more often", () => {
    // Modern fake timers advance the system clock together with the timers, so the elapsed
    // time is tracked purely via `advanceTimersByTime` (no manual `setSystemTime` in between).
    const { result } = renderHook(() => useNow());
    const first = result.current.getTime();

    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    // Under a minute since mount: no timer fired yet.
    expect(result.current.getTime()).toBe(first);

    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    // A full minute elapsed: the interval fired exactly once.
    expect(result.current.getTime()).toBe(new Date(2026, 8, 21, 12, 1, 0).getTime());
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

    it("refreshes immediately when the app becomes active, ahead of the interval", () => {
      const { result } = renderHook(() => useNow());
      const first = result.current.getTime();

      jest.setSystemTime(new Date(2026, 8, 21, 12, 0, 5));
      act(() => handler?.("active"));
      expect(result.current.getTime()).toBe(new Date(2026, 8, 21, 12, 0, 5).getTime());
      expect(result.current.getTime()).not.toBe(first);
    });

    it("ignores other app states", () => {
      const { result } = renderHook(() => useNow());
      const first = result.current.getTime();

      jest.setSystemTime(new Date(2026, 8, 21, 12, 0, 5));
      act(() => handler?.("background"));
      act(() => handler?.("inactive"));
      expect(result.current.getTime()).toBe(first);
    });

    it("stops the interval and the listener on unmount", () => {
      const { unmount } = renderHook(() => useNow());
      unmount();
      expect(remove).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
