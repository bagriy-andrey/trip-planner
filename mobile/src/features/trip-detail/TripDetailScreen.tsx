import { useTripQuery } from "@/features/trips";

import { TripDetailContent } from "./components/TripDetailContent";
import { TripDetailLoading, TripLoadError, TripNotFound } from "./components/TripDetailStates";

export interface TripDetailScreenProps {
  /**
   * The route param, untrusted: it may be missing, foreign, deleted or hostile (`../../etc`). It
   * is only ever used as a query key and a param — never joined into a path — and every id that
   * does not lead to the user's own trip ends in the one "not found" state (AC-44, AC-56).
   */
  tripId: string;
}

/**
 * S7 — trip details, pushed over the tabs (no tab bar). One query for the one trip; the screen
 * only picks the state: loading, "not found", load error with "Retry", or the trip.
 */
export function TripDetailScreen({ tripId }: TripDetailScreenProps) {
  const { trip, isError, error, refetch } = useTripQuery(tripId);

  // Not found wins even over a cached trip: a trip the server no longer knows must not linger
  // on screen as a stale header (AC-56). No other trip is ever substituted for it.
  if (isError && error?.kind === "notFound") return <TripNotFound />;
  if (trip !== undefined) return <TripDetailContent trip={trip} refetch={refetch} />;
  if (isError) return <TripLoadError kind={error?.kind ?? null} onRetry={() => void refetch()} />;
  return <TripDetailLoading />;
}
