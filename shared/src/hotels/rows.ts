import { z } from "zod";
import { parseMoneyAmount } from "../money/amount";
import { isCurrencyCode } from "../money/currencies";
import type { CityRecord } from "../places/schema";
import { findCityById } from "../places/search";
import { isValidTimeZone } from "../places/timeZone";
import {
  HOTEL_ADDRESS_MAX_LENGTH,
  HOTEL_BOOKING_REF_MAX_LENGTH,
  HOTEL_BREAKFAST,
  HOTEL_GUESTS_MAX,
  HOTEL_GUESTS_MIN,
  HOTEL_NAME_MAX_LENGTH,
  HOTEL_NOTES_MAX_LENGTH,
  HOTEL_PARKING,
  type HotelFormValue,
} from "./schemas";

const ISO_INSTANT = z.iso.datetime({ offset: true });
const SOURCE = z.enum(["manual", "imported_pending", "imported_confirmed"]);

/** `numeric(12,2)` arrives as a JSON number or a string; both become the canonical "12.50". */
const costAmountColumn = z
  .union([z.number(), z.string()])
  .nullable()
  .transform((value, ctx): string | null => {
    if (value === null) return null;
    const text = typeof value === "number" ? (Number.isFinite(value) ? value.toFixed(2) : "") : value;
    const parsed = parseMoneyAmount(text);
    if (!parsed.ok) {
      ctx.issues.push({ code: "custom", message: "trip_hotels row: bad cost_amount", input: value });
      return z.NEVER;
    }
    return parsed.amount;
  });

/**
 * A `trip_hotels` row as PostgREST returns it, validated as `unknown`: a row that fails is a load
 * ERROR, never a half-filled card. Corrupt rows: unknown city, bad time zone, bad enum, bad amount.
 */
export const hotelRowSchema = z
  .object({
    id: z.string().min(1),
    trip_id: z.string().min(1),
    source: SOURCE,
    name: z.string().min(1).max(HOTEL_NAME_MAX_LENGTH),
    city_place_id: z.string().min(1),
    time_zone: z.string().refine(isValidTimeZone),
    address: z.string().min(1).max(HOTEL_ADDRESS_MAX_LENGTH).nullable(),
    maps_url: z.string().min(1).nullable(),
    check_in_at: ISO_INSTANT,
    check_out_at: ISO_INSTANT,
    guests: z.number().int().min(HOTEL_GUESTS_MIN).max(HOTEL_GUESTS_MAX),
    parking: z.enum(HOTEL_PARKING),
    breakfast: z.enum(HOTEL_BREAKFAST),
    breakfast_days: z.number().int().min(1).nullable(),
    cost_amount: costAmountColumn,
    cost_currency: z.string().nullable(),
    booking_ref: z.string().min(1).max(HOTEL_BOOKING_REF_MAX_LENGTH).nullable(),
    notes: z.string().min(1).max(HOTEL_NOTES_MAX_LENGTH).nullable(),
    created_at: ISO_INSTANT,
    updated_at: ISO_INSTANT,
  })
  .check((ctx) => {
    const { value } = ctx;
    if (findCityById(value.city_place_id) === undefined) {
      ctx.issues.push({
        code: "custom",
        message: "trip_hotels row: unknown city_place_id",
        path: ["city_place_id"],
        input: value,
      });
    }
    if ((value.cost_amount === null) !== (value.cost_currency === null)) {
      ctx.issues.push({
        code: "custom",
        message: "trip_hotels row: cost is a pair",
        path: ["cost_currency"],
        input: value,
      });
    } else if (value.cost_currency !== null && !isCurrencyCode(value.cost_currency)) {
      ctx.issues.push({
        code: "custom",
        message: "trip_hotels row: unknown cost_currency",
        path: ["cost_currency"],
        input: value,
      });
    }
  });

export type HotelRow = z.output<typeof hotelRowSchema>;

/** The domain hotel: the validated form value plus identity. */
export type Hotel = HotelFormValue & { id: string; tripId: string; source: HotelRow["source"] };

function knownCity(id: string): CityRecord {
  const city = findCityById(id);
  if (city === undefined) {
    throw new RangeError(`Unknown city "${id}": hotelRowSchema should have rejected this row`);
  }
  return city;
}

/** A validated row to the domain hotel. */
export function toHotel(row: HotelRow): Hotel {
  const currency = row.cost_currency;
  return {
    id: row.id,
    tripId: row.trip_id,
    source: row.source,
    name: row.name,
    city: knownCity(row.city_place_id),
    timeZone: row.time_zone,
    address: row.address,
    mapsUrl: row.maps_url,
    checkInAt: new Date(row.check_in_at),
    checkOutAt: new Date(row.check_out_at),
    guests: row.guests,
    parking: row.parking,
    breakfast: row.breakfast,
    breakfastDays: row.breakfast_days,
    cost:
      row.cost_amount !== null && currency !== null && isCurrencyCode(currency)
        ? { amount: row.cost_amount, currency }
        : null,
    bookingRef: row.booking_ref,
    notes: row.notes,
  };
}

/** `unknown` row to `Hotel`, in one `safeParse`. */
export const hotelFromRowSchema = hotelRowSchema.transform(toHotel);

export type HotelWrite = {
  trip_id: string;
  source: "manual";
  name: string;
  city_place_id: string;
  time_zone: string;
  address: string | null;
  maps_url: string | null;
  check_in_at: string;
  check_out_at: string;
  guests: number;
  parking: HotelFormValue["parking"];
  breakfast: HotelFormValue["breakfast"];
  breakfast_days: number | null;
  cost_amount: number | null;
  cost_currency: string | null;
  booking_ref: string | null;
  notes: string | null;
};

/** The ONE mapping of a validated form to columns (create and update). `source` is always manual. */
export function toHotelWrite(value: HotelFormValue, tripId: string): HotelWrite {
  return {
    trip_id: tripId,
    source: "manual",
    name: value.name,
    city_place_id: value.city.id,
    time_zone: value.timeZone,
    address: value.address,
    maps_url: value.mapsUrl,
    check_in_at: value.checkInAt.toISOString(),
    check_out_at: value.checkOutAt.toISOString(),
    guests: value.guests,
    parking: value.parking,
    breakfast: value.breakfast,
    breakfast_days: value.breakfastDays,
    cost_amount: value.cost === null ? null : Number(value.cost.amount),
    cost_currency: value.cost === null ? null : value.cost.currency,
    booking_ref: value.bookingRef,
    notes: value.notes,
  };
}
