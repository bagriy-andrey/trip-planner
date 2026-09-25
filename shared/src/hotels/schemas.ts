import { z } from "zod";
import { parseForm, type FormFieldErrors } from "../forms/parse";
import { parseMoneyAmount } from "../money/amount";
import { isCurrencyCode, type CurrencyCode } from "../money/currencies";
import { findCityById } from "../places/search";
import type { CityRecord } from "../places/schema";
import { isClockTime, type ClockTime } from "../segments/time";
import { isCalendarDate, type CalendarDate } from "../trips/calendarDate";
import { breakfastDaysRange } from "./breakfast";
import { HOTEL_FIELD_ERROR, isHotelFieldErrorId, type HotelFieldErrorId } from "./errorCodes";
import { parseMapsUrl } from "./mapsUrl";
import { HOTEL_MAX_NIGHTS, nightsBetweenDates } from "./nights";

export const HOTEL_NAME_MAX_LENGTH = 120;
export const HOTEL_ADDRESS_MAX_LENGTH = 300;
export const HOTEL_BOOKING_REF_MAX_LENGTH = 32;
export const HOTEL_NOTES_MAX_LENGTH = 1000;
export const HOTEL_GUESTS_MIN = 1;
export const HOTEL_GUESTS_MAX = 9;
/** Order = order in the UI. */
export const HOTEL_PARKING = ["none", "free", "paid"] as const;
export const HOTEL_BREAKFAST = ["all", "partial", "none"] as const;

export type HotelParking = (typeof HOTEL_PARKING)[number];
export type HotelBreakfast = (typeof HOTEL_BREAKFAST)[number];

/** Code points, not UTF-16 units: an emoji counts once. */
function codePointLength(value: string): number {
  return Array.from(value).length;
}

/** Single-line text: trim + collapse every whitespace run. Empty gives `null`. */
function singleLine(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  return text === "" ? null : text;
}

/** Multi-line text: trim + CRLF/CR to LF; inner line breaks are kept. Empty gives `null`. */
function multiLine(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\r\n?/g, "\n");
  return text === "" ? null : text;
}

function trimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** What the form holds before validation: every field optional and untrusted. */
export type HotelFormInput = {
  name?: string | null;
  cityPlaceId?: string | null;
  address?: string | null;
  mapsUrl?: string | null;
  /** "YYYY-MM-DD", local to the hotel's city. */
  checkInDate?: string | null;
  /** Optional "HH:MM" (local); empty means unknown. */
  checkInTime?: string | null;
  checkOutDate?: string | null;
  checkOutTime?: string | null;
  guests?: number | null;
  parking?: string | null;
  breakfast?: string | null;
  breakfastDays?: number | null;
  costAmount?: string | null;
  costCurrency?: string | null;
  bookingRef?: string | null;
  notes?: string | null;
};

export type HotelFormValue = {
  name: string;
  city: CityRecord;
  timeZone: string;
  address: string | null;
  mapsUrl: string | null;
  /** "YYYY-MM-DD", local to the hotel's city. */
  checkInDate: CalendarDate;
  checkOutDate: CalendarDate;
  /** "HH:MM" local, or null when not given. */
  checkInTime: ClockTime | null;
  checkOutTime: ClockTime | null;
  guests: number;
  parking: HotelParking;
  breakfast: HotelBreakfast;
  breakfastDays: number | null;
  cost: { amount: string; currency: CurrencyCode } | null;
  bookingRef: string | null;
  notes: string | null;
};

export type HotelFormFieldErrors = FormFieldErrors<HotelFieldErrorId>;

export type HotelFormResult =
  | { ok: true; value: HotelFormValue }
  | { ok: false; fieldErrors: HotelFormFieldErrors };

type HotelField =
  | "name"
  | "city"
  | "checkInDate"
  | "checkInTime"
  | "checkOutDate"
  | "checkOutTime"
  | "checkOut"
  | "address"
  | "mapsUrl"
  | "guests"
  | "parking"
  | "breakfast"
  | "breakfastDays"
  | "costAmount"
  | "costCurrency"
  | "bookingRef"
  | "notes";

