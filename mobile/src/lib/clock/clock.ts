import { toCalendarDate } from "@tripplanner/shared";
import type { CalendarDate } from "@tripplanner/shared";

/** Where "today" comes from. Everything in `src/` asks `useToday()`, never the system clock. */
export interface ClockSource {
  today(): CalendarDate;
}

/**
 * A source over a "current instant" reader. `toCalendarDate` reads the LOCAL fields of the
 * instant, so "today" is the calendar day of the device's time zone (SPEC-03 Edge case), not
 * the UTC day. Injecting `now` lets a test pin an instant without patching the global `Date`.
 */
export function createClock(now: () => Date): ClockSource {
  return { today: () => toCalendarDate(now()) };
}

/** A source that always answers the same calendar date (tests, previews). */
export function fixedClock(date: CalendarDate): ClockSource {
  return { today: () => date };
}

/**
 * The real clock. This module and its siblings are the ONLY place in `src/` allowed to read the
 * system time (`new Date()` / `Date.now()`): AC-24, AC-64.
 */
export const realClock: ClockSource = createClock(() => new Date());
