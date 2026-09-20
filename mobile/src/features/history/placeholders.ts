import type { TripPlaceholder } from "@/features/trips";

export type HistoryCityKey = "sample.rome" | "sample.prague";

export const HISTORY_PLACEHOLDERS: readonly TripPlaceholder<HistoryCityKey>[] = [
  {
    id: "trip-rome",
    cityKey: "sample.rome",
    start: new Date("2026-06-03T00:00:00Z"),
    end: new Date("2026-06-09T00:00:00Z"),
    status: "completed",
    coverIndex: 1,
  },
  {
    id: "trip-prague",
    cityKey: "sample.prague",
    start: new Date("2026-04-10T00:00:00Z"),
    end: new Date("2026-04-14T00:00:00Z"),
    status: "completed",
    coverIndex: 2,
  },
];
