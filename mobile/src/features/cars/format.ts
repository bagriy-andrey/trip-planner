// Pure display formatters over the `car` i18n namespace and Intl. Dates are calendar dates and
// times are wall-clock; nothing here does calendar arithmetic or zone conversion (the only date
// maths is the weekday of a calendar date, via UTC).

import type { TFunction } from "i18next";

import { formatClockTime } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n";

/** `t` bound to the `car` namespace (`useTranslation("car").t` / `i18n.getFixedT(locale, "car")`). */
export type CarT = TFunction<"car">;

/** Keys with interpolated month/weekday numbers are built at runtime, so `t` is used untyped. */
function tr(t: CarT, key: string, options?: Record<string, unknown>): string {
  return (t as unknown as (k: string, o?: Record<string, unknown>) => string)(key, options);
}

interface Ymd {
  y: number;
  m: number;
  d: number;
}

function parseYmd(date: string): Ymd {
  const [y = 0, m = 1, d = 1] = date.split("-").map(Number);
  return { y, m, d };
}

function monthName(t: CarT, m: number): string {
  return tr(t, `dates.month.${m}`);
}

/** "19 авг" / "Aug 19". */
export function formatRentalDay(t: CarT, date: string): string {
  const { m, d } = parseYmd(date);
  return tr(t, "dates.dayMonth", { day: d, month: monthName(t, m) });
}

/** The one "Dates" value: same month, same year, or across years (AC-15). */
export function formatRentalRange(t: CarT, start: string, end: string): string {
  const a = parseYmd(start);
  const b = parseYmd(end);
  if (a.y !== b.y) {
    return tr(t, "dates.range.crossYear", {
      d1: a.d,
      m1: monthName(t, a.m),
      y1: a.y,
      d2: b.d,
      m2: monthName(t, b.m),
      y2: b.y,
    });
  }
  if (a.m !== b.m) {
    return tr(t, "dates.range.sameYear", {
      d1: a.d,
      m1: monthName(t, a.m),
      d2: b.d,
      m2: monthName(t, b.m),
      y: a.y,
    });
  }
  return tr(t, "dates.range.sameMonth", { d1: a.d, d2: b.d, m: monthName(t, a.m), y: a.y });
}

/** "19 авг, 11:00" (card). */
export function formatCardMoment(t: CarT, locale: Locale, date: string, time: string): string {
  return tr(t, "dates.cardMoment", { date: formatRentalDay(t, date), time: formatClockTime(locale, time) });
}

/** "Ср, 19 авг · 11:00" (S17). */
export function formatViewMoment(t: CarT, locale: Locale, date: string, time: string): string {
  const { y, m, d } = parseYmd(date);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return tr(t, "dates.viewMoment", {
    weekday: tr(t, `dates.weekday.${weekday}`),
    date: formatRentalDay(t, date),
    time: formatClockTime(locale, time),
  });
}

/** Display only: two fraction digits in the locale's grouping. `amount` is the canonical "12.50". */
export function formatMoneyAmount(locale: Locale, amount: string): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(amount),
  );
}
