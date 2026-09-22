import { useQuery } from "@tanstack/react-query";
import type { Segment } from "@tripplanner/shared";

import { useSession } from "@/lib/session";

import { getSegment, unwrapSegment } from "../api";
import type { TripApiError } from "../api";
import { segmentKeys } from "./queryKeys";

export interface SegmentQueryResult {
  /** The segment; `undefined` until loaded or when it does not exist / cannot be read. */
  segment: Segment | undefined;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  /** Carries `kind`; `"notFound"` means the segment is gone or never was in this trip. */
  error: TripApiError | null;
  refetch: () => Promise<unknown>;
}

/** One segment by trip id + segment id (S9b edit). Runs only for a signed-in session and known ids. */
export function useSegmentQuery(
  tripId: string | undefined,
  segmentId: string | undefined,
): SegmentQueryResult {
  const { status } = useSession();
  const enabled =
    status === "signedIn" &&
    tripId !== undefined &&
    tripId !== "" &&
    segmentId !== undefined &&
    segmentId !== "";
  const query = useQuery<Segment, TripApiError>({
    queryKey: segmentKeys.one(tripId ?? "", segmentId ?? ""),
    queryFn: async () => unwrapSegment(await getSegment(tripId ?? "", segmentId ?? "")),
    enabled,
  });

  return {
    segment: query.data,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
