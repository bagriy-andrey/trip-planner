export const BREAKFAST_DAYS_FALLBACK_MAX = 30;

/** Allowed "days with breakfast" for a partial plan: 1 .. max(1, nights - 1); 1..30 when unknown. */
export function breakfastDaysRange(nights: number | null): { min: 1; max: number } {
  return { min: 1, max: nights === null ? BREAKFAST_DAYS_FALLBACK_MAX : Math.max(1, nights - 1) };
}

/** Pulls `days` into the range for `nights` (rounding non-integers down). */
export function clampBreakfastDays(days: number, nights: number | null): number {
  const { min, max } = breakfastDaysRange(nights);
  const whole = Number.isFinite(days) ? Math.floor(days) : min;
  return Math.min(max, Math.max(min, whole));
}
