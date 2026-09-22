import type { Segment } from "@tripplanner/shared";

/**
 * What the route body shows for a trip's segments: skeletons, the error block, the empty note, or
 * the chain (AC-68..AC-70; consumed by `RouteStates.tsx` / `TransportBlock.tsx`, step 7). Mirrors
 * the trips feature's `TripListStatus`. Deliberately no threshold and no airport-code comparison
 * lives here or anywhere else in this feature (AC-62) — `buildRoute` (from `@tripplanner/shared`)
 * is the only place that decides layover/stopover/risky and "same airport".
 */
export type SegmentListStatus = "loading" | "error" | "empty" | "ready";

interface SegmentListQueryState {
  /** The loaded segments; `undefined` until the first success. */
  segments: readonly Segment[] | undefined;
  isError: boolean;
}

/**
 * Loading, error and empty are three different screens: an error is never shown as "no segments",
 * and "no data yet" is never shown as an empty route. A failed REFETCH with data already on screen
 * keeps the data (mirrors `tripListStatus` in `features/trips`).
 */
export function segmentListStatus(
  { segments, isError }: SegmentListQueryState,
  count: number,
): SegmentListStatus {
  if (segments === undefined) return isError ? "error" : "loading";
  return count === 0 ? "empty" : "ready";
}
