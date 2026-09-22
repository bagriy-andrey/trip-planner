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
