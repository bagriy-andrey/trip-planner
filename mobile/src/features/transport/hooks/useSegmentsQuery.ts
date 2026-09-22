import { useQuery } from "@tanstack/react-query";
import type { Segment } from "@tripplanner/shared";

import { useSession } from "@/lib/session";

import { listSegments, unwrapSegment } from "../api";
import type { TripApiError } from "../api";
import { segmentKeys } from "./queryKeys";

export interface SegmentsQueryResult {
  /** The whole route, ordered by `departure_at`; `undefined` until loaded or unreadable. */
  segments: readonly Segment[] | undefined;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  /** Carries `kind`; screens map it to localized text. */
  error: TripApiError | null;
  refetch: () => Promise<unknown>;
}

/**
 * ONE request for a trip's whole route (Non-functional: the route screen never fans out one query
 * per segment). Runs only for a signed-in session and a known trip id.
 */
export function useSegmentsQuery(tripId: string | undefined): SegmentsQueryResult {
  const { status } = useSession();
  const query = useQuery<Segment[], TripApiError>({
    // An undefined tripId never runs (`enabled`), so the placeholder key is never fetched.
    queryKey: segmentKeys.ofTrip(tripId ?? ""),
    queryFn: async () => unwrapSegment(await listSegments(tripId ?? "")),
    enabled: status === "signedIn" && tripId !== undefined && tripId !== "",
  });

  return {
    segments: query.data,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
