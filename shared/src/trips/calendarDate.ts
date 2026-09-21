/**
 * Calendar dates: the day on the wall, no time and no time zone ("2026-09-12").
 *
 * A trip's start/end are calendar dates, not instants. Everything here is integer arithmetic on
 * (year, month, day) — `Date` is used only by `toCalendarDate`, and only to read the caller's
 * LOCAL fields. Nothing in this module reads the clock: "today" is always passed in.
 */

/**
 * "YYYY-MM-DD". A template-literal type: assignable to `string` (so the mobile formatters accept it
 * without casts) but a plain `string` is not assignable to it — narrow with `isCalendarDate`.
 */
export type CalendarDate = `${number}-${number}-${number}`;

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

function parts(value: string): { year: number; month: number; day: number } | undefined {
  const match = CALENDAR_DATE.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return undefined;
  }
  return { year, month, day };
}

/** True for an existing calendar date in exactly `YYYY-MM-DD` (no time, no zone, no rollover). */
export function isCalendarDate(value: unknown): value is CalendarDate {
  return typeof value === "string" && parts(value) !== undefined;
}

// Days since 1970-01-01 <-> civil date (Howard Hinnant's algorithms; proleptic Gregorian).
function daysFromCivil(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (month > 2 ? month - 3 : month + 9) + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function civilFromDays(days: number): { year: number; month: number; day: number } {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  return { year: yoe + era * 400 + (month <= 2 ? 1 : 0), month, day };
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

function format(year: number, month: number, day: number): CalendarDate {
  if (year < 1 || year > 9999) {
    throw new RangeError(`Calendar date out of range (year 1..9999): ${year}`);
  }
  const text = `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
  if (!isCalendarDate(text)) {
    throw new RangeError(`Not a calendar date: ${text}`);
  }
  return text;
}

function dayNumber(date: CalendarDate): number {
  const p = parts(date);
  if (!p) throw new RangeError(`Not a calendar date (YYYY-MM-DD): "${date}"`);
  return daysFromCivil(p.year, p.month, p.day);
}

/**
 * The calendar date on the wall of `date` in the DEVICE's zone (LOCAL year/month/day fields), so
 * "today" follows the user's clock zone (spec Edge case). Throws on an invalid `Date`.
 */
export function toCalendarDate(date: Date): CalendarDate {
  if (Number.isNaN(date.getTime())) throw new RangeError("Invalid Date");
  return format(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** `date` shifted by `days` whole calendar days (negative goes back). */
export function addDays(date: CalendarDate, days: number): CalendarDate {
  if (!Number.isInteger(days)) throw new RangeError(`addDays needs an integer, got ${days}`);
  const { year, month, day } = civilFromDays(dayNumber(date) + days);
  return format(year, month, day);
}

/** Whole calendar days from `from` to `to`: positive when `to` is later, 0 for the same day. */
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  return dayNumber(to) - dayNumber(from);
}

/** -1 / 0 / 1 — chronological order of two calendar dates. */
export function compareCalendarDates(a: CalendarDate, b: CalendarDate): -1 | 0 | 1 {
  // Fixed-width zero-padded "YYYY-MM-DD" sorts lexicographically as it does chronologically.
  return a < b ? -1 : a > b ? 1 : 0;
}
