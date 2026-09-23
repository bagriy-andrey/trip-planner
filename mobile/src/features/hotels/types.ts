import type { Hotel } from "@tripplanner/shared";

import { formatSegmentDateTime } from "@/lib/i18n/format";
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

/**
 * Card view-model. Times are ALWAYS formatted in the hotel's own zone (formatters default to UTC).
 * No calendar arithmetic here: the stored breakfast day count is shown as is.
 */
export function toHotelCardData(hotel: Hotel, locale: Locale): HotelCardData {
  const checkInText = formatSegmentDateTime(locale, hotel.checkInAt, hotel.timeZone);
  const checkOutText = formatSegmentDateTime(locale, hotel.checkOutAt, hotel.timeZone);
  let breakfastChip: BreakfastChip = null;
  if (hotel.breakfast === "all") breakfastChip = { kind: "all" };
  else if (hotel.breakfast === "partial" && hotel.breakfastDays !== null) {
    breakfastChip = { kind: "partial", days: hotel.breakfastDays };
  }
  const t = i18n.getFixedT(locale, "hotel");
  const a11yLabel = t("card.a11y", { name: hotel.name, checkIn: checkInText, checkOut: checkOutText });
  return { id: hotel.id, name: hotel.name, checkInText, checkOutText, breakfastChip, a11yLabel };
}
