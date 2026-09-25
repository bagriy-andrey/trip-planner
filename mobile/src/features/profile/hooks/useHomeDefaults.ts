import { homeCurrencyDefault } from "@tripplanner/shared";
import type { CurrencyCode } from "@tripplanner/shared";

import { useProfileQuery } from "./useProfileQuery";

export interface HomeDefaults {
  homeAirport: string | null;
  homeCurrency: CurrencyCode | null;
}

/**
 * For other features (forms): the home airport and currency from data that has ALREADY arrived.
 * Never waits (AC-36); loading or an error is `null` (AC-38 for the currency).
 */
export function useHomeDefaults(): HomeDefaults {
  const { profile } = useProfileQuery();
  return {
    homeAirport: profile?.homeAirport ?? null,
    homeCurrency: homeCurrencyDefault(profile?.homeCurrency ?? null),
  };
}
