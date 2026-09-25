import type {
  CalendarDate,
  Car,
  CarFormInput,
  CarFuelPolicy,
  CarInsurance,
  CarPaymentStatus,
  ClockTime,
  CurrencyCode,
  Trip,
} from "@tripplanner/shared";

/**
 * What the form holds while the user edits it. Strings and choices only; `mapsUrlText`/`mapsUrl`
 * split the typed link from the one `parseMapsUrl` accepted. `shared` judges everything on save.
 */
export interface CarFormState {
  bookingRef: string;
  company: string;
  pickupPlace: string;
  pickupDate: CalendarDate | null;
  returnDate: CalendarDate | null;
  pickupTime: ClockTime | null;
  returnTime: ClockTime | null;
  returnSamePlace: boolean;
  /** Kept while "same place" is on (AC-24): not sent, not lost. */
  returnPlace: string;
  mapsUrlText: string;
  mapsUrl: string | null;
  address: string;
  phone: string;
  carClass: string;
  insurance: CarInsurance | null;
  fuelPolicy: CarFuelPolicy | null;
  costAmount: string;
  costCurrency: string;
  paymentStatus: CarPaymentStatus | null;
  extraDriver: boolean;
  depositAmount: string;
  notes: string;
}

export const EMPTY_CAR_FORM: CarFormState = {
  bookingRef: "",
  company: "",
  pickupPlace: "",
  pickupDate: null,
  returnDate: null,
  pickupTime: null,
  returnTime: null,
  returnSamePlace: true,
  returnPlace: "",
  mapsUrlText: "",
  mapsUrl: null,
  address: "",
  phone: "",
  carClass: "",
  insurance: null,
  fuelPolicy: null,
  costAmount: "",
  costCurrency: "",
  paymentStatus: null,
  extraDriver: false,
  depositAmount: "",
  notes: "",
};

/**
 * Create-mode prefill (AC-11): the trip's dates with the start clamped to today; a trip that already
 * ended (or has no dates) leaves the range empty. Times stay empty; the currency is the profile's.
 */
export function carFormFromTrip(trip: Trip, today: CalendarDate, homeCurrency: CurrencyCode | null): CarFormState {
  const ended = trip.endDate !== null && trip.endDate < today;
  const pickupDate = ended ? null : trip.startDate !== null && trip.startDate < today ? today : trip.startDate;
  return { ...EMPTY_CAR_FORM, pickupDate, returnDate: ended ? null : trip.endDate, costCurrency: homeCurrency ?? "" };
}

/** Edit-mode values exactly as stored (local dates and times, no zone maths). */
export function carFormFromCar(car: Car): CarFormState {
  return {
    bookingRef: car.bookingRef,
    company: car.company ?? "",
    pickupPlace: car.pickupPlace,
    pickupDate: car.pickupDate,
    returnDate: car.returnDate,
    pickupTime: car.pickupTime,
    returnTime: car.returnTime,
    returnSamePlace: car.returnSamePlace,
    returnPlace: car.returnPlace ?? "",
    mapsUrlText: car.mapsUrl ?? "",
    mapsUrl: car.mapsUrl,
    address: car.address ?? "",
    phone: car.phone ?? "",
    carClass: car.carClass ?? "",
    insurance: car.insurance,
    fuelPolicy: car.fuelPolicy,
    costAmount: car.money?.cost ?? "",
    costCurrency: car.money?.currency ?? "",
    paymentStatus: car.paymentStatus,
    extraDriver: car.extraDriver,
    depositAmount: car.money?.deposit ?? "",
    notes: car.notes ?? "",
  };
}

/** "More" starts open when it already holds something (AC-14). */
export function moreInitiallyOpen(state: CarFormState): boolean {
  return state.extraDriver || state.depositAmount !== "" || state.notes !== "";
}

/**
 * Earliest pick-up day that may be chosen. Create: today. Edit: today, or the stored pick-up when it
 * is already past, so an old rental stays editable (AC-19). Clock-dependent, hence not in `shared`.
 */
export function carDateFloor(mode: "create" | "edit", today: CalendarDate, storedPickup: CalendarDate | null): CalendarDate {
  if (mode === "create" || storedPickup === null) return today;
  return storedPickup < today ? storedPickup : today;
}

/** Pure equality: the "changed since open" flag. Every field is a primitive. */
export function carFormEquals(a: CarFormState, b: CarFormState): boolean {
  return (Object.keys(a) as (keyof CarFormState)[]).every((key) => a[key] === b[key]);
}

/** Input of `parseCarForm`. `returnPlace` is always passed: the schema nulls it when "same place" is on (AC-24). */
export function toCarFormInput(state: CarFormState): CarFormInput {
  const { mapsUrlText, ...rest } = state;
  return { ...rest, mapsUrl: state.mapsUrl ?? mapsUrlText };
}
