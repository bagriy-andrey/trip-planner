export { useTranslation } from "react-i18next";

export {
  formatCalendarDate,
  formatCalendarDay,
  formatCalendarRange,
  formatClockTime,
  formatDateRange,
  formatNights,
  formatRelativeDays,
  formatShortDate,
  formatTime,
  formatTripDateLine,
} from "./format";
export { getDeviceLocale, i18n } from "./i18n";
export { DEFAULT_LOCALE, resolveLocale, SUPPORTED_LOCALES, type Locale } from "./resolveLocale";
export { useDeviceLocaleSync } from "./useDeviceLocaleSync";
