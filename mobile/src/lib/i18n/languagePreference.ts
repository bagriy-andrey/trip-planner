// Pure language-preference logic. No React Native imports on purpose: shared by the provider, the
// storage registry and tests. Mirrors `lib/theme/preference.ts`.
import { SUPPORTED_LOCALES } from "./resolveLocale";
import type { Locale } from "./resolveLocale";

/** "system" follows the device; anything else is the user's own choice. Order = order in the picker. */
export const LANGUAGE_PREFERENCES = ["system", "en", "ru", "uk"] as const satisfies readonly (
  | "system"
  | Locale
)[];

export type LanguagePreference = (typeof LANGUAGE_PREFERENCES)[number];

/** The only key that stores the language choice (device-local, like the theme). */
export const LANGUAGE_STORAGE_KEY = "tripplanner.settings.language";

/** Used when there is no valid stored choice. */
export const DEFAULT_LANGUAGE_PREFERENCE: LanguagePreference = "system";

/** Validates an untrusted stored value; anything outside the allowed set yields `null`. */
export function parseLanguagePreference(value: unknown): LanguagePreference | null {
  return typeof value === "string" && (LANGUAGE_PREFERENCES as readonly string[]).includes(value)
    ? (value as LanguagePreference)
    : null;
}

/** The UI locale for a preference: the choice itself, or the device locale for "system". */
export function resolveLanguage(preference: LanguagePreference, deviceLocale: Locale): Locale {
  return preference === "system" ? deviceLocale : preference;
}

// Every selectable locale must be a preference (a locale added to SUPPORTED_LOCALES without a
// picker option would be unreachable).
export const SELECTABLE_LOCALES: readonly Locale[] = SUPPORTED_LOCALES;
