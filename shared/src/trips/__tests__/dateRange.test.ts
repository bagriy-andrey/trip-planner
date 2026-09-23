import { describe, expect, it } from "vitest";

import { monthGrid, pickRangeDate, shiftMonth } from "../dateRange";

describe("pickRangeDate", () => {
  it("first tap sets the start, second the end", () => {
    const one = pickRangeDate({ start: null, end: null }, "2026-10-05");
    expect(one).toEqual({ start: "2026-10-05", end: null });
    expect(pickRangeDate(one, "2026-10-12")).toEqual({ start: "2026-10-05", end: "2026-10-12" });
  });
  it("a second tap on the same day is a one-day range", () => {
    expect(pickRangeDate({ start: "2026-10-05", end: null }, "2026-10-05")).toEqual({
      start: "2026-10-05",
      end: "2026-10-05",
    });
  });
  it("an earlier second tap moves the start instead of running backwards", () => {
    expect(pickRangeDate({ start: "2026-10-05", end: null }, "2026-10-01")).toEqual({ start: "2026-10-01", end: null });
  });
  it("a tap after a complete range starts over", () => {
    expect(pickRangeDate({ start: "2026-10-05", end: "2026-10-12" }, "2026-11-01")).toEqual({
      start: "2026-11-01",
      end: null,
    });
  });
});

describe("shiftMonth", () => {
  it("crosses year boundaries both ways", () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth({ year: 2026, month: 3 }, 0)).toEqual({ year: 2026, month: 3 });
  });
});

describe("monthGrid", () => {
  it("pads to full weeks, Monday first (Oct 2026 starts on a Thursday)", () => {
    const weeks = monthGrid({ year: 2026, month: 10 }, 1);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0]!.slice(0, 3)).toEqual([null, null, null]);
    expect(weeks[0]![3]).toBe("2026-10-01");
    expect(weeks.flat().filter((d) => d !== null)).toHaveLength(31);
  });
  it("Sunday first shifts the lead padding", () => {
    expect(monthGrid({ year: 2026, month: 10 }, 0)[0]!.slice(0, 5)).toEqual([null, null, null, null, "2026-10-01"]);
  });
  it("handles a leap February", () => {
    const days = monthGrid({ year: 2028, month: 2 }, 1).flat().filter((d) => d !== null);
    expect(days).toHaveLength(29);
    expect(days.at(-1)).toBe("2028-02-29");
  });
});
