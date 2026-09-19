import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../../../app.constants";

export { SUPPORTED_LOCALES, DEFAULT_LOCALE };

export type Locale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Maps the device's ordered language tags (BCP 47, e.g. `["ru-RU", "en-US"]`) to
 * a supported UI locale. Only the first tag (the device language) counts, and
 * only its primary subtag: `ru*` -> `ru`, `en*` -> `en`, anything else (or no
 * tags at all) -> the default locale, English (AC-35, AC-36).
 */
export function resolveLocale(tags: readonly string[]): Locale {
  const primary = tags[0]?.split(/[-_]/)[0]?.toLowerCase();
  if (primary !== undefined && isSupportedLocale(primary)) return primary;
  return DEFAULT_LOCALE;
}
