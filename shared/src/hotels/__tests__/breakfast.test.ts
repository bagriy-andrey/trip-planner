import { describe, expect, it } from "vitest";
import { breakfastDaysRange, clampBreakfastDays } from "../breakfast";

describe("breakfastDaysRange", () => {
  it("unknown nights give 1..30", () => {
    expect(breakfastDaysRange(null)).toEqual({ min: 1, max: 30 });
  });
  it("0 and 1 nights give 1..1", () => {
    expect(breakfastDaysRange(0)).toEqual({ min: 1, max: 1 });
    expect(breakfastDaysRange(1)).toEqual({ min: 1, max: 1 });
  });
  it("5 nights give 1..4", () => {
    expect(breakfastDaysRange(5)).toEqual({ min: 1, max: 4 });
  });
});

describe("clampBreakfastDays", () => {
  it("clamps down and up", () => {
    expect(clampBreakfastDays(10, 5)).toBe(4);
    expect(clampBreakfastDays(0, 5)).toBe(1);
    expect(clampBreakfastDays(-3, null)).toBe(1);
    expect(clampBreakfastDays(99, null)).toBe(30);
    expect(clampBreakfastDays(3, 5)).toBe(3);
  });
});
