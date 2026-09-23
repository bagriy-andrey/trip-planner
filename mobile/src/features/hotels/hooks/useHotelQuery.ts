import { useQuery } from "@tanstack/react-query";
import type { Hotel } from "@tripplanner/shared";

import { useSession } from "@/lib/session";

import { getHotel, unwrapHotel } from "../api";
import type { TripApiError } from "../api";
import { hotelKeys } from "./queryKeys";

export interface HotelQueryResult {
  /** The hotel; `undefined` until loaded or when it does not exist / cannot be read. */
  hotel: Hotel | undefined;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  /** Carries `kind`; `"notFound"` means the hotel is gone, never was in this trip, or the id is bad. */
  error: TripApiError | null;
  refetch: () => Promise<unknown>;
}

/** One hotel by trip id + hotel id (S14b edit). Runs only for a signed-in session and known ids. */
export function useHotelQuery(tripId: string | undefined, hotelId: string | undefined): HotelQueryResult {
  const { status } = useSession();
  const enabled =
    status === "signedIn" && tripId !== undefined && tripId !== "" && hotelId !== undefined && hotelId !== "";
  const query = useQuery<Hotel, TripApiError>({
    queryKey: hotelKeys.one(tripId ?? "", hotelId ?? ""),
    queryFn: async () => unwrapHotel(await getHotel(tripId ?? "", hotelId ?? "")),
    enabled,
  });

  return {
    hotel: query.data,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
