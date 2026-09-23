import { toCalendarDate } from "@tripplanner/shared";
import type { CalendarDate } from "@tripplanner/shared";

/** Where "today" comes from. Everything in `src/` asks `useToday()`, never the system clock. */
export interface ClockSource {
  today(): CalendarDate;
  now(): Date;
}

/**
 * A source over a "current instant" reader. `toCalendarDate` reads the LOCAL fields of the
 * instant, so "today" is the calendar day of the device's time zone (SPEC-03 Edge case), not
 * the UTC day. Injecting `now` lets a test pin an instant without patching the global `Date`.
 */
export function createClock(now: () => Date): ClockSource {
  return { today: () => toCalendarDate(now()), now };
}

/**
 * A source that always answers the same calendar date (tests, previews). Its instant is 14h before
 * that day starts in UTC, i.e. before the day has begun anywhere on Earth, so "any time on the
 * pinned day" is never in the past whatever the zone.
 */
export function fixedClock(date: CalendarDate): ClockSource {
  const instant = new Date(Date.parse(`${date}T00:00:00Z`) - 14 * 60 * 60 * 1000);
  return { today: () => date, now: () => new Date(instant.getTime()) };
}

/**
 * The real clock. This module and its siblings are the ONLY place in `src/` allowed to read the
 * system time (`new Date()` / `Date.now()`): AC-24, AC-64.
 */
export const realClock: ClockSource = createClock(() => new Date());
