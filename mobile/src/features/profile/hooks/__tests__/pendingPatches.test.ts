import { EMPTY_PROFILE } from "@tripplanner/shared";

import { enqueue, overlay, settle } from "../pendingPatches";

describe("pending patches", () => {
  it("overlays patches in order; later wins; null clears; undefined keys are ignored", () => {
    const base = { ...EMPTY_PROFILE, citizenship: "PT", homeCurrency: "EUR" };
    let queue = enqueue([], { seq: 1, patch: { citizenship: "FR", homeCurrency: undefined } });
    queue = enqueue(queue, { seq: 2, patch: { citizenship: null } });
    expect(overlay(base, queue)).toEqual({ ...base, citizenship: null });
    expect(overlay(base, [])).toBe(base);
  });

  it("settle drops only the answered patch", () => {
    const queue = enqueue(enqueue([], { seq: 1, patch: { residence: "PT" } }), { seq: 2, patch: { residence: "FR" } });
    expect(settle(queue, 1).map((e) => e.seq)).toEqual([2]);
    expect(queue).toHaveLength(2);
  });
});
