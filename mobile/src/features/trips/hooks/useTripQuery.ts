import { useQuery } from "@tanstack/react-query";
import type { Trip } from "@tripplanner/shared";

import { useSession } from "@/lib/session";

import { getTrip } from "../api";
import type { TripApiError } from "../api";
import { tripKeys } from "./queryKeys";
import { unwrap } from "./unwrap";

export interface TripQueryResult {
  /** The trip; `undefined` until loaded or when it does not exist / cannot be read. */
  trip: Trip | undefined;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  /** Carries `kind`; `"notFound"` means the trip is gone or never was the user's (AC-56). */
  error: TripApiError | null;
  refetch: () => Promise<unknown>;
}

/** One trip by id. Runs only for a signed-in session and a known id (AC-62). */
export function useTripQuery(id: string | undefined): TripQueryResult {
  const { status } = useSession();
  const query = useQuery<Trip, TripApiError>({
    // An undefined id never runs (`enabled`), so the placeholder key is never fetched.
    queryKey: tripKeys.one(id ?? ""),
    queryFn: async () => unwrap(await getTrip(id ?? "")),
    enabled: status === "signedIn" && id !== undefined && id !== "",
  });

  return {
    trip: query.data,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
