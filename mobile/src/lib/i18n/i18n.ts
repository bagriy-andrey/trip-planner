import { createInstance } from "i18next";
import { getLocales } from "expo-localization";
import { initReactI18next } from "react-i18next";

import { en } from "./locales/en";
import { ru } from "./locales/ru";
import { uk } from "./locales/uk";
import { DEFAULT_LOCALE, resolveLocale, SUPPORTED_LOCALES, type Locale } from "./resolveLocale";

/** UI locale derived from the device's current language preferences. */
export function getDeviceLocale(): Locale {
  return resolveLocale(getLocales().map((locale) => locale.languageTag));
}

export const i18n = createInstance();

// Resources are bundled, so init completes synchronously (`initAsync: false`):
// the first render already has strings.
void i18n.use(initReactI18next).init({
  resources: { ru, en, uk },
  lng: getDeviceLocale(),
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: [...SUPPORTED_LOCALES],
  defaultNS: "common",
  ns: Object.keys(en),
  initAsync: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});
