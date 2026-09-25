import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Car } from "@tripplanner/shared";

import { useSession } from "@/lib/session";

import { getCar, unwrapCar } from "../api";
import type { TripApiError } from "../api";
import { carKeys } from "./queryKeys";

export interface CarQueryResult {
  /** The rental; `undefined` until loaded or when it does not exist / cannot be read. */
  car: Car | undefined;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  /** Carries `kind`; `"notFound"` means the rental is gone, never was in this trip, or the id is bad. */
  error: TripApiError | null;
  refetch: () => Promise<unknown>;
}

/**
 * One rental by trip id + car id. When the trip's list was already loaded this session, the record
 * is taken from that cache (with the list's freshness), so S17 shows it without the network
 * (AC-49a). A failed background refetch does not hide data that is already there.
 */
export function useCarQuery(tripId: string | undefined, carId: string | undefined): CarQueryResult {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const known = tripId !== undefined && tripId !== "" && carId !== undefined && carId !== "";
  const enabled = status === "signedIn" && known;
  const listKey = carKeys.ofTrip(tripId ?? "");
  const query = useQuery<Car, TripApiError>({
    queryKey: carKeys.one(tripId ?? "", carId ?? ""),
    queryFn: async () => unwrapCar(await getCar(tripId ?? "", carId ?? "")),
    enabled,
    initialData: () => {
      if (!known) return undefined;
      return queryClient.getQueryData<Car[]>(listKey)?.find((car) => car.id === carId);
    },
    initialDataUpdatedAt: () => queryClient.getQueryState(listKey)?.dataUpdatedAt,
  });

  return {
    car: query.data,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError && query.data === undefined,
    error: query.data === undefined ? query.error : null,
    refetch: query.refetch,
  };
}
