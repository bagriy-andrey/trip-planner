/**
 * Stable identifiers of trip form field errors.
 *
 * These are identifiers, NOT user-facing texts: clients map them to their own localized strings
 * (`"dates.tooLong"` -> `validation.dates.tooLong`). The list is a contract — renaming or removing a
 * value is a breaking change and must update every consumer in the same plan. The literal list is
 * pinned in `__tests__/errorCodes.test.ts`.
 *
 * Field keys the ids are reported under (see `parseTripForm`): `destination`, `title`, `dates`.
 * A malformed date value (not `YYYY-MM-DD`) is reported as `dates.incomplete`: to the user it is
 * "the dates are not both chosen".
 */
export const TRIP_FIELD_ERROR = {
  destinationEmpty: "destination.empty",
  destinationTooLong: "destination.tooLong",
  titleTooLong: "title.tooLong",
  datesIncomplete: "dates.incomplete",
  datesEndBeforeStart: "dates.endBeforeStart",
  datesTooLong: "dates.tooLong",
} as const;

export type TripFieldErrorId = (typeof TRIP_FIELD_ERROR)[keyof typeof TRIP_FIELD_ERROR];

const KNOWN_IDS: ReadonlySet<string> = new Set(Object.values(TRIP_FIELD_ERROR));

export function isTripFieldErrorId(value: unknown): value is TripFieldErrorId {
  return typeof value === "string" && KNOWN_IDS.has(value);
}
