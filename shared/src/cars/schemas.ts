import { z } from "zod";
import { parseForm, type FormFieldErrors } from "../forms/parse";
import { codePointLength, multiLine, singleLine, trimmed } from "../forms/text";
import { parseMapsUrl } from "../hotels/mapsUrl";
import { parseMoneyAmount } from "../money/amount";
import { isCurrencyCode, type CurrencyCode } from "../money/currencies";
import { isClockTime, type ClockTime } from "../segments/time";
import { daysBetween, isCalendarDate, type CalendarDate } from "../trips/calendarDate";
import { CAR_FIELD_ERROR, isCarFieldErrorId, type CarFieldErrorId } from "./errorCodes";
import { parsePhone } from "./phone";

export const CAR_BOOKING_REF_MAX_LENGTH = 32;
export const CAR_COMPANY_MAX_LENGTH = 120;
export const CAR_PLACE_MAX_LENGTH = 300;
export const CAR_ADDRESS_MAX_LENGTH = 300;
export const CAR_CLASS_MAX_LENGTH = 120;
export const CAR_NOTES_MAX_LENGTH = 1000;
export const CAR_MAX_RENTAL_DAYS = 365;
/** Order = order in the UI. */
export const CAR_INSURANCE = ["none", "excess", "full"] as const;
export const CAR_FUEL_POLICY = ["full_full", "full_empty", "other"] as const;
export const CAR_PAYMENT_STATUS = ["paid", "on_site"] as const;

export type CarInsurance = (typeof CAR_INSURANCE)[number];
export type CarFuelPolicy = (typeof CAR_FUEL_POLICY)[number];
export type CarPaymentStatus = (typeof CAR_PAYMENT_STATUS)[number];

/** What the form holds before validation: every field optional and untrusted. */
export type CarFormInput = {
  bookingRef?: string | null;
  company?: string | null;
  pickupPlace?: string | null;
  /** "YYYY-MM-DD". */
  pickupDate?: string | null;
  returnDate?: string | null;
  /** "HH:MM" (the rental stores no zone). */
  pickupTime?: string | null;
  returnTime?: string | null;
  returnSamePlace?: boolean | null;
  returnPlace?: string | null;
  mapsUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  carClass?: string | null;
  insurance?: string | null;
  fuelPolicy?: string | null;
  costAmount?: string | null;
  costCurrency?: string | null;
  paymentStatus?: string | null;
  extraDriver?: boolean | null;
  depositAmount?: string | null;
  notes?: string | null;
};

export type CarFormValue = {
  bookingRef: string;
  company: string | null;
  pickupPlace: string;
  pickupDate: CalendarDate;
  returnDate: CalendarDate;
  pickupTime: ClockTime;
  returnTime: ClockTime;
  returnSamePlace: boolean;
  returnPlace: string | null;
  mapsUrl: string | null;
  address: string | null;
  phone: string | null;
  carClass: string | null;
  insurance: CarInsurance | null;
  fuelPolicy: CarFuelPolicy | null;
  paymentStatus: CarPaymentStatus | null;
  money: { currency: CurrencyCode; cost: string | null; deposit: string | null } | null;
  extraDriver: boolean;
  notes: string | null;
};

export type CarFormFieldErrors = FormFieldErrors<CarFieldErrorId>;

export type CarFormResult =
  | { ok: true; value: CarFormValue }
  | { ok: false; fieldErrors: CarFormFieldErrors };

type CarField =
  | "bookingRef"
  | "company"
  | "pickupPlace"
  | "dates"
  | "pickupTime"
  | "returnTime"
  | "return"
  | "returnSamePlace"
  | "returnPlace"
  | "mapsUrl"
  | "address"
  | "phone"
  | "carClass"
  | "insurance"
  | "fuelPolicy"
  | "paymentStatus"
  | "extraDriver"
  | "costAmount"
  | "depositAmount"
  | "costCurrency"
  | "notes";

type EnumRead<T extends string> = { ok: true; value: T | null } | { ok: false };

function readEnum<T extends string>(options: readonly T[], raw: unknown): EnumRead<T> {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  const found = options.find((option) => option === raw);
  return found === undefined ? { ok: false } : { ok: true, value: found };
}

/**
 * The car-rental form: ONE schema for create and edit. Everything is judged in one `.transform` so
 * every invalid field is reported together (zod 4 skips object-level checks once a property fails).
 * Errors are `CAR_FIELD_ERROR` ids under the `CarField` keys.
 */
