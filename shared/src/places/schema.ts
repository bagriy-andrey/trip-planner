import { z } from "zod";
import { isValidTimeZone } from "./timeZone";

/**
 * Stable region ids of a country record. These are identifiers, NOT display strings: the client
 * localizes them through its own i18n keys. Adding/removing a value is a contract change.
 */
export const PLACE_REGIONS = [
  "europe",
  "asia",
  "middle-east",
  "africa",
  "north-america",
  "south-america",
  "oceania",
] as const;

export type PlaceRegion = (typeof PLACE_REGIONS)[number];

/** ISO 3166-1 alpha-2 (Q-A): the same shape the `trips.country_code` DB check enforces. */
export const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;
/** IATA airport code: three upper-case Latin letters (same as the `trips.airport_code` check). */
export const AIRPORT_CODE_PATTERN = /^[A-Z]{3}$/;

const name = z.string().min(1);
const countryCode = z.string().regex(COUNTRY_CODE_PATTERN);

export const cityRecordSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("city"),
  ru: name,
  en: name,
  countryCode,
  timeZone: z.string().refine(isValidTimeZone),
  /** Main airport; a city without an airport of its own leaves it out. */
  airportCode: z.string().regex(AIRPORT_CODE_PATTERN).optional(),
});

export const countryRecordSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("country"),
  ru: name,
  en: name,
  /** ISO alpha-2: what `trips.country_code` stores for a country place. */
  countryCode,
  region: z.enum(PLACE_REGIONS),
});

/** One directory entry, discriminated by `kind`. */
export const placeRecordSchema = z.discriminatedUnion("kind", [
  cityRecordSchema,
  countryRecordSchema,
]);

export type CityRecord = z.infer<typeof cityRecordSchema>;
export type CountryRecord = z.infer<typeof countryRecordSchema>;
export type PlaceRecord = z.infer<typeof placeRecordSchema>;
export type PlaceKind = PlaceRecord["kind"];
/** UI languages a place can be named in. */
export type PlaceLanguage = "ru" | "en";

/**
 * An airport, one city can have several (Q-A / SPEC-04). Lives NEXT TO `placeRecordSchema`, not
 * inside it: `placeRecordSchema` stays a union of city|country ONLY, because `searchPlaces` (S8,
 * trip origin/destination) and `trips.place_kind` in the DB must keep accepting exactly
 * `city|country|custom` — adding `airport` there would be a silent contract change nobody asked
 * for. `cityId` must reference a `CityRecord` already in `PLACE_DIRECTORY` (shared/insights.md:
 * ids are stable forever, never invented ad hoc).
 */
export const airportRecordSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("airport"),
  iata: z.string().regex(AIRPORT_CODE_PATTERN),
  ru: z.string().min(1),
  en: z.string().min(1),
  cityId: z.string().min(1),
  /** Duplicated from the owning city for cheap lookups without a join. */
  countryCode,
  timeZone: z.string().refine(isValidTimeZone),
  /** Exactly one airport per city carries `true` (AC-13); it is the one `city.airportCode` names. */
  isPrimary: z.boolean(),
});

export type AirportRecord = z.infer<typeof airportRecordSchema>;
