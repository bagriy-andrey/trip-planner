/** How a trip is presented: drives the pill tone and label (S4/S5). */
export type TripStatusKind = "upcoming" | "planned" | "draft" | "completed";

/** Everything a trip card needs to render. Mock data today; real data replaces it later. */
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
