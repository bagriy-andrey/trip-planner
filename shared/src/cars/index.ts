export { CAR_FIELD_ERROR, isCarFieldErrorId } from "./errorCodes";
export type { CarFieldErrorId } from "./errorCodes";
export { CAR_PHONE_MAX_LENGTH, parsePhone, telHref } from "./phone";
export type { PhoneResult } from "./phone";
export { carReturnAfterFlight } from "./returnAfterFlight";
export type { FlightDeparture, RentalMoments } from "./returnAfterFlight";
export {
  CAR_ADDRESS_MAX_LENGTH,
  CAR_BOOKING_REF_MAX_LENGTH,
  CAR_CLASS_MAX_LENGTH,
  CAR_COMPANY_MAX_LENGTH,
  CAR_FUEL_POLICY,
  CAR_INSURANCE,
  CAR_MAX_RENTAL_DAYS,
  CAR_NOTES_MAX_LENGTH,
  CAR_PAYMENT_STATUS,
  CAR_PLACE_MAX_LENGTH,
  carFormSchema,
  parseCarForm,
} from "./schemas";
export type {
  CarFormFieldErrors,
  CarFormInput,
  CarFormResult,
  CarFormValue,
  CarFuelPolicy,
  CarInsurance,
  CarPaymentStatus,
} from "./schemas";
export { carFromRowSchema, carRowSchema, toCar, toCarWrite } from "./rows";
export type { Car, CarRow, CarWrite } from "./rows";