export const carFormSchema = z
  .object({
    bookingRef: z.unknown().optional(),
    company: z.unknown().optional(),
    pickupPlace: z.unknown().optional(),
    pickupDate: z.unknown().optional(),
    returnDate: z.unknown().optional(),
    pickupTime: z.unknown().optional(),
    returnTime: z.unknown().optional(),
    returnSamePlace: z.unknown().optional(),
    returnPlace: z.unknown().optional(),
    mapsUrl: z.unknown().optional(),
    address: z.unknown().optional(),
    phone: z.unknown().optional(),
    carClass: z.unknown().optional(),
    insurance: z.unknown().optional(),
    fuelPolicy: z.unknown().optional(),
    costAmount: z.unknown().optional(),
    costCurrency: z.unknown().optional(),
    paymentStatus: z.unknown().optional(),
    extraDriver: z.unknown().optional(),
    depositAmount: z.unknown().optional(),
    notes: z.unknown().optional(),
  })
  .transform((raw, ctx) => {
    let failed = false;
    const report = (field: CarField, id: CarFieldErrorId): void => {
      failed = true;
      ctx.issues.push({ code: "custom", message: id, path: [field], input: raw });
    };

    // --- Single-line texts ---
    const bookingRef = singleLine(raw.bookingRef);
    if (bookingRef === null) report("bookingRef", CAR_FIELD_ERROR.bookingRefRequired);
    else if (codePointLength(bookingRef) > CAR_BOOKING_REF_MAX_LENGTH) {
      report("bookingRef", CAR_FIELD_ERROR.bookingRefTooLong);
    }
    const company = singleLine(raw.company);
    if (company !== null && codePointLength(company) > CAR_COMPANY_MAX_LENGTH) {
      report("company", CAR_FIELD_ERROR.companyTooLong);
    }
    const pickupPlace = singleLine(raw.pickupPlace);
    if (pickupPlace === null) report("pickupPlace", CAR_FIELD_ERROR.pickupPlaceRequired);
    else if (codePointLength(pickupPlace) > CAR_PLACE_MAX_LENGTH) {
      report("pickupPlace", CAR_FIELD_ERROR.pickupPlaceTooLong);
    }
    const carClass = singleLine(raw.carClass);
    if (carClass !== null && codePointLength(carClass) > CAR_CLASS_MAX_LENGTH) {
      report("carClass", CAR_FIELD_ERROR.carClassTooLong);
    }

    // --- Dates and times (both mandatory; the rental stores no zone) ---
    const pickupDate = trimmed(raw.pickupDate);
    const returnDate = trimmed(raw.returnDate);
    const pickupTime = trimmed(raw.pickupTime);
    const returnTime = trimmed(raw.returnTime);
    const datesValid = isCalendarDate(pickupDate) && isCalendarDate(returnDate);
    if (!datesValid) report("dates", CAR_FIELD_ERROR.datesRequired);
    const pickupTimeValid = isClockTime(pickupTime);
    const returnTimeValid = isClockTime(returnTime);
    if (!pickupTimeValid) report("pickupTime", CAR_FIELD_ERROR.pickupTimeRequired);
    if (!returnTimeValid) report("returnTime", CAR_FIELD_ERROR.returnTimeRequired);

    if (isCalendarDate(pickupDate) && isCalendarDate(returnDate)) {
      const days = daysBetween(pickupDate, returnDate);
      if (days < 0) report("return", CAR_FIELD_ERROR.returnNotAfterPickup);
      else if (days > CAR_MAX_RENTAL_DAYS) report("dates", CAR_FIELD_ERROR.datesTooLong);
      else if (days === 0 && pickupTimeValid && returnTimeValid && returnTime <= pickupTime) {
        report("return", CAR_FIELD_ERROR.returnNotAfterPickup);
      }
    }

    // --- Return place ---
    let returnSamePlace = true;
    if (raw.returnSamePlace !== undefined && raw.returnSamePlace !== null) {
      if (typeof raw.returnSamePlace === "boolean") returnSamePlace = raw.returnSamePlace;
      else report("returnSamePlace", CAR_FIELD_ERROR.returnSamePlaceInvalid);
    }
    let returnPlace: string | null = null;
    if (!returnSamePlace) {
      returnPlace = multiLine(raw.returnPlace);
      if (returnPlace === null) report("returnPlace", CAR_FIELD_ERROR.returnPlaceRequired);
      else if (codePointLength(returnPlace) > CAR_PLACE_MAX_LENGTH) {
        report("returnPlace", CAR_FIELD_ERROR.returnPlaceTooLong);
      }
    }

    // --- Office: maps link, address, phone ---
    let mapsUrl: string | null = null;
    if (trimmed(raw.mapsUrl) !== "") {
      const parsed = parseMapsUrl(raw.mapsUrl);
      if (parsed.ok) mapsUrl = parsed.url;
      else {
        report(
          "mapsUrl",
          parsed.error === "mapsUrl.tooLong"
            ? CAR_FIELD_ERROR.mapsUrlTooLong
            : CAR_FIELD_ERROR.mapsUrlNotGoogleMaps,
        );
      }
    }
    const address = multiLine(raw.address);
    if (address !== null && codePointLength(address) > CAR_ADDRESS_MAX_LENGTH) {
      report("address", CAR_FIELD_ERROR.addressTooLong);
    }
    let phone: string | null = null;
    const parsedPhone = parsePhone(raw.phone);
    if (parsedPhone.ok) phone = parsedPhone.phone;
    else report("phone", CAR_FIELD_ERROR.phoneInvalid);

    // --- Enums (unset by default) ---
    const insurance = readEnum(CAR_INSURANCE, raw.insurance);
    if (!insurance.ok) report("insurance", CAR_FIELD_ERROR.insuranceInvalid);
    const fuelPolicy = readEnum(CAR_FUEL_POLICY, raw.fuelPolicy);
    if (!fuelPolicy.ok) report("fuelPolicy", CAR_FIELD_ERROR.fuelPolicyInvalid);
    const paymentStatus = readEnum(CAR_PAYMENT_STATUS, raw.paymentStatus);
    if (!paymentStatus.ok) report("paymentStatus", CAR_FIELD_ERROR.paymentStatusInvalid);

    let extraDriver = false;
    if (raw.extraDriver !== undefined && raw.extraDriver !== null) {
      if (typeof raw.extraDriver === "boolean") extraDriver = raw.extraDriver;
      else report("extraDriver", CAR_FIELD_ERROR.extraDriverInvalid);
    }

    // --- Money: one currency for cost and deposit; no amount at all means no money ---
    let money: CarFormValue["money"] = null;
    const costText = trimmed(raw.costAmount);
    const depositText = trimmed(raw.depositAmount);
    const currencyText = trimmed(raw.costCurrency).toUpperCase();
    if (costText !== "" || depositText !== "") {
      let cost: string | null = null;
      let deposit: string | null = null;
      if (costText !== "") {
        const parsed = parseMoneyAmount(costText);
        if (parsed.ok) cost = parsed.amount;
        else report("costAmount", CAR_FIELD_ERROR.costAmountFormat);
      }
      if (depositText !== "") {
        const parsed = parseMoneyAmount(depositText);
        if (parsed.ok) deposit = parsed.amount;
        else report("depositAmount", CAR_FIELD_ERROR.depositAmountFormat);
      }
      if (currencyText === "") report("costCurrency", CAR_FIELD_ERROR.costCurrencyMissing);
      else if (!isCurrencyCode(currencyText)) report("costCurrency", CAR_FIELD_ERROR.costCurrencyUnknown);
      else money = { currency: currencyText, cost, deposit };
    }

    const notes = multiLine(raw.notes);
    if (notes !== null && codePointLength(notes) > CAR_NOTES_MAX_LENGTH) {
      report("notes", CAR_FIELD_ERROR.notesTooLong);
    }

    if (
      failed ||
      bookingRef === null ||
      pickupPlace === null ||
      !isCalendarDate(pickupDate) ||
      !isCalendarDate(returnDate) ||
      !isClockTime(pickupTime) ||
      !isClockTime(returnTime) ||
      !insurance.ok ||
      !fuelPolicy.ok ||
      !paymentStatus.ok
    ) {
      return z.NEVER;
    }

    const value: CarFormValue = {
      bookingRef,
      company,
      pickupPlace,
      pickupDate,
      returnDate,
      pickupTime,
      returnTime,
      returnSamePlace,
      returnPlace,
      mapsUrl,
      address,
      phone,
      carClass,
      insurance: insurance.value,
      fuelPolicy: fuelPolicy.value,
      paymentStatus: paymentStatus.value,
      money,
      extraDriver,
      notes,
    };
    return value;
  });

/** Validates a car-rental form: never throws, returns ids (never texts) on failure. */
export function parseCarForm(input: unknown): CarFormResult {
  return parseForm(carFormSchema, input, isCarFieldErrorId);
}
