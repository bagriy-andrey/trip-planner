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

/** "12 сент." / "Sep 12" — a calendar date without the year (hotel cards). */
export function formatCalendarDay(locale: Locale, date: string): string {
  return formatShortDate(locale, calendarDateToUtc(date), "UTC");
}

/** "15:00" / "3:00 PM" — a wall-clock "HH:MM" of a place; no zone conversion (local to the hotel by definition). */
export function formatClockTime(locale: Locale, time: string): string {
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  return formatTime(locale, new Date(Date.UTC(2000, 0, 1, hour, minute)), "UTC");
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

// --- Transport (route chain: durations, stopovers, local segment time) ------------------------

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/**
 * "1 ч 05 мин" / "1 h 05 min" — whole minutes rounded, abbreviated units (never
 * grammatically declined, so a single non-plural template covers every locale).
 * Below one hour: "45 мин" / "45 min" (no leading "0 ч").
 */
export function formatDuration(locale: Locale, ms: number): string {
  const totalMinutes = Math.round(Math.abs(ms) / MINUTE_MS);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const t = i18n.getFixedT(locale, "transport");
  if (hours === 0) return t("duration.minutesOnly", { minutes: String(minutes) });
  return t("duration.hoursMinutes", { hours: String(hours), minutes: String(minutes).padStart(2, "0") });
}

/**
 * "5 дней в Порту" / "5 days in Porto" — a stopover between two segments.
 * `cityName` is supplied pre-formatted (grammatical case is the caller's concern,
 * this function only picks the plural category for `days`).
 */
export function formatStopoverDays(locale: Locale, days: number, cityName: string): string {
  return i18n.getFixedT(locale, "transport")("gap.stopover", { count: days, city: cityName });
}

/**
 * "12 сент., 07:40" — a segment's date and clock time in the LOCAL zone of its own
 * airport. Unlike the trip-level formatters above, there is no UTC default here:
 * a card that forgets to pass a zone shows the wrong wall-clock time for that
 * airport (mobile/insights.md), so `timeZone` is a required argument.
 */
export function formatSegmentDateTime(locale: Locale, instant: Date, timeZone: string): string {
  return dateFormat(
    locale,
    { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" },
    timeZone,
  ).format(instant);
}
