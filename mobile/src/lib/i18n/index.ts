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
export { LanguageProvider, useLanguagePreference } from "./LanguageProvider";
export type { LanguageContextValue } from "./LanguageProvider";
export {
  DEFAULT_LANGUAGE_PREFERENCE,
  LANGUAGE_PREFERENCES,
  LANGUAGE_STORAGE_KEY,
  parseLanguagePreference,
  resolveLanguage,
} from "./languagePreference";
export type { LanguagePreference } from "./languagePreference";
export { placeLanguageOf } from "./placeLanguage";
