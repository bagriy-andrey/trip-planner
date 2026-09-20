import type { TripPlaceholder } from "./types";

/**
 * Fixed "now" for the static sample content: the nearest trip starts 5 days
 * later, so its accent pill reads "in 5 days" regardless of the real date.
 */
export const PLACEHOLDER_NOW = new Date("2026-09-19T09:00:00Z");

export type TripsCityKey =
  | "sample.krakow"
  | "sample.lisbon"
  | "sample.longCity"
  | "sample.draft";

export const TRIP_PLACEHOLDERS: readonly TripPlaceholder<TripsCityKey>[] = [
  {
    id: "trip-krakow",
    cityKey: "sample.krakow",
    start: new Date("2026-09-24T00:00:00Z"),
    end: new Date("2026-09-30T00:00:00Z"),
    status: "upcoming",
    coverIndex: 0,
  },
  {
    id: "trip-lisbon",
    cityKey: "sample.lisbon",
    start: new Date("2026-10-14T00:00:00Z"),
    end: new Date("2026-10-20T00:00:00Z"),
    status: "planned",
    coverIndex: 1,
  },
  {
    // The deliberately long city name (edge case: it must truncate, not overflow).
    id: "trip-long-city",
    cityKey: "sample.longCity",
    start: new Date("2026-11-02T00:00:00Z"),
    end: new Date("2026-11-09T00:00:00Z"),
    status: "planned",
    coverIndex: 2,
  },
  {
    id: "trip-draft",
    cityKey: "sample.draft",
    start: null,
    end: null,
    status: "draft",
    coverIndex: 3,
  },
];
