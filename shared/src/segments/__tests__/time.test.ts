import { describe, expect, it } from "vitest";
import type { CalendarDate } from "../../trips/calendarDate";
import { instantToZonedParts, isClockTime, zonedDateTimeToInstant } from "../time";

describe("zonedDateTimeToInstant (AC-29)", () => {
  it.each<[string, CalendarDate, string, string, string]>([
    ["positive offset (UTC+2, Warsaw summer)", "2026-06-15", "14:30", "Europe/Warsaw", "2026-06-15T12:30:00.000Z"],
    ["positive offset (UTC+9, Tokyo)", "2026-01-10", "09:00", "Asia/Tokyo", "2026-01-10T00:00:00.000Z"],
    ["negative offset (UTC-5, New York winter)", "2026-01-10", "09:00", "America/New_York", "2026-01-10T14:00:00.000Z"],
    ["negative offset (UTC-8, Los Angeles winter)", "2026-01-10", "09:00", "America/Los_Angeles", "2026-01-10T17:00:00.000Z"],
    ["zero offset (UTC)", "2026-01-10", "09:00", "UTC", "2026-01-10T09:00:00.000Z"],
    ["large positive offset (UTC+14, Kiritimati)", "2026-01-01", "00:00", "Pacific/Kiritimati", "2025-12-31T10:00:00.000Z"],
    ["half-hour offset (UTC+5:30, Kolkata)", "2026-03-01", "10:15", "Asia/Kolkata", "2026-03-01T04:45:00.000Z"],
  ])("%s", (_label, date, time, zone, expectedIso) => {
    expect(zonedDateTimeToInstant(date, time, zone).toISOString()).toBe(expectedIso);
  });

  describe("DST — spring-forward gap (nonexistent local time), resolved to the offset BEFORE the transition", () => {
    it("America/New_York: 2023-03-12 02:00->03:00 gap; 02:30 resolves past the gap (effectively 03:30 EDT)", () => {
      const instant = zonedDateTimeToInstant("2023-03-12", "02:30", "America/New_York");
      expect(instant.toISOString()).toBe("2023-03-12T07:30:00.000Z");
      // Reading it back through the real (post-transition) zone rules shows it landed forward of the gap.
      expect(instantToZonedParts(instant, "America/New_York")).toEqual({ date: "2023-03-12", time: "03:30" });
    });

    it("the boundary just before the gap (01:59) is unaffected", () => {
      const instant = zonedDateTimeToInstant("2023-03-12", "01:59", "America/New_York");
      expect(instant.toISOString()).toBe("2023-03-12T06:59:00.000Z");
    });

    it("Europe/Warsaw: 2026-03-29 02:00->03:00 gap; 02:30 resolves past the gap (03:30 CEST)", () => {
      const instant = zonedDateTimeToInstant("2026-03-29", "02:30", "Europe/Warsaw");
      expect(instant.toISOString()).toBe("2026-03-29T01:30:00.000Z");
      expect(instantToZonedParts(instant, "Europe/Warsaw")).toEqual({ date: "2026-03-29", time: "03:30" });
    });
  });

  describe("DST — fall-back doubled hour (ambiguous local time), resolved to the FIRST occurrence (Q-E)", () => {
    it("America/New_York: 2023-11-05 02:00 EDT->01:00 EST; 01:30 resolves to the EARLIER (EDT) instant", () => {
      const instant = zonedDateTimeToInstant("2023-11-05", "01:30", "America/New_York");
      // EDT (-4h) occurrence: 05:30 UTC, chronologically first; the later EST (-5h) one is 06:30 UTC.
      expect(instant.toISOString()).toBe("2023-11-05T05:30:00.000Z");
    });

    it("Europe/Warsaw: 2026-10-25 03:00 CEST->02:00 CET; 02:30 resolves to the EARLIER (CEST) instant", () => {
      const instant = zonedDateTimeToInstant("2026-10-25", "02:30", "Europe/Warsaw");
      expect(instant.toISOString()).toBe("2026-10-25T00:30:00.000Z");
    });

    it("an unambiguous time on the same fall-back day round-trips normally", () => {
      const instant = zonedDateTimeToInstant("2023-11-05", "10:00", "America/New_York");
      expect(instantToZonedParts(instant, "America/New_York")).toEqual({ date: "2023-11-05", time: "10:00" });
    });
  });

  it("Tokyo -> Los Angeles: local arrival clock reads EARLIER than local departure clock, but the real duration is still positive and under 48h", () => {
    // A same-day-ish flight crossing the date line: departs Tokyo 18:00, "arrives" LA 11:00 the same
    // calendar day by the wall clock, but LA is behind Tokyo by 17h, so the real elapsed time is ~10h.
    const departureAt = zonedDateTimeToInstant("2026-04-10", "18:00", "Asia/Tokyo");
    const arrivalAt = zonedDateTimeToInstant("2026-04-10", "11:00", "America/Los_Angeles");
    const durationMs = arrivalAt.getTime() - departureAt.getTime();
    expect(durationMs).toBeGreaterThan(0);
    expect(durationMs).toBeLessThan(48 * 60 * 60 * 1000);
  });

  it("throws on a malformed date or time (callers pass already-validated values)", () => {
    expect(() => zonedDateTimeToInstant("2026-02-30" as CalendarDate, "10:00", "UTC")).toThrow(RangeError);
    expect(() => zonedDateTimeToInstant("2026-02-10" as CalendarDate, "25:00", "UTC")).toThrow(RangeError);
  });
});

describe("instantToZonedParts (AC-42, AC-53, AC-55)", () => {
  it("reads the local calendar date and time of an instant in a given zone", () => {
    const instant = new Date("2026-06-15T12:30:00.000Z");
    expect(instantToZonedParts(instant, "Europe/Warsaw")).toEqual({ date: "2026-06-15", time: "14:30" });
    expect(instantToZonedParts(instant, "America/New_York")).toEqual({ date: "2026-06-15", time: "08:30" });
  });

  it("a landing just after local midnight lands on the NEXT local day", () => {
    // 23:50 UTC is 00:50 the next day in Warsaw (UTC+1 in this non-DST example... use a fixed +2 case).
    const instant = new Date("2026-06-15T22:15:00.000Z");
    expect(instantToZonedParts(instant, "Europe/Warsaw")).toEqual({ date: "2026-06-16", time: "00:15" });
  });

  it("round-trips through zonedDateTimeToInstant for an unambiguous time", () => {
    const instant = zonedDateTimeToInstant("2026-09-01", "07:45", "Pacific/Kiritimati");
    expect(instantToZonedParts(instant, "Pacific/Kiritimati")).toEqual({ date: "2026-09-01", time: "07:45" });
  });
});

describe("isClockTime", () => {
  it.each(["00:00", "23:59", "09:05"])("accepts %s", (value) => {
    expect(isClockTime(value)).toBe(true);
  });

  it.each(["24:00", "9:05", "09:60", "", "10:00:00", "noon", null, undefined, 900])("rejects %s", (value) => {
    expect(isClockTime(value)).toBe(false);
  });
});
