import { instantToZonedParts } from "../segments/time";
import { daysBetween, type CalendarDate } from "../trips/calendarDate";

/** Longest allowed stay, in nights. */
export const HOTEL_MAX_NIGHTS = 365;

/** Calendar-date difference; may be 0 (day-use) or negative. */
export function nightsBetweenDates(checkInDate: CalendarDate, checkOutDate: CalendarDate): number {
  return daysBetween(checkInDate, checkOutDate);
}

/** Nights between two instants, counted on the calendar of the HOTEL's zone (not by dividing ms). */
export function countNights(checkInAt: Date, checkOutAt: Date, timeZone: string): number {
  return nightsBetweenDates(
    instantToZonedParts(checkInAt, timeZone).date,
    instantToZonedParts(checkOutAt, timeZone).date,
  );
}
