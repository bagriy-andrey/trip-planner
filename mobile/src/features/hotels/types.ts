import type { Hotel } from "@tripplanner/shared";

import { formatCalendarDay, formatClockTime } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n";
import { i18n } from "@/lib/i18n";

export type BreakfastChip = { kind: "all" } | { kind: "partial"; days: number } | null;

export interface HotelCardData {
  id: string;
  name: string;
  checkInText: string;
  checkOutText: string;
  breakfastChip: BreakfastChip;
  a11yLabel: string;
}

/** "12 мая" or "12 мая, 15:00": the time is shown only when set (wall-clock of the hotel, no zone maths). */
function stayText(locale: Locale, date: string, time: string | null): string {
  const day = formatCalendarDay(locale, date);
  return time === null ? day : `${day}, ${formatClockTime(locale, time)}`;
}

/**
 * Card view-model. Dates are calendar dates and times are the hotel's local wall-clock, so nothing
 * is converted. No calendar arithmetic here: the stored breakfast day count is shown as is.
 */
export function toHotelCardData(hotel: Hotel, locale: Locale): HotelCardData {
  const checkInText = stayText(locale, hotel.checkInDate, hotel.checkInTime);
  const checkOutText = stayText(locale, hotel.checkOutDate, hotel.checkOutTime);
  let breakfastChip: BreakfastChip = null;
  if (hotel.breakfast === "all") breakfastChip = { kind: "all" };
  else if (hotel.breakfast === "partial" && hotel.breakfastDays !== null) {
    breakfastChip = { kind: "partial", days: hotel.breakfastDays };
  }
  const t = i18n.getFixedT(locale, "hotel");
  const a11yLabel = t("card.a11y", { name: hotel.name, checkIn: checkInText, checkOut: checkOutText });
  return { id: hotel.id, name: hotel.name, checkInText, checkOutText, breakfastChip, a11yLabel };
}
