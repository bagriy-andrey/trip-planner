// Public api surface of the transport feature (segments of a trip's route). The error classifier
// and `TripApiError` are the trips feature's own (imported from its public index, not copied —
// R-5, PLAN-04 §1.6): segments share exactly the same five failure kinds and the same
// postgrest-js quirk a failed fetch resolves to (`{ status: 0 }` instead of throwing).
import { mapTripError, TripApiError } from "@/features/trips";
import type { TripErrorKind } from "@/features/trips";

import type { SegmentResult } from "./segmentsApi";

export {
  createSegment,
  deleteSegment,
  getSegment,
  listSegments,
  updateSegment,
} from "./segmentsApi";
export type {
  DeleteSegmentResult,
  ListSegmentsResult,
  SegmentFailure,
  SegmentResult,
  SegmentSuccess,
  SingleSegmentResult,
} from "./segmentsApi";

export { mapTripError, TripApiError };
export type { TripErrorKind };

/**
 * The api answers with a closed result; TanStack Query needs a throw to enter the error state.
 * The thrown `TripApiError` carries the `kind`, which is what the query client's retry rule reads
 * and what screens map to localized text (same seam as the trips feature's `unwrap`).
 */
export function unwrapSegment<T>(result: SegmentResult<T>): T {
  if (!result.ok) throw new TripApiError(result.kind);
  return result.data;
}
