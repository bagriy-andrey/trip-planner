export { HOTEL_FIELD_ERROR, isHotelFieldErrorId } from "./errorCodes";
export type { HotelFieldErrorId } from "./errorCodes";
export { HOTEL_MAX_NIGHTS, countNights, nightsBetweenDates } from "./nights";
export { BREAKFAST_DAYS_FALLBACK_MAX, breakfastDaysRange, clampBreakfastDays } from "./breakfast";
export { MAPS_URL_MAX_LENGTH, parseMapsUrl } from "./mapsUrl";
export type { MapsUrlError, MapsUrlResult } from "./mapsUrl";
export {
  HOTEL_ADDRESS_MAX_LENGTH,
  HOTEL_BOOKING_REF_MAX_LENGTH,
  HOTEL_BREAKFAST,
  HOTEL_GUESTS_MAX,
  HOTEL_GUESTS_MIN,
  HOTEL_NAME_MAX_LENGTH,
  HOTEL_NOTES_MAX_LENGTH,
  HOTEL_PARKING,
  hotelFormSchema,
  parseHotelForm,
} from "./schemas";
export type {
  HotelBreakfast,
  HotelFormFieldErrors,
  HotelFormInput,
  HotelFormResult,
  HotelFormValue,
  HotelParking,
} from "./schemas";
export { hotelFromRowSchema, hotelRowSchema, toHotel, toHotelWrite } from "./rows";
export type { Hotel, HotelRow, HotelWrite } from "./rows";
