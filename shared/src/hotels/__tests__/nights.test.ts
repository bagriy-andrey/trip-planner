import { describe, expect, it } from "vitest";
import { zonedDateTimeToInstant } from "../../segments/time";
import { HOTEL_MAX_NIGHTS, countNights, nightsBetweenDates } from "../nights";

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

describe("countNights", () => {
  it("counts calendar nights over the DST changes of Warsaw and New York", () => {
    const cases: [string, string, string, string, number][] = [
      ["Europe/Warsaw", "2026-03-28", "2026-03-30", "12:00", 2], // spring forward
      ["Europe/Warsaw", "2026-10-24", "2026-10-26", "12:00", 2], // fall back
      ["America/New_York", "2026-03-07", "2026-03-09", "12:00", 2],
      ["America/New_York", "2026-10-31", "2026-11-02", "12:00", 2],
    ];
    for (const [zone, from, to, time, expected] of cases) {
      const a = zonedDateTimeToInstant(from as "2026-01-01", time, zone);
      const b = zonedDateTimeToInstant(to as "2026-01-01", time, zone);
      expect(countNights(a, b, zone)).toBe(expected);
    }
  });

  it("23:30 to 00:30 next day is one night although one hour passed", () => {
    const zone = "Europe/Warsaw";
    const a = zonedDateTimeToInstant("2026-09-12", "23:30", zone);
    const b = zonedDateTimeToInstant("2026-09-13", "00:30", zone);
    expect(b.getTime() - a.getTime()).toBe(3600_000);
    expect(countNights(a, b, zone)).toBe(1);
  });

  it("the same pair of instants gives different nights in different zones", () => {
    const a = new Date("2026-09-12T22:30:00Z");
    const b = new Date("2026-09-12T23:30:00Z");
    expect(countNights(a, b, "Europe/Lisbon")).toBe(1); // 23:30 -> 00:30 next day
    expect(countNights(a, b, "America/New_York")).toBe(0); // 18:30 -> 19:30 same day
  });
});
