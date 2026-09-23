import { z } from "zod";

/** Two-character IATA airline designator: letters and digits (`9W`, `U2`, `LO`, ...). */
export const AIRLINE_DESIGNATOR_PATTERN = /^[A-Z0-9]{2}$/;

/**
 * One airline. Names are NOT localized (Q-A / spec decision): the same English/Latin trade name is
 * shown in both UI languages — airline brand names are proper nouns travellers already recognize
 * from tickets and boarding passes, translating them would make them harder to match, not easier.
 */
export const airlineRecordSchema = z.object({
  designator: z.string().regex(AIRLINE_DESIGNATOR_PATTERN),
  name: z.string().min(1),
  countryCode: z.string().regex(/^[A-Z]{2}$/),
});

export type AirlineRecord = z.infer<typeof airlineRecordSchema>;
