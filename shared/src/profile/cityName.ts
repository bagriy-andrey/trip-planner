/** Own home city (not in the offline directory): bounds in code points, mirrored by `profiles_home_city_name_fmt`. */
export const HOME_CITY_NAME_MIN = 2;
export const HOME_CITY_NAME_MAX = 80;

/** Trims and collapses every whitespace run (line breaks and tabs included) into one space. */
export function normalizeCityName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/** A stored or writable own-city name: already normalised, 2..80 code points. */
export function isValidCityName(name: string): boolean {
  if (normalizeCityName(name) !== name) return false;
  const length = [...name].length;
  return length >= HOME_CITY_NAME_MIN && length <= HOME_CITY_NAME_MAX;
}
