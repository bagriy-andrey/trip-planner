/**
 * Stable ids of profile WRITE errors (ids, NOT texts). The UI never produces such a patch, so these
 * are never shown: they guard against a programming error or a foreign client. The literal list is
 * pinned in `__tests__/validate.test.ts`.
 */
export const PROFILE_WRITE_ERROR = {
  citizenshipUnknown: "citizenship.unknown",
  residenceUnknown: "residence.unknown",
  homeCityUnknown: "homeCity.unknown",
  homeAirportUnknown: "homeAirport.unknown",
  homeCurrencyUnknown: "homeCurrency.unknown",
  homeCityCountryMismatch: "homeCity.countryMismatch",
  homeCityResidenceMissing: "homeCity.residenceMissing",
  homeCityNameInvalid: "homeCity.nameInvalid",
  homeCityNameConflict: "homeCity.nameConflict",
} as const;

export type ProfileWriteErrorId = (typeof PROFILE_WRITE_ERROR)[keyof typeof PROFILE_WRITE_ERROR];
