/**
 * Stable identifiers of segment form field errors.
 *
 * These are identifiers, NOT user-facing texts: clients map them to their own localized strings
 * (`"to.sameAsFrom"` -> `validation.to.sameAsFrom`). The list is a contract — renaming or removing a
 * value is a breaking change and must update every consumer in the same plan. The literal list is
 * pinned in `__tests__/form.test.ts` (AC-37).
 *
 * Field keys the ids are reported under (see `parseSegmentForm`): `flightNumber`, `from`, `to`,
 * `departureDate`, `departureTime`, `arrival`, `passengers`, `seat`, `ticketNumber`.
 */
export const SEGMENT_FIELD_ERROR = {
  flightNumberFormat: "flightNumber.format",
  fromRequired: "from.required",
  fromNotInDirectory: "from.notInDirectory",
  toRequired: "to.required",
  toNotInDirectory: "to.notInDirectory",
  toSameAsFrom: "to.sameAsFrom",
  departureDateRequired: "departure.dateRequired",
  departureTimeRequired: "departure.timeRequired",
  departureInPast: "departure.inPast",
  departureBeforeTripStart: "departure.beforeTripStart",
  arrivalIncomplete: "arrival.incomplete",
  arrivalNotAfterDeparture: "arrival.notAfterDeparture",
  arrivalTooLong: "arrival.tooLong",
  passengersRange: "passengers.range",
  seatTooLong: "seat.tooLong",
  ticketNumberTooLong: "ticketNumber.tooLong",
} as const;

export type SegmentFieldErrorId = (typeof SEGMENT_FIELD_ERROR)[keyof typeof SEGMENT_FIELD_ERROR];

const KNOWN_IDS: ReadonlySet<string> = new Set(Object.values(SEGMENT_FIELD_ERROR));

export function isSegmentFieldErrorId(value: unknown): value is SegmentFieldErrorId {
  return typeof value === "string" && KNOWN_IDS.has(value);
}
