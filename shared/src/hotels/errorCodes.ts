/**
 * Stable identifiers of hotel form field errors (ids, NOT texts). Clients map an id to
 * `hotel:form.validation.<id>`. The list is a contract; the literal list is pinned in
 * `__tests__/form.test.ts`.
 */
export const HOTEL_FIELD_ERROR = {
  nameRequired: "name.required",
  nameTooLong: "name.tooLong",
  cityRequired: "city.required",
  cityNotInDirectory: "city.notInDirectory",
  checkInDateRequired: "checkIn.dateRequired",
  checkInTimeRequired: "checkIn.timeRequired",
  checkOutDateRequired: "checkOut.dateRequired",
  checkOutTimeRequired: "checkOut.timeRequired",
  checkOutNotAfterCheckIn: "checkOut.notAfterCheckIn",
  checkOutStayTooLong: "checkOut.stayTooLong",
  addressTooLong: "address.tooLong",
  mapsUrlNotGoogleMaps: "mapsUrl.notGoogleMaps",
  mapsUrlTooLong: "mapsUrl.tooLong",
  guestsRange: "guests.range",
  parkingInvalid: "parking.invalid",
  breakfastInvalid: "breakfast.invalid",
  breakfastDaysRange: "breakfastDays.range",
  costAmountFormat: "cost.amountFormat",
  costAmountMissing: "cost.amountMissing",
  costCurrencyMissing: "cost.currencyMissing",
  costCurrencyUnknown: "cost.currencyUnknown",
  bookingRefTooLong: "bookingRef.tooLong",
  notesTooLong: "notes.tooLong",
} as const;

export type HotelFieldErrorId = (typeof HOTEL_FIELD_ERROR)[keyof typeof HOTEL_FIELD_ERROR];

const KNOWN_IDS: ReadonlySet<string> = new Set(Object.values(HOTEL_FIELD_ERROR));

export function isHotelFieldErrorId(value: unknown): value is HotelFieldErrorId {
  return typeof value === "string" && KNOWN_IDS.has(value);
}
