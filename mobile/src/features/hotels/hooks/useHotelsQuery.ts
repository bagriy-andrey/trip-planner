import { useQuery } from "@tanstack/react-query";
import type { Hotel } from "@tripplanner/shared";

import { useSession } from "@/lib/session";

import { listHotels, unwrapHotel } from "../api";
import type { TripApiError } from "../api";
import { hotelKeys } from "./queryKeys";

export interface HotelsQueryResult {
  /** The trip's hotels ordered by check-in; `undefined` until loaded or unreadable. */
  hotels: readonly Hotel[] | undefined;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  error: TripApiError | null;
  refetch: () => Promise<unknown>;
}

/** ONE request for all hotels of a trip. Runs only for a signed-in session and a known trip id. */
export function useHotelsQuery(tripId: string | undefined): HotelsQueryResult {
  const { status } = useSession();
  const query = useQuery<Hotel[], TripApiError>({
    queryKey: hotelKeys.ofTrip(tripId ?? ""),
    queryFn: async () => unwrapHotel(await listHotels(tripId ?? "")),
    enabled: status === "signedIn" && tripId !== undefined && tripId !== "",
  });

  return {
    hotels: query.data,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
