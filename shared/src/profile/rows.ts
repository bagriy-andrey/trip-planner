import { z } from "zod";
import { EMPTY_PROFILE } from "./types";
import type { Profile, ProfilePatch } from "./types";

const countryCode = z.string().regex(/^[A-Z]{2}$/).nullable();
const threeLetters = z.string().regex(/^[A-Z]{3}$/).nullable();
const cityId = z.string().max(64).regex(/^city-[a-z0-9-]+$/).nullable();

/** Format-only check of a `profiles` row (AC-27): directory membership is NOT verified on read. */
export const profileRowSchema = z.object({
  user_id: z.string(),
  citizenship_country_code: countryCode,
  residence_country_code: countryCode,
  home_city_place_id: cityId,
  home_airport_code: threeLetters,
  home_currency: threeLetters,
});

export type ProfileRow = z.output<typeof profileRowSchema>;

/** Row to domain profile; a missing row (`null`) is the empty profile (AC-7). */
export function toProfile(row: ProfileRow | null): Profile {
  if (row === null) return EMPTY_PROFILE;
  return {
    citizenship: row.citizenship_country_code,
    residence: row.residence_country_code,
    homeCityId: row.home_city_place_id,
    homeAirport: row.home_airport_code,
    homeCurrency: row.home_currency,
  };
}

export const profileFromRowSchema = profileRowSchema.transform(toProfile);

export type ProfileWrite = {
  user_id: string;
  citizenship_country_code?: string | null;
  residence_country_code?: string | null;
  home_city_place_id?: string | null;
  home_airport_code?: string | null;
  home_currency?: string | null;
};

/** Upsert payload with ONLY the keys present in the patch, plus `user_id` (AC-8). */
export function toProfileWrite(userId: string, patch: ProfilePatch): ProfileWrite {
  const write: ProfileWrite = { user_id: userId };
  if (patch.citizenship !== undefined) write.citizenship_country_code = patch.citizenship;
  if (patch.residence !== undefined) write.residence_country_code = patch.residence;
  if (patch.homeCityId !== undefined) write.home_city_place_id = patch.homeCityId;
  if (patch.homeAirport !== undefined) write.home_airport_code = patch.homeAirport;
  if (patch.homeCurrency !== undefined) write.home_currency = patch.homeCurrency;
  return write;
}
