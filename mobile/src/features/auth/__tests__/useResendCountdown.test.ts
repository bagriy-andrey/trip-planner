import { act, renderHook } from "@testing-library/react-native";

import { RESEND_COOLDOWN_SECONDS, useResendCountdown } from "../hooks/useResendCountdown";

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-09-21T10:00:00Z"));
});

afterEach(() => {
  jest.useRealTimers();
});

const tick = (ms: number) => act(() => jest.advanceTimersByTime(ms));

describe("useResendCountdown (SPEC-02 AC-33)", () => {
  it("uses a 60 second cooldown", () => {
    expect(RESEND_COOLDOWN_SECONDS).toBe(60);
  });

  it("is unlocked until a send starts it", () => {
    const { result } = renderHook(() => useResendCountdown());
    expect(result.current).toMatchObject({ remaining: 0, isLocked: false });
  });

  it("locks for 60 s after start, shows the remaining time, then unlocks", () => {
    const { result } = renderHook(() => useResendCountdown());
    act(() => result.current.start());
    expect(result.current).toMatchObject({ remaining: 60, isLocked: true });

    tick(1000);
    expect(result.current.remaining).toBe(59);
    tick(29_000);
    expect(result.current).toMatchObject({ remaining: 30, isLocked: true });
    tick(29_000);
    expect(result.current).toMatchObject({ remaining: 1, isLocked: true });
    tick(1000);
    expect(result.current).toMatchObject({ remaining: 0, isLocked: false });
  });

  it("stays unlocked after the cooldown and stops ticking", () => {
    const { result } = renderHook(() => useResendCountdown());
    act(() => result.current.start());
    tick(60_000);
    expect(result.current.isLocked).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
    tick(120_000);
    expect(result.current.remaining).toBe(0);
  });

  it("locks again when started a second time", () => {
    const { result } = renderHook(() => useResendCountdown());
    act(() => result.current.start());
    tick(60_000);
    act(() => result.current.start());
    expect(result.current).toMatchObject({ remaining: 60, isLocked: true });
  });

  it("starts already running from the time of the last send", () => {
    const sentAt = Date.now() - 15_000;
    const { result } = renderHook(() => useResendCountdown(sentAt));
    expect(result.current).toMatchObject({ remaining: 45, isLocked: true });
    tick(45_000);
    expect(result.current.isLocked).toBe(false);
  });

  it("is unlocked when the last send is older than the cooldown", () => {
    const { result } = renderHook(() => useResendCountdown(Date.now() - 61_000));
    expect(result.current.isLocked).toBe(false);
  });

  it("clears its timer on unmount", () => {
    const { result, unmount } = renderHook(() => useResendCountdown());
    act(() => result.current.start());
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
