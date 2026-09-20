// Static sample content for S7. The screen is deliberately independent of the
// route's `tripId` (edge case "arbitrary tripId"): every trip shows this.

const DAY_MS = 24 * 60 * 60 * 1000;

const START = new Date("2026-09-24T00:00:00Z");
const END = new Date("2026-09-30T00:00:00Z");

/** Same sample trip as the "in 5 days" card on the Trips tab. */
export const TRIP_DETAIL_PLACEHOLDER = {
  /** Key in the `trips` namespace. */
  cityKey: "sample.krakow",
  start: START,
  end: END,
  nights: Math.round((END.getTime() - START.getTime()) / DAY_MS),
} as const;

export interface FlightPlaceholder {
  id: string;
  /** IATA codes are ticket data, not translatable copy. */
  from: string;
  to: string;
  departure: Date;
  baggageIncluded: boolean;
  passengers: number;
}

export const FLIGHT_PLACEHOLDERS: readonly FlightPlaceholder[] = [
  {
    id: "flight-outbound",
    from: "WAW",
    to: "KRK",
    departure: new Date("2026-09-24T07:40:00Z"),
    baggageIncluded: true,
    passengers: 2,
  },
  {
    id: "flight-return",
    from: "KRK",
    to: "WAW",
    departure: new Date("2026-09-30T18:15:00Z"),
    baggageIncluded: false,
    passengers: 2,
  },
];

export interface HotelPlaceholder {
  checkIn: Date;
  checkOut: Date;
  /** Days covered by the stay and how many of them include breakfast. */
  totalDays: number;
  breakfastDays: number;
}

export const HOTEL_PLACEHOLDER: HotelPlaceholder = {
  checkIn: START,
  checkOut: END,
  totalDays: 6,
  breakfastDays: 5,
};
