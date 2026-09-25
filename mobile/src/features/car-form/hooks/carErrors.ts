import type { CarFieldErrorId, CarFormFieldErrors } from "@tripplanner/shared";

/** Mobile-only date rule (it needs the clock, so it is no `shared` id): key under `car.form.validation`. */
export const PICKUP_IN_PAST = "pickup.inPast";
export type DatesErrorId = CarFieldErrorId | typeof PICKUP_IN_PAST;

/** Field groups whose error shows after the user leaves them (or after the first save attempt, AC-21). */
export type ErrorGroup =
  | "bookingRef"
  | "company"
  | "pickupPlace"
  | "dates"
  | "pickupTime"
  | "returnTime"
  | "returnPlace"
  | "mapsUrl"
  | "address"
  | "phone"
  | "carClass"
  | "cost"
  | "notes";

export interface CarErrors {
  bookingRef?: CarFieldErrorId;
  company?: CarFieldErrorId;
  pickupPlace?: CarFieldErrorId;
  dates: DatesErrorId[];
  pickupTime?: CarFieldErrorId;
  returnTime?: CarFieldErrorId;
  /** "Return must be after pick-up": shown under the return TIME (AC-22). */
  returnOrder?: CarFieldErrorId;
  returnPlace?: CarFieldErrorId;
  mapsUrl?: CarFieldErrorId;
  address?: CarFieldErrorId;
  phone?: CarFieldErrorId;
  carClass?: CarFieldErrorId;
  costAmount?: CarFieldErrorId;
  costCurrency?: CarFieldErrorId;
  depositAmount?: CarFieldErrorId;
  notes?: CarFieldErrorId;
}

/** Maps the ONE shared schema's errors onto the fields, hiding those whose group is not yet visible. */
export function deriveCarErrors(
  raw: CarFormFieldErrors,
  visible: (group: ErrorGroup) => boolean,
  pickupInPast: boolean,
): CarErrors {
  const on = (group: ErrorGroup, id: CarFieldErrorId | undefined) => (visible(group) ? id : undefined);
  const dates: DatesErrorId[] = [];
  if (visible("dates")) {
    if (raw.dates !== undefined) dates.push(raw.dates);
    if (pickupInPast) dates.push(PICKUP_IN_PAST);
  }
  return {
    bookingRef: on("bookingRef", raw.bookingRef),
    company: on("company", raw.company),
    pickupPlace: on("pickupPlace", raw.pickupPlace),
    dates,
    pickupTime: on("pickupTime", raw.pickupTime),
    returnTime: on("returnTime", raw.returnTime),
    returnOrder: visible("pickupTime") || visible("returnTime") ? raw.return : undefined,
    returnPlace: on("returnPlace", raw.returnPlace),
    mapsUrl: on("mapsUrl", raw.mapsUrl),
    address: on("address", raw.address),
    phone: on("phone", raw.phone),
    carClass: on("carClass", raw.carClass),
    costAmount: on("cost", raw.costAmount),
    costCurrency: on("cost", raw.costCurrency),
    depositAmount: on("cost", raw.depositAmount),
    notes: on("notes", raw.notes),
  };
}
