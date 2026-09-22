import { AIRLINES } from "./airlines";
import type { AirlineRecord } from "./schema";

/**
 * A valid flight number: a two-character IATA designator (letters/digits, e.g. `9W`, `U2`) followed
 * by a 1-4 digit flight number and an optional single letter suffix (`BA667A`). The ICAO three-letter
 * form is deliberately rejected (Q-A): the form has exactly one designator length, not two.
 */
export const FLIGHT_NUMBER_PATTERN = /^[A-Z0-9]{2}[0-9]{1,4}[A-Z]?$/;

/** Upper-cases and strips spaces/dashes: what a user might type becomes what we compare/store. */
export function normalizeFlightNumber(input: string): string {
  return input.toUpperCase().replace(/[\s-]+/g, "");
}

export interface ParsedFlightNumber {
  /** The normalized flight number (empty string for empty input). */
  normalized: string;
  /** The two-character designator, or `null` when the input doesn't match the pattern. */
  designator: string | null;
  /** Whether `normalized` is valid. An EMPTY string is valid (flight number is optional, Q-A). */
  valid: boolean;
}

/**
 * Parses free-form flight-number input. Synchronous and total: never throws. An empty (or
 * whitespace-only) input is a VALID "no flight number" (the field is optional).
 */
export function parseFlightNumber(input: string): ParsedFlightNumber {
  const normalized = normalizeFlightNumber(input);
  if (normalized === "") {
    return { normalized: "", designator: null, valid: true };
  }
  const valid = FLIGHT_NUMBER_PATTERN.test(normalized);
  const designator = valid ? normalized.slice(0, 2) : null;
  return { normalized, designator, valid };
}

const AIRLINE_BY_DESIGNATOR_LAZY: { map: ReadonlyMap<string, AirlineRecord> | null } = { map: null };

function airlineMap(): ReadonlyMap<string, AirlineRecord> {
  // Lazy on first call (Non-functional: no work at module import time, AC-18).
  if (AIRLINE_BY_DESIGNATOR_LAZY.map === null) {
    AIRLINE_BY_DESIGNATOR_LAZY.map = new Map(AIRLINES.map((a) => [a.designator, a]));
  }
  return AIRLINE_BY_DESIGNATOR_LAZY.map;
}

/** The airline with this two-character designator, or `undefined` when it isn't in the directory. */
export function findAirline(designator: string): AirlineRecord | undefined {
  return airlineMap().get(designator.toUpperCase());
}
