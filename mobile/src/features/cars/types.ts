import type { Car } from "@tripplanner/shared";

import type { Locale } from "@/lib/i18n";

import { formatCardMoment } from "./format";
import type { CarT } from "./format";

export interface CarCardData {
  id: string;
  title: string;
  pickupText: string;
  pickupPlace: string;
  returnText: string;
  /** "Same place" when the car goes back where it was taken, else the return location. */
  returnPlaceText: string;
  bookingRef: string;
  a11yLabel: string;
}

/**
 * Card view-model (AC-39/42). No address, phone, insurance, payment or notes: they never enter it.
 * `t` is bound to the `car` namespace.
 */
export function toCarCardData(car: Car, t: CarT, locale: Locale): CarCardData {
  const title = car.company ?? t("card.untitled");
  const pickupText = formatCardMoment(t, locale, car.pickupDate, car.pickupTime);
  const returnText = formatCardMoment(t, locale, car.returnDate, car.returnTime);
  const returnPlaceText = car.returnSamePlace ? t("card.samePlace") : (car.returnPlace ?? "");
  return {
    id: car.id,
    title,
    pickupText,
    pickupPlace: car.pickupPlace,
    returnText,
    returnPlaceText,
    bookingRef: car.bookingRef,
    a11yLabel: t("card.a11y", { company: title, pickup: pickupText, return: returnText }),
  };
}
