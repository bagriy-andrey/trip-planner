import { z } from "zod";
import { parseMoneyAmount } from "../money/amount";
import { isCurrencyCode } from "../money/currencies";
import { isClockTime } from "../segments/time";
import { isCalendarDate } from "../trips/calendarDate";
import {
  CAR_ADDRESS_MAX_LENGTH,
  CAR_BOOKING_REF_MAX_LENGTH,
  CAR_CLASS_MAX_LENGTH,
  CAR_COMPANY_MAX_LENGTH,
  CAR_FUEL_POLICY,
  CAR_INSURANCE,
  CAR_NOTES_MAX_LENGTH,
  CAR_PAYMENT_STATUS,
  CAR_PLACE_MAX_LENGTH,
  type CarFormValue,
} from "./schemas";

const ISO_INSTANT = z.iso.datetime({ offset: true });
const DATE_COLUMN = z.string().refine(isCalendarDate);
/** Postgres `time` arrives as "HH:MM:SS"; normalised to "HH:MM". Both rental times are NOT NULL. */
const timeColumn = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/)
  .transform((v) => v.slice(0, 5))
  .refine(isClockTime);
const SOURCE = z.enum(["manual", "imported_pending", "imported_confirmed"]);

/** `numeric(12,2)` arrives as a JSON number or a string; both become the canonical "12.50". */
const amountColumn = (column: string) =>
  z
    .union([z.number(), z.string()])
    .nullable()
    .transform((value, ctx): string | null => {
      if (value === null) return null;
      const text = typeof value === "number" ? (Number.isFinite(value) ? value.toFixed(2) : "") : value;
      const parsed = parseMoneyAmount(text);
      if (!parsed.ok) {
        ctx.issues.push({ code: "custom", message: `trip_cars row: bad ${column}`, input: value });
        return z.NEVER;
      }
      return parsed.amount;
    });

const text = (max: number) => z.string().min(1).max(max).nullable();

/**
 * A `trip_cars` row as PostgREST returns it, validated as `unknown`: a row that fails is a load
 * ERROR, never a half-filled card.
 */
export const carRowSchema = z
  .object({
    id: z.string().min(1),
    trip_id: z.string().min(1),
    source: SOURCE,
    booking_ref: z.string().min(1).max(CAR_BOOKING_REF_MAX_LENGTH),
    company: text(CAR_COMPANY_MAX_LENGTH),
    pickup_place: z.string().min(1).max(CAR_PLACE_MAX_LENGTH),
    pickup_date: DATE_COLUMN,
    pickup_time: timeColumn,
    return_date: DATE_COLUMN,
    return_time: timeColumn,
    return_same_place: z.boolean(),
    return_place: text(CAR_PLACE_MAX_LENGTH),
    maps_url: z.string().min(1).nullable(),
    address: text(CAR_ADDRESS_MAX_LENGTH),
    phone: z.string().min(1).nullable(),
    car_class: text(CAR_CLASS_MAX_LENGTH),
    insurance: z.enum(CAR_INSURANCE).nullable(),
    fuel_policy: z.enum(CAR_FUEL_POLICY).nullable(),
    cost_amount: amountColumn("cost_amount"),
    cost_currency: z.string().nullable(),
    payment_status: z.enum(CAR_PAYMENT_STATUS).nullable(),
    extra_driver: z.boolean(),
    deposit_amount: amountColumn("deposit_amount"),
    notes: text(CAR_NOTES_MAX_LENGTH),
    created_at: ISO_INSTANT,
    updated_at: ISO_INSTANT,
  })
  .check((ctx) => {
    const { value } = ctx;
    const hasAmount = value.cost_amount !== null || value.deposit_amount !== null;
    if (hasAmount !== (value.cost_currency !== null)) {
      ctx.issues.push({
        code: "custom",
        message: "trip_cars row: currency pairs with an amount",
        path: ["cost_currency"],
        input: value,
      });
    } else if (value.cost_currency !== null && !isCurrencyCode(value.cost_currency)) {
      ctx.issues.push({
        code: "custom",
        message: "trip_cars row: unknown cost_currency",
        path: ["cost_currency"],
        input: value,
      });
    }
    if ((value.return_place === null) !== value.return_same_place) {
      ctx.issues.push({
        code: "custom",
        message: "trip_cars row: return_place pairs with return_same_place",
        path: ["return_place"],
        input: value,
      });
    }
  });

export type CarRow = z.output<typeof carRowSchema>;

/** The domain rental: the validated form value plus identity. */
export type Car = CarFormValue & { id: string; tripId: string; source: CarRow["source"] };

/** A validated row to the domain rental. */
export function toCar(row: CarRow): Car {
  const currency = row.cost_currency;
  return {
    id: row.id,
    tripId: row.trip_id,
    source: row.source,
    bookingRef: row.booking_ref,
    company: row.company,
    pickupPlace: row.pickup_place,
    pickupDate: row.pickup_date,
    returnDate: row.return_date,
    pickupTime: row.pickup_time,
    returnTime: row.return_time,
    returnSamePlace: row.return_same_place,
    returnPlace: row.return_place,
    mapsUrl: row.maps_url,
    address: row.address,
    phone: row.phone,
    carClass: row.car_class,
    insurance: row.insurance,
    fuelPolicy: row.fuel_policy,
    paymentStatus: row.payment_status,
    money:
      currency !== null && isCurrencyCode(currency)
        ? { currency, cost: row.cost_amount, deposit: row.deposit_amount }
        : null,
    extraDriver: row.extra_driver,
    notes: row.notes,
  };
}

/** `unknown` row to `Car`, in one `safeParse`. */
export const carFromRowSchema = carRowSchema.transform(toCar);

export type CarWrite = {
  trip_id: string;
  source: "manual";
  booking_ref: string;
  company: string | null;
  pickup_place: string;
  pickup_date: string;
  pickup_time: string;
  return_date: string;
  return_time: string;
  return_same_place: boolean;
  return_place: string | null;
  maps_url: string | null;
  address: string | null;
  phone: string | null;
  car_class: string | null;
  insurance: CarFormValue["insurance"];
  fuel_policy: CarFormValue["fuelPolicy"];
  cost_amount: number | null;
  cost_currency: string | null;
  payment_status: CarFormValue["paymentStatus"];
  extra_driver: boolean;
  deposit_amount: number | null;
  notes: string | null;
};

/** The ONE mapping of a validated form to columns (create and update). `source` is always manual. */
export function toCarWrite(value: CarFormValue, tripId: string): CarWrite {
  const { money } = value;
  return {
    trip_id: tripId,
    source: "manual",
    booking_ref: value.bookingRef,
    company: value.company,
    pickup_place: value.pickupPlace,
    pickup_date: value.pickupDate,
    pickup_time: value.pickupTime,
    return_date: value.returnDate,
    return_time: value.returnTime,
    return_same_place: value.returnSamePlace,
    return_place: value.returnPlace,
    maps_url: value.mapsUrl,
    address: value.address,
    phone: value.phone,
    car_class: value.carClass,
    insurance: value.insurance,
    fuel_policy: value.fuelPolicy,
    cost_amount: money?.cost == null ? null : Number(money.cost),
    cost_currency: money === null ? null : money.currency,
    payment_status: value.paymentStatus,
    extra_driver: value.extraDriver,
    deposit_amount: money?.deposit == null ? null : Number(money.deposit),
    notes: value.notes,
  };
}
