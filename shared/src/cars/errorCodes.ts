/**
 * Stable identifiers of car-rental form field errors (ids, NOT texts). Clients map an id to
 * `car:form.validation.<id>`. The literal list is pinned in `__tests__/form.test.ts`.
 */
export const CAR_FIELD_ERROR = {
  bookingRefRequired: "bookingRef.required",
  bookingRefTooLong: "bookingRef.tooLong",
  companyTooLong: "company.tooLong",
  pickupPlaceRequired: "pickupPlace.required",
  pickupPlaceTooLong: "pickupPlace.tooLong",
  datesRequired: "dates.required",
  datesTooLong: "dates.tooLong",
  pickupTimeRequired: "pickupTime.required",
  returnTimeRequired: "returnTime.required",
  returnNotAfterPickup: "return.notAfterPickup",
  returnPlaceRequired: "returnPlace.required",
  returnPlaceTooLong: "returnPlace.tooLong",
  mapsUrlNotGoogleMaps: "mapsUrl.notGoogleMaps",
  mapsUrlTooLong: "mapsUrl.tooLong",
  addressTooLong: "address.tooLong",
  phoneInvalid: "phone.invalid",
  carClassTooLong: "carClass.tooLong",
  insuranceInvalid: "insurance.invalid",
  fuelPolicyInvalid: "fuelPolicy.invalid",
  paymentStatusInvalid: "paymentStatus.invalid",
  extraDriverInvalid: "extraDriver.invalid",
  returnSamePlaceInvalid: "returnSamePlace.invalid",
  costAmountFormat: "cost.amountFormat",
  depositAmountFormat: "deposit.amountFormat",
  costCurrencyMissing: "cost.currencyMissing",
  costCurrencyUnknown: "cost.currencyUnknown",
  notesTooLong: "notes.tooLong",
} as const;

export type CarFieldErrorId = (typeof CAR_FIELD_ERROR)[keyof typeof CAR_FIELD_ERROR];

const KNOWN_IDS: ReadonlySet<string> = new Set(Object.values(CAR_FIELD_ERROR));

export function isCarFieldErrorId(value: unknown): value is CarFieldErrorId {
  return typeof value === "string" && KNOWN_IDS.has(value);
}