/**
 * The hotel form: ONE schema for create and edit. Everything is judged in one `.transform` so every
 * invalid field is reported together (zod 4 skips object-level checks once a property fails).
 * Errors are `HOTEL_FIELD_ERROR` ids under the `HotelField` keys.
 */
export const hotelFormSchema = z
  .object({
    name: z.unknown().optional(),
    cityPlaceId: z.unknown().optional(),
    address: z.unknown().optional(),
    mapsUrl: z.unknown().optional(),
    checkInDate: z.unknown().optional(),
    checkInTime: z.unknown().optional(),
    checkOutDate: z.unknown().optional(),
    checkOutTime: z.unknown().optional(),
    guests: z.unknown().optional(),
    parking: z.unknown().optional(),
    breakfast: z.unknown().optional(),
    breakfastDays: z.unknown().optional(),
    costAmount: z.unknown().optional(),
    costCurrency: z.unknown().optional(),
    bookingRef: z.unknown().optional(),
    notes: z.unknown().optional(),
  })
  .transform((raw, ctx) => {
    let failed = false;
    const report = (field: HotelField, id: HotelFieldErrorId): void => {
      failed = true;
      ctx.issues.push({ code: "custom", message: id, path: [field], input: raw });
    };

    // --- Name ---
    const name = singleLine(raw.name);
    if (name === null) report("name", HOTEL_FIELD_ERROR.nameRequired);
    else if (codePointLength(name) > HOTEL_NAME_MAX_LENGTH) report("name", HOTEL_FIELD_ERROR.nameTooLong);

    // --- City (directory only; the time zone comes from the record) ---
    const cityId = trimmed(raw.cityPlaceId);
    let city: CityRecord | undefined;
    if (cityId === "") {
      report("city", HOTEL_FIELD_ERROR.cityRequired);
    } else {
      city = findCityById(cityId);
      if (city === undefined) report("city", HOTEL_FIELD_ERROR.cityNotInDirectory);
    }

    // --- Check-in / check-out (local date + time in the hotel's zone) ---
    const inDate = trimmed(raw.checkInDate);
    const inTime = trimmed(raw.checkInTime);
    const outDate = trimmed(raw.checkOutDate);
    const outTime = trimmed(raw.checkOutTime);
    // Times are optional: empty is null; a non-empty malformed value is treated as unknown too
    // (the UI only offers a picker), never defaulted here.
    const inTimeValue: ClockTime | null = isClockTime(inTime) ? inTime : null;
    const outTimeValue: ClockTime | null = isClockTime(outTime) ? outTime : null;
    if (!isCalendarDate(inDate)) report("checkInDate", HOTEL_FIELD_ERROR.checkInDateRequired);
    if (!isCalendarDate(outDate)) report("checkOutDate", HOTEL_FIELD_ERROR.checkOutDateRequired);

    let nights: number | null = null;
    if (isCalendarDate(inDate) && isCalendarDate(outDate)) {
      nights = nightsBetweenDates(inDate, outDate);
      if (nights < 0) report("checkOut", HOTEL_FIELD_ERROR.checkOutNotAfterCheckIn);
      else if (nights > HOTEL_MAX_NIGHTS) report("checkOut", HOTEL_FIELD_ERROR.checkOutStayTooLong);
      else if (nights === 0 && inTimeValue !== null && outTimeValue !== null && outTimeValue <= inTimeValue) {
        report("checkOut", HOTEL_FIELD_ERROR.checkOutNotAfterCheckIn);
      }
    }

    // --- Address / notes (multi-line) ---
    const address = multiLine(raw.address);
    if (address !== null && codePointLength(address) > HOTEL_ADDRESS_MAX_LENGTH) {
      report("address", HOTEL_FIELD_ERROR.addressTooLong);
    }
    const notes = multiLine(raw.notes);
    if (notes !== null && codePointLength(notes) > HOTEL_NOTES_MAX_LENGTH) {
      report("notes", HOTEL_FIELD_ERROR.notesTooLong);
    }

    // --- Booking reference ---
    const bookingRef = singleLine(raw.bookingRef);
    if (bookingRef !== null && codePointLength(bookingRef) > HOTEL_BOOKING_REF_MAX_LENGTH) {
      report("bookingRef", HOTEL_FIELD_ERROR.bookingRefTooLong);
    }

    // --- Maps link ---
    let mapsUrl: string | null = null;
    if (trimmed(raw.mapsUrl) !== "") {
      const parsed = parseMapsUrl(raw.mapsUrl);
      if (parsed.ok) mapsUrl = parsed.url;
      else {
        report(
          "mapsUrl",
          parsed.error === "mapsUrl.tooLong"
            ? HOTEL_FIELD_ERROR.mapsUrlTooLong
            : HOTEL_FIELD_ERROR.mapsUrlNotGoogleMaps,
        );
      }
    }

    // --- Guests ---
    let guests = HOTEL_GUESTS_MIN;
    if (raw.guests !== undefined && raw.guests !== null) {
      const value = raw.guests;
      if (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= HOTEL_GUESTS_MIN &&
        value <= HOTEL_GUESTS_MAX
      ) {
        guests = value;
      } else {
        report("guests", HOTEL_FIELD_ERROR.guestsRange);
      }
    }

    // --- Parking / breakfast ---
    let parking: HotelParking = "none";
    if (raw.parking !== undefined && raw.parking !== null) {
      const found = HOTEL_PARKING.find((option) => option === raw.parking);
      if (found === undefined) report("parking", HOTEL_FIELD_ERROR.parkingInvalid);
      else parking = found;
    }
    let breakfast: HotelBreakfast = "none";
    if (raw.breakfast !== undefined && raw.breakfast !== null) {
      const found = HOTEL_BREAKFAST.find((option) => option === raw.breakfast);
      if (found === undefined) report("breakfast", HOTEL_FIELD_ERROR.breakfastInvalid);
      else breakfast = found;
    }

    // --- Breakfast days (only for "partial") ---
    let breakfastDays: number | null = null;
    if (breakfast === "partial") {
      const range = breakfastDaysRange(nights);
      const value = raw.breakfastDays;
      if (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= range.min &&
        value <= range.max
      ) {
        breakfastDays = value;
      } else {
        report("breakfastDays", HOTEL_FIELD_ERROR.breakfastDaysRange);
      }
    }

    // --- Cost: amount and currency come as a pair ---
    let cost: { amount: string; currency: CurrencyCode } | null = null;
    const amountText = trimmed(raw.costAmount);
    const currencyText = trimmed(raw.costCurrency).toUpperCase();
    // An empty amount means "no cost" whatever the currency is (AC-39): the currency alone is not an error.
    if (amountText !== "") {
      if (currencyText === "") {
        report("costCurrency", HOTEL_FIELD_ERROR.costCurrencyMissing);
      } else {
        const amount = parseMoneyAmount(amountText);
        if (!amount.ok) report("costAmount", HOTEL_FIELD_ERROR.costAmountFormat);
        if (!isCurrencyCode(currencyText)) report("costCurrency", HOTEL_FIELD_ERROR.costCurrencyUnknown);
        else if (amount.ok) cost = { amount: amount.amount, currency: currencyText };
      }
    }

    if (
      failed ||
      name === null ||
      city === undefined ||
      !isCalendarDate(inDate) ||
      !isCalendarDate(outDate)
    ) {
      return z.NEVER;
    }

    const value: HotelFormValue = {
      name,
      city,
      timeZone: city.timeZone,
      address,
      mapsUrl,
      checkInDate: inDate,
      checkOutDate: outDate,
      checkInTime: inTimeValue,
      checkOutTime: outTimeValue,
      guests,
      parking,
      breakfast,
      breakfastDays,
      cost,
      bookingRef,
      notes,
    };
    return value;
  });

/** Validates a hotel form: never throws, returns ids (never texts) on failure. */
export function parseHotelForm(input: unknown): HotelFormResult {
  return parseForm(hotelFormSchema, input, isHotelFieldErrorId);
}
