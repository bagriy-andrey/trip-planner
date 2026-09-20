// Mock content for the app until the Supabase data layer exists (see mobile/AGENTS.md).
// One realistic traveller (Warsaw-based) with real routes, airports, hotels and timezones.
// Everything is deterministic: screens render relative to `MOCK_NOW`, never the device clock.
//
// Data, not copy: IATA codes, hotel names and the user's name are proper nouns and are NOT
// translated. City names are; they are i18n keys in the `trips` namespace.

import type { TripStatusKind } from "@/features/trips/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Fixed "now": the nearest trip starts 5 days later, so its accent pill reads "in 5 days". */
export const MOCK_NOW = new Date("2026-09-20T09:00:00Z");

export type MockCityKey =
  | "cities.lisbon"
  | "cities.barcelona"
  | "cities.vienna"
  | "cities.tokyo"
  | "cities.rome"
  | "cities.prague"
  | "cities.amsterdam";

export interface MockFlight {
  id: string;
  /** IATA airport codes are ticket data, not translatable copy. */
  from: string;
  to: string;
  /** Absolute instant (UTC), like the real data: time = UTC + IANA tz id. */
  departure: Date;
  /** IANA id of the departure airport; the card shows the local wall-clock time. */
  timeZone: string;
  baggageIncluded: boolean;
  passengers: number;
}

export interface MockHotel {
  name: string;
  checkIn: Date;
  checkOut: Date;
  /** How many of the nights include breakfast. */
  breakfastDays: number;
}

export interface MockTrip {
  id: string;
  cityKey: MockCityKey;
  /** Null for a draft trip without dates. */
  start: Date | null;
  end: Date | null;
  status: TripStatusKind;
  /** Picks the colour of the cover placeholder. */
  coverIndex: number;
  flights: readonly MockFlight[];
  hotel: MockHotel | null;
}

/** Whole nights between two UTC-midnight dates. */
export function nightsBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

const utc = (iso: string) => new Date(iso);

