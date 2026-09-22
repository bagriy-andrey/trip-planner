import { i18n } from "./i18n";
import type { Locale } from "./resolveLocale";

// Everything here is a pure function of its arguments: the locale and the
// reference "now" are passed in (never read from the device), so results are
// deterministic and testable without mocking time or the device language.
//
// Dates are absolute instants rendered in `timeZone` (default UTC, matching how
// the product stores time: UTC + IANA tz id). Relative labels ("in 5 days")
// use i18next plural keys rather than Intl.RelativeTimeFormat, whose coverage
// in Hermes is unverified for `ru` (PLAN-01 R-3).

const DAY_MS = 24 * 60 * 60 * 1000;

function dateFormat(locale: Locale, options: Intl.DateTimeFormatOptions, timeZone: string) {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone });
}

/** "12–18 сент. 2026 г." / "Sep 12 – 18, 2026" — locale-owned range layout. */
export function formatDateRange(locale: Locale, start: Date, end: Date, timeZone = "UTC"): string {
  const formatter = dateFormat(locale, { day: "numeric", month: "short", year: "numeric" }, timeZone);
  // Hermes' Intl may lack formatRange; degrade to two full dates rather than throw.
  if (typeof formatter.formatRange === "function") return formatter.formatRange(start, end);
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

/** "12 сент." / "Sep 12". */
export function formatShortDate(locale: Locale, date: Date, timeZone = "UTC"): string {
  return dateFormat(locale, { day: "numeric", month: "short" }, timeZone).format(date);
}

/** "07:40" / "7:40 AM" — clock time in the locale's preferred hour cycle. */
export function formatTime(locale: Locale, date: Date, timeZone = "UTC"): string {
  return dateFormat(locale, { hour: "numeric", minute: "2-digit" }, timeZone).format(date);
}

/** "6 ночей" / "6 nights" — plural form chosen by i18next. */
export function formatNights(locale: Locale, nights: number): string {
  return i18n.getFixedT(locale, "common")("nights", { count: nights });
}

// --- Calendar dates ("YYYY-MM-DD", no time, no zone) -------------------------------------------
//
// A trip's start/end are calendar dates, not instants. They are turned into
// `Date.UTC(y, m, d)` and rendered with `timeZone: "UTC"`; going through the
// device zone (`new Date("2026-09-12")` read with local getters, or formatting
// in the local zone) shifts the day by one in negative-offset zones.

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** UTC-midnight `Date` of a "YYYY-MM-DD" string. Throws on a malformed or non-existent date. */
function calendarDateToUtc(value: string): Date {
  const match = CALENDAR_DATE.exec(value);
  if (!match) throw new RangeError(`Not a calendar date (YYYY-MM-DD): "${value}"`);
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC rolls 2026-02-30 over to March 2 — reject it instead of showing a wrong day.
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new RangeError(`Not an existing calendar date: "${value}"`);
  }
  return date;
}

/** "12 сент. 2026 г." / "Sep 12, 2026" — one calendar date, year included. */
export function formatCalendarDate(locale: Locale, date: string): string {
  return dateFormat(locale, { day: "numeric", month: "short", year: "numeric" }, "UTC").format(
    calendarDateToUtc(date),
  );
}

/** "12–18 сент. 2026 г." / "Sep 12 – 18, 2026" over two calendar dates; one date when they are equal. */
export function formatCalendarRange(locale: Locale, start: string, end: string): string {
  return formatDateRange(locale, calendarDateToUtc(start), calendarDateToUtc(end), "UTC");
}

/**
 * Header line of a trip: the range plus the number of nights, composed by the
 * locale-owned `common:dates.line` template ("12–18 сент. 2026 г. · 6 ночей").
 * Nights = whole calendar days between the dates (0 when both are the same day).
 */
export function formatTripDateLine(locale: Locale, start: string, end: string): string {
  const nights = Math.round((calendarDateToUtc(end).getTime() - calendarDateToUtc(start).getTime()) / DAY_MS);
  return i18n.getFixedT(locale, "common")("dates.line", {
    range: formatCalendarRange(locale, start, end),
    nights: formatNights(locale, nights),
  });
}

/** Whole calendar days from `now` to `target` in UTC (midnight crossings count). */
function calendarDaysBetween(now: Date, target: Date): number {
  const startOfDay = (date: Date) =>
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.round((startOfDay(target) - startOfDay(now)) / DAY_MS);
}

/**
 * Status label for a trip starting at `target`, relative to `now`:
 * before today -> "завершено"/"completed", today -> "сегодня"/"today",
 * otherwise "через N дней"/"in N days" (plural-aware).
 */
export function formatRelativeDays(locale: Locale, target: Date, now: Date): string {
  const t = i18n.getFixedT(locale, "common");
  const days = calendarDaysBetween(now, target);
  if (days < 0) return t("status.completed");
  if (days === 0) return t("status.today");
  return t("status.inDays", { count: days });
}
