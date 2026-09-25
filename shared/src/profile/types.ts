/** The optional "about me" block. Every field is a persisted code/id or `null` (empty). */
export type Profile = {
  /** ISO alpha-2 country code. */
  citizenship: string | null;
  /** ISO alpha-2 country code. */
  residence: string | null;
  /** Place-directory city id (`city-…`). */
  homeCityId: string | null;
  /** The user's own city text when it is not in the directory; never set together with `homeCityId`. */
  homeCityName: string | null;
  /** IATA code. */
  homeAirport: string | null;
  /** ISO 4217 code. */
  homeCurrency: string | null;
};

export const EMPTY_PROFILE: Profile = {
  citizenship: null,
  residence: null,
  homeCityId: null,
  homeCityName: null,
  homeAirport: null,
  homeCurrency: null,
};

/** The five editable rows of the profile screen. */
export type ProfileField = "citizenship" | "residence" | "homeCity" | "homeAirport" | "homeCurrency";

/** Changed columns only (AC-8). */
export type ProfilePatch = Partial<Profile>;
