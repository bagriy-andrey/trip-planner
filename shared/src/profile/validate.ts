import { isCurrencyCode } from "../money/currencies";
import { findAirportByCode } from "../places/airportSearch";
import { PLACE_DIRECTORY } from "../places/directory";
import { findCityById } from "../places/search";
import { PROFILE_WRITE_ERROR } from "./errorCodes";
import type { ProfileWriteErrorId } from "./errorCodes";
import type { Profile, ProfilePatch } from "./types";

export type ProfileValidation = { ok: true } | { ok: false; errors: ProfileWriteErrorId[] };

function isCountryCode(code: string): boolean {
  return PLACE_DIRECTORY.some((place) => place.kind === "country" && place.countryCode === code);
}

/**
 * Write-time check of a patch. Directory membership is checked ONLY for columns present in the patch
 * and not null: a foreign value already stored and not touched never blocks a write (AC-27).
 * Consistency (city vs residence) runs only when the patch touches `homeCity` or `residence`.
 */
export function validateProfilePatch(current: Profile, patch: ProfilePatch): ProfileValidation {
  const errors: ProfileWriteErrorId[] = [];
  const { citizenship, residence, homeCityId, homeAirport, homeCurrency } = patch;

  if (typeof citizenship === "string" && !isCountryCode(citizenship)) {
    errors.push(PROFILE_WRITE_ERROR.citizenshipUnknown);
  }
  if (typeof residence === "string" && !isCountryCode(residence)) {
    errors.push(PROFILE_WRITE_ERROR.residenceUnknown);
  }
  if (typeof homeCityId === "string" && findCityById(homeCityId) === undefined) {
    errors.push(PROFILE_WRITE_ERROR.homeCityUnknown);
  }
  if (typeof homeAirport === "string" && findAirportByCode(homeAirport) === undefined) {
    errors.push(PROFILE_WRITE_ERROR.homeAirportUnknown);
  }
  if (typeof homeCurrency === "string" && !isCurrencyCode(homeCurrency)) {
    errors.push(PROFILE_WRITE_ERROR.homeCurrencyUnknown);
  }

  if (patch.homeCityId !== undefined || patch.residence !== undefined) {
    const next: Profile = { ...current, ...patch };
    const city = next.homeCityId === null ? undefined : findCityById(next.homeCityId);
    if (city !== undefined) {
      if (next.residence === null) errors.push(PROFILE_WRITE_ERROR.homeCityResidenceMissing);
      else if (next.residence !== city.countryCode) errors.push(PROFILE_WRITE_ERROR.homeCityCountryMismatch);
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
