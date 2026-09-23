import { compareCalendarDates } from "./calendarDate";
import type { CalendarDate } from "./calendarDate";

/** A date range being picked: nothing, only a start, or both ends. */
export interface PickedRange {
  start: CalendarDate | null;
  end: CalendarDate | null;
}

/**
 * One tap on a day of a range calendar. The first tap sets the start, the second the end; a
 * second tap on an EARLIER day moves the start instead (the range never runs backwards), and a
 * tap on the same day gives a one-day range. Tapping again after a complete range starts over.
 */
export function pickRangeDate(current: PickedRange, tapped: CalendarDate): PickedRange {
  if (current.start === null || current.end !== null) return { start: tapped, end: null };
  if (compareCalendarDates(tapped, current.start) < 0) return { start: tapped, end: null };
  return { start: current.start, end: tapped };
}

/** A month in a calendar: `month` is 1-12. */
export interface YearMonth {
  year: number;
  month: number;
}

/** `ym` shifted by `delta` whole months (negative goes back). */
export function shiftMonth(ym: YearMonth, delta: number): YearMonth {
  const index = ym.year * 12 + (ym.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/**
 * The weeks of a month as rows of 7 cells; `null` pads the days of the neighbouring months.
 * `weekStart` is the first column's weekday: 0 = Sunday, 1 = Monday.
 */
export function monthGrid(ym: YearMonth, weekStart: 0 | 1): (CalendarDate | null)[][] {
  const first = new Date(Date.UTC(2000, ym.month - 1, 1));
  first.setUTCFullYear(ym.year);
  const lead = (first.getUTCDay() - weekStart + 7) % 7;
  const last = new Date(Date.UTC(2000, ym.month, 0));
  last.setUTCFullYear(ym.year, ym.month, 0);
  const days = last.getUTCDate();

  const cells: (CalendarDate | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= days; day++) {
    cells.push(`${pad(ym.year, 4)}-${pad(ym.month, 2)}-${pad(day, 2)}` as CalendarDate);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (CalendarDate | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
