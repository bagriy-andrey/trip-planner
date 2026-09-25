import type { PlaceLanguage } from "@tripplanner/shared";

import type { Locale } from "./resolveLocale";

/**
 * The language of place, airport, airline and currency NAMES. The directories only have ru and en, so
 * Ukrainian shows the English names until a Ukrainian directory exists (AC-47).
 */
export function placeLanguageOf(locale: Locale): PlaceLanguage {
  return locale === "ru" ? "ru" : "en";
}
