import { daysBetween, type CalendarDate } from "../trips/calendarDate";

/** Longest allowed stay, in nights. */
export const HOTEL_MAX_NIGHTS = 365;

/** Calendar-date difference; may be 0 (day-use) or negative. */
export function nightsBetweenDates(checkInDate: CalendarDate, checkOutDate: CalendarDate): number {
  return daysBetween(checkInDate, checkOutDate);
}
