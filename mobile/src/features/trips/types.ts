/** How a trip is presented: drives the pill tone and label (S4/S5). */
export type TripStatusKind = "upcoming" | "planned" | "draft" | "completed";

/** Everything a trip card needs to render. Static in the skeleton; real data replaces it later. */
export interface TripCardData {
  id: string;
  /** Already translated display name of the city. */
  city: string;
  /** Null for a draft trip without dates. */
  start: Date | null;
  end: Date | null;
  status: TripStatusKind;
  /** Picks the colour of the cover placeholder. */
  coverIndex: number;
}

/** Static sample trip: like `TripCardData`, but the city is an i18n key resolved by the screen. */
export type TripPlaceholder<CityKey extends string = string> = Omit<TripCardData, "city"> & {
  cityKey: CityKey;
};
