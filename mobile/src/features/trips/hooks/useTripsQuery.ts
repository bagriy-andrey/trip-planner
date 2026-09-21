import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { selectActiveTrips, selectHistoryTrips } from "@tripplanner/shared";
import type { Trip } from "@tripplanner/shared";

import { useToday } from "@/lib/clock";
import { useSession } from "@/lib/session";

import { listTrips } from "../api";
import type { TripApiError } from "../api";
import { tripKeys } from "./queryKeys";
import { unwrap } from "./unwrap";

const NO_TRIPS: readonly Trip[] = [];

export interface TripsQueryResult {
  /** The raw list as loaded (`undefined` until the first success; kept while a refetch runs). */
  trips: readonly Trip[] | undefined;
  /** S4: not archived and not completed (drafts included), in list order. Empty until loaded. */
  active: readonly Trip[];
  /** S5: completed and archived, most recent first. Empty until loaded. */
  history: readonly Trip[];
  /** No data yet (first load, or the query is disabled). */
  isPending: boolean;
  /** A request is in flight (first load or a refetch). */
  isFetching: boolean;
  isError: boolean;
  /** The failure of the last attempt, carrying its `kind`; `null` when there is none. */
  error: TripApiError | null;
  /** The explicit "Retry" action. */
  refetch: () => Promise<unknown>;
}

/**
 * ONE list request serves the trips screen (S4) and the history screen (S5): the split into
 * active and history is the shared pure selectors over `useToday()`, so a trip that ended
 * yesterday moves to history without a refetch. The query runs only for a signed-in session
 * (AC-62): while restoring or signed out no request leaves the device.
 */
export function useTripsQuery(): TripsQueryResult {
  const { status } = useSession();
  const today = useToday();
  const query = useQuery<Trip[], TripApiError>({
    queryKey: tripKeys.all,
    queryFn: async () => unwrap(await listTrips()),
    enabled: status === "signedIn",
  });

  const trips = query.data;
  const active = useMemo(
    () => (trips === undefined ? NO_TRIPS : selectActiveTrips(trips, today)),
    [trips, today],
  );
  const history = useMemo(
    () => (trips === undefined ? NO_TRIPS : selectHistoryTrips(trips, today)),
    [trips, today],
  );

  return {
    trips,
    active,
    history,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
