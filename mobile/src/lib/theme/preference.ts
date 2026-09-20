// Pure theme-preference logic. No React Native imports on purpose: this file is
// shared by the provider, the storage boundary and tests.

export const THEME_PREFERENCES = ["light", "dark", "system"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ColorScheme = "light" | "dark";

/** The one and only key the app is allowed to persist (AC-33). */
export const THEME_STORAGE_KEY = "tripplanner.settings.theme";

/** Preference used when there is no valid stored choice (AC-14, AC-31). */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "dark";

/**
 * Validates an untrusted value coming from storage. Anything outside the
 * allowed set (including non-strings) yields `null`; the value is never
 * interpreted any other way (AC-31).
 */
export function parseThemePreference(value: unknown): ThemePreference | null {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return null;
}

/** Structural superset of React Native's `ColorSchemeName`. */
export type SystemColorScheme = "light" | "dark" | "unspecified" | null | undefined;

/** `'system'` follows the device (falling back to dark); otherwise the choice itself (AC-14). */
export function resolveColorScheme(
  preference: ThemePreference,
  systemScheme: SystemColorScheme,
): ColorScheme {
  if (preference === "system") {
    return systemScheme === "light" || systemScheme === "dark" ? systemScheme : "dark";
  }
  return preference;
}
