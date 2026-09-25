import { useQuery } from "@tanstack/react-query";
import type { Car } from "@tripplanner/shared";

import { useSession } from "@/lib/session";

import { listCars, unwrapCar } from "../api";
import type { TripApiError } from "../api";
import { carKeys } from "./queryKeys";

export interface CarsQueryResult {
  /** The trip's rentals in api order; `undefined` until loaded or unreadable. */
  cars: readonly Car[] | undefined;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  error: TripApiError | null;
  refetch: () => Promise<unknown>;
}

/** ONE request for all rentals of a trip. Runs only for a signed-in session and a known trip id. */
export function useCarsQuery(tripId: string | undefined): CarsQueryResult {
  const { status } = useSession();
  const query = useQuery<Car[], TripApiError>({
    queryKey: carKeys.ofTrip(tripId ?? ""),
    queryFn: async () => unwrapCar(await listCars(tripId ?? "")),
    enabled: status === "signedIn" && tripId !== undefined && tripId !== "",
  });

  return {
    cars: query.data,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