// Airport local time -> UTC in the comments below (CEST = UTC+2 until 2026-10-25, CET = UTC+1).
export const MOCK_TRIPS: readonly MockTrip[] = [
  {
    id: "trip-lisbon",
    cityKey: "cities.lisbon",
    start: utc("2026-09-25T00:00:00Z"),
    end: utc("2026-10-01T00:00:00Z"),
    status: "upcoming",
    coverIndex: 0,
    flights: [
      {
        id: "flight-lisbon-outbound",
        from: "WAW",
        to: "LIS",
        // 06:10 CEST
        departure: utc("2026-09-25T04:10:00Z"),
        timeZone: "Europe/Warsaw",
        baggageIncluded: true,
        passengers: 2,
      },
      {
        id: "flight-lisbon-return",
        from: "LIS",
        to: "WAW",
        // 16:35 WEST (UTC+1)
        departure: utc("2026-10-01T15:35:00Z"),
        timeZone: "Europe/Lisbon",
        baggageIncluded: false,
        passengers: 2,
      },
    ],
    hotel: {
      name: "Memmo Alfama",
      checkIn: utc("2026-09-25T00:00:00Z"),
      checkOut: utc("2026-10-01T00:00:00Z"),
      breakfastDays: 6,
    },
  },
  {
    id: "trip-barcelona",
    cityKey: "cities.barcelona",
    start: utc("2026-10-16T00:00:00Z"),
    end: utc("2026-10-22T00:00:00Z"),
    status: "planned",
    coverIndex: 1,
    flights: [
      {
        id: "flight-barcelona-outbound",
        from: "WAW",
        to: "BCN",
        // 07:25 CEST
        departure: utc("2026-10-16T05:25:00Z"),
        timeZone: "Europe/Warsaw",
        baggageIncluded: true,
        passengers: 2,
      },
      {
        id: "flight-barcelona-return",
        from: "BCN",
        to: "WAW",
        // 20:50 CEST
        departure: utc("2026-10-22T18:50:00Z"),
        timeZone: "Europe/Madrid",
        baggageIncluded: true,
        passengers: 2,
      },
    ],
    hotel: {
      name: "Hotel Casa Bonay",
      checkIn: utc("2026-10-16T00:00:00Z"),
      checkOut: utc("2026-10-22T00:00:00Z"),
      breakfastDays: 0,
    },
  },
  {
    id: "trip-vienna",
    cityKey: "cities.vienna",
    start: utc("2026-11-05T00:00:00Z"),
    end: utc("2026-11-08T00:00:00Z"),
    status: "planned",
    coverIndex: 2,
    flights: [
      {
        id: "flight-vienna-outbound",
        from: "WAW",
        to: "VIE",
        // 11:00 CET
        departure: utc("2026-11-05T10:00:00Z"),
        timeZone: "Europe/Warsaw",
        baggageIncluded: false,
        passengers: 1,
      },
      {
        id: "flight-vienna-return",
        from: "VIE",
        to: "WAW",
        // 19:15 CET
        departure: utc("2026-11-08T18:15:00Z"),
        timeZone: "Europe/Vienna",
        baggageIncluded: false,
        passengers: 1,
      },
    ],
    hotel: {
      name: "Hotel Sans Souci Wien",
      checkIn: utc("2026-11-05T00:00:00Z"),
      checkOut: utc("2026-11-08T00:00:00Z"),
      breakfastDays: 3,
    },
  },
  {
    // A draft: destination only, nothing booked and no dates yet.
    id: "trip-tokyo",
    cityKey: "cities.tokyo",
    start: null,
    end: null,
    status: "draft",
    coverIndex: 3,
    flights: [],
    hotel: null,
  },
  {
    id: "trip-rome",
    cityKey: "cities.rome",
    start: utc("2026-06-03T00:00:00Z"),
    end: utc("2026-06-09T00:00:00Z"),
    status: "completed",
    coverIndex: 1,
    flights: [
      {
        id: "flight-rome-outbound",
        from: "WAW",
        to: "FCO",
        // 08:05 CEST
        departure: utc("2026-06-03T06:05:00Z"),
        timeZone: "Europe/Warsaw",
        baggageIncluded: true,
        passengers: 2,
      },
      {
        id: "flight-rome-return",
        from: "FCO",
        to: "WAW",
        // 21:40 CEST
        departure: utc("2026-06-09T19:40:00Z"),
        timeZone: "Europe/Rome",
        baggageIncluded: true,
        passengers: 2,
      },
    ],
    hotel: {
      name: "Hotel Artemide",
      checkIn: utc("2026-06-03T00:00:00Z"),
      checkOut: utc("2026-06-09T00:00:00Z"),
      breakfastDays: 6,
    },
  },
  {
    id: "trip-prague",
    cityKey: "cities.prague",
    start: utc("2026-04-10T00:00:00Z"),
    end: utc("2026-04-14T00:00:00Z"),
    status: "completed",
    coverIndex: 2,
    flights: [
      {
        id: "flight-prague-outbound",
        from: "WAW",
        to: "PRG",
        // 09:30 CEST
        departure: utc("2026-04-10T07:30:00Z"),
        timeZone: "Europe/Warsaw",
        baggageIncluded: false,
        passengers: 2,
      },
      {
        id: "flight-prague-return",
        from: "PRG",
        to: "WAW",
        // 17:20 CEST
        departure: utc("2026-04-14T15:20:00Z"),
        timeZone: "Europe/Prague",
        baggageIncluded: false,
        passengers: 2,
      },
    ],
    hotel: {
      name: "Hotel Josef Prague",
      checkIn: utc("2026-04-10T00:00:00Z"),
      checkOut: utc("2026-04-14T00:00:00Z"),
      breakfastDays: 4,
    },
  },
  {
    id: "trip-amsterdam",
    cityKey: "cities.amsterdam",
    start: utc("2026-02-12T00:00:00Z"),
    end: utc("2026-02-15T00:00:00Z"),
    status: "completed",
    coverIndex: 3,
    flights: [
      {
        id: "flight-amsterdam-outbound",
        from: "WAW",
        to: "AMS",
        // 07:15 CET
        departure: utc("2026-02-12T06:15:00Z"),
        timeZone: "Europe/Warsaw",
        baggageIncluded: true,
        passengers: 1,
      },
      {
        id: "flight-amsterdam-return",
        from: "AMS",
        to: "WAW",
        // 20:05 CET
        departure: utc("2026-02-15T19:05:00Z"),
        timeZone: "Europe/Amsterdam",
        baggageIncluded: true,
        passengers: 1,
      },
    ],
    hotel: {
      name: "Hotel V Nesplein",
      checkIn: utc("2026-02-12T00:00:00Z"),
      checkOut: utc("2026-02-15T00:00:00Z"),
      breakfastDays: 3,
    },
  },
];

/** Trips tab: everything not finished, nearest first. */
export const CURRENT_TRIPS: readonly MockTrip[] = MOCK_TRIPS.filter((trip) => trip.status !== "completed");

/** History tab: finished trips, latest first. */
export const COMPLETED_TRIPS: readonly MockTrip[] = MOCK_TRIPS.filter((trip) => trip.status === "completed");

const FALLBACK_TRIP = MOCK_TRIPS[0] as MockTrip;

/**
 * Trip for a route id. An unknown or malformed id (a stale link, `../../etc`) shows the
 * nearest trip instead of throwing: the details screen has no "not found" state yet.
 */
export function findTrip(tripId: string): MockTrip {
  return MOCK_TRIPS.find((trip) => trip.id === tripId) ?? FALLBACK_TRIP;
}
