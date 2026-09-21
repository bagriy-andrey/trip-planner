import { describe, expect, it } from "vitest";
import {
  addDays,
  compareCalendarDates,
  daysBetween,
  isCalendarDate,
  nightsBetween,
  toCalendarDate,
  type CalendarDate,
} from "../../index";

const d = (value: string): CalendarDate => {
  if (!isCalendarDate(value)) throw new Error(`test fixture is not a calendar date: ${value}`);
  return value;
};

describe("isCalendarDate (AC-16)", () => {
  it.each(["2026-09-12", "2024-02-29", "0001-01-01", "9999-12-31"])("accepts %s", (value) => {
    expect(isCalendarDate(value)).toBe(true);
  });

  it.each([
    "2026-09-12T10:00:00Z",
    "2026-09-12T00:00:00",
    "2026-09-12 10:00",
    "2026-09-12Z",
    "2026-9-12",
    "26-09-12",
    "2026/09/12",
    "12.09.2026",
    "2026-13-01",
    "2026-00-10",
    "2026-09-00",
    "2026-09-31",
    "2025-02-29",
    "2026-02-30",
    "0000-01-01",
    " 2026-09-12",
    "",
  ])("rejects %j", (value) => {
    expect(isCalendarDate(value)).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isCalendarDate(null)).toBe(false);
    expect(isCalendarDate(undefined)).toBe(false);
    expect(isCalendarDate(20260912)).toBe(false);
    expect(isCalendarDate(new Date(2026, 8, 12))).toBe(false);
  });

  it("is a string type the mobile formatters take without a cast", () => {
    const value: CalendarDate = d("2026-09-12");
    const asString: string = value;
    expect(asString).toBe("2026-09-12");
  });
});

describe("toCalendarDate", () => {
  it("reads the LOCAL year/month/day of the Date (the device's zone decides 'today')", () => {
    expect(toCalendarDate(new Date(2026, 8, 12, 23, 59, 59))).toBe("2026-09-12");
    expect(toCalendarDate(new Date(2026, 8, 12, 0, 0, 0))).toBe("2026-09-12");
    expect(toCalendarDate(new Date(2026, 0, 1, 0, 0, 1))).toBe("2026-01-01");
    expect(toCalendarDate(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
  });

  it("zero-pads month and day", () => {
    expect(toCalendarDate(new Date(2026, 2, 5))).toBe("2026-03-05");
  });

  it("throws on an invalid Date", () => {
    expect(() => toCalendarDate(new Date(Number.NaN))).toThrow(RangeError);
  });
});

describe("addDays", () => {
  it("adds and subtracts days across month and year boundaries", () => {
    expect(addDays(d("2026-09-12"), 0)).toBe("2026-09-12");
    expect(addDays(d("2026-09-12"), 1)).toBe("2026-09-13");
    expect(addDays(d("2026-09-30"), 1)).toBe("2026-10-01");
    expect(addDays(d("2026-12-31"), 1)).toBe("2027-01-01");
    expect(addDays(d("2027-01-01"), -1)).toBe("2026-12-31");
    expect(addDays(d("2026-03-01"), -1)).toBe("2026-02-28");
  });

  it("knows leap years", () => {
    expect(addDays(d("2024-02-28"), 1)).toBe("2024-02-29");
    expect(addDays(d("2024-02-29"), 1)).toBe("2024-03-01");
    expect(addDays(d("2025-02-28"), 1)).toBe("2025-03-01");
    expect(addDays(d("2100-02-28"), 1)).toBe("2100-03-01"); // 2100 is not a leap year
    expect(addDays(d("2000-02-28"), 1)).toBe("2000-02-29"); // 2000 is
  });

  it("adds 365 / 366 days", () => {
    expect(addDays(d("2026-01-01"), 365)).toBe("2027-01-01");
    expect(addDays(d("2024-01-01"), 366)).toBe("2025-01-01");
  });

  it("rejects a non-integer shift and a result outside years 1..9999", () => {
    expect(() => addDays(d("2026-01-01"), 1.5)).toThrow(RangeError);
    expect(() => addDays(d("9999-12-31"), 1)).toThrow(RangeError);
    expect(() => addDays(d("0001-01-01"), -1)).toThrow(RangeError);
  });
});

describe("daysBetween / nightsBetween (AC-25)", () => {
  it("is 0 when both dates are the same day (0 nights)", () => {
    expect(daysBetween(d("2026-09-12"), d("2026-09-12"))).toBe(0);
    expect(nightsBetween(d("2026-09-12"), d("2026-09-12"))).toBe(0);
  });

  it("counts within a month", () => {
    expect(nightsBetween(d("2026-09-12"), d("2026-09-18"))).toBe(6);
  });

  it("counts across a month change", () => {
    expect(nightsBetween(d("2026-09-28"), d("2026-10-03"))).toBe(5);
    expect(nightsBetween(d("2026-01-31"), d("2026-02-01"))).toBe(1);
  });

  it("counts across a year change", () => {
    expect(nightsBetween(d("2026-12-30"), d("2027-01-02"))).toBe(3);
  });

  it("counts across 29 February of a leap year", () => {
    expect(nightsBetween(d("2024-02-28"), d("2024-03-01"))).toBe(2);
    expect(nightsBetween(d("2024-02-29"), d("2024-03-01"))).toBe(1);
    expect(nightsBetween(d("2024-02-28"), d("2024-02-29"))).toBe(1);
    // the same span in a non-leap year is one day shorter
    expect(nightsBetween(d("2025-02-28"), d("2025-03-01"))).toBe(1);
  });

  it("counts a whole leap year as 366 and a normal one as 365", () => {
    expect(daysBetween(d("2024-01-01"), d("2025-01-01"))).toBe(366);
    expect(daysBetween(d("2025-01-01"), d("2026-01-01"))).toBe(365);
  });

  it("is negative when `to` is earlier (the schema rejects that before it is ever shown)", () => {
    expect(daysBetween(d("2026-09-12"), d("2026-09-10"))).toBe(-2);
  });

  it("agrees with addDays for every shift in a long run", () => {
    const start = d("2023-12-01");
    for (let n = -800; n <= 800; n += 7) {
      expect(daysBetween(start, addDays(start, n))).toBe(n);
    }
  });
});

describe("compareCalendarDates", () => {
  it("orders chronologically", () => {
    expect(compareCalendarDates(d("2026-09-12"), d("2026-09-13"))).toBe(-1);
    expect(compareCalendarDates(d("2026-09-13"), d("2026-09-12"))).toBe(1);
    expect(compareCalendarDates(d("2026-09-12"), d("2026-09-12"))).toBe(0);
    expect(compareCalendarDates(d("2025-12-31"), d("2026-01-01"))).toBe(-1);
    expect(compareCalendarDates(d("0999-01-01"), d("1000-01-01"))).toBe(-1);
  });
});
