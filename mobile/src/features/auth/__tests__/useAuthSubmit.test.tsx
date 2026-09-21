import { act, renderHook } from "@testing-library/react-native";

import { useAuthSubmit } from "../hooks/useAuthSubmit";
import { deferred } from "./testKit";

jest.mock("../api", () => ({}));

describe("useAuthSubmit (AC-14, AC-19)", () => {
  it("runs one task for repeated calls while it is in flight", async () => {
    const pending = deferred<string>();
    const task = jest.fn(() => pending.promise);
    const { result } = renderHook(() => useAuthSubmit());

    let first!: Promise<string | undefined>;
    let second: string | undefined = "not-set";
    await act(async () => {
      first = result.current.run(task);
      second = await result.current.run(task);
      await result.current.run(task);
    });
    expect(task).toHaveBeenCalledTimes(1);
    expect(second).toBeUndefined();
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      pending.resolve("done");
      await first;
    });
    expect(await first).toBe("done");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("is submittable again after the task ends, also after a failure result (one-tap retry)", async () => {
    const task = jest.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true });
    const { result } = renderHook(() => useAuthSubmit());
    await act(async () => {
      await result.current.run(task);
    });
    expect(result.current.isSubmitting).toBe(false);
    await act(async () => {
      await result.current.run(task);
    });
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("resets the guard even if a task throws", async () => {
    const { result } = renderHook(() => useAuthSubmit());
    await act(async () => {
      await result.current.run(() => Promise.reject(new Error("boom"))).catch(() => undefined);
    });
    expect(result.current.isSubmitting).toBe(false);
    const task = jest.fn().mockResolvedValue(1);
    await act(async () => {
      await result.current.run(task);
    });
    expect(task).toHaveBeenCalledTimes(1);
  });
});
