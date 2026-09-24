import { describe, expect, it } from "vitest";
import { HOTEL_MAX_NIGHTS, nightsBetweenDates } from "../nights";

describe("nightsBetweenDates", () => {
  it("is 0 for the same day", () => {
    expect(nightsBetweenDates("2026-09-12", "2026-09-12")).toBe(0);
  });
  it("counts calendar days across DST changes", () => {
    expect(nightsBetweenDates("2026-03-28", "2026-03-30")).toBe(2);
    expect(nightsBetweenDates("2026-10-24", "2026-10-26")).toBe(2);
  });
  it("can be negative", () => {
    expect(nightsBetweenDates("2026-09-12", "2026-09-10")).toBe(-2);
  });
  it("max is 365", () => {
    expect(HOTEL_MAX_NIGHTS).toBe(365);
  });
});
