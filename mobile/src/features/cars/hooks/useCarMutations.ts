import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient, UseMutationResult } from "@tanstack/react-query";
import type { Car, CarFormValue } from "@tripplanner/shared";

import { useSession } from "@/lib/session";

import { createCar, deleteCar, TripApiError, unwrapCar, updateCar } from "../api";
import { carKeys } from "./queryKeys";

// No optimistic updates: the UI changes only after the server answered and queries were
// invalidated. Mutations are never retried (query client default).

export interface CreateCarVariables {
  tripId: string;
  form: CarFormValue;
}

export interface UpdateCarVariables {
  tripId: string;
  carId: string;
  form: CarFormValue;
}

export interface DeleteCarVariables {
  tripId: string;
  carId: string;
}

export type CreateCarMutation = UseMutationResult<Car, TripApiError, CreateCarVariables>;
export type UpdateCarMutation = UseMutationResult<Car, TripApiError, UpdateCarVariables>;
export type DeleteCarMutation = UseMutationResult<{ id: string }, TripApiError, DeleteCarVariables>;

/** `carKeys.ofTrip` is the prefix of every by-id key of the trip, so it reaches both. */
async function invalidateCars(queryClient: QueryClient, tripId: string): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: carKeys.ofTrip(tripId) });
}

/** Without a session nothing is sent and the mutation fails as "denied". */
function useRequireSignedIn(): () => void {
  const { status } = useSession();
  return () => {
    if (status !== "signedIn") throw new TripApiError("denied");
  };
}

export function useCreateCar(): CreateCarMutation {
  const queryClient = useQueryClient();
  const requireSignedIn = useRequireSignedIn();
  return useMutation<Car, TripApiError, CreateCarVariables>({
    mutationFn: async ({ tripId, form }) => {
      requireSignedIn();
      return unwrapCar(await createCar(tripId, form));
    },
    onSuccess: (_car, { tripId }) => invalidateCars(queryClient, tripId),
  });
}

export function useUpdateCar(): UpdateCarMutation {
  const queryClient = useQueryClient();
  const requireSignedIn = useRequireSignedIn();
  return useMutation<Car, TripApiError, UpdateCarVariables>({
    mutationFn: async ({ tripId, carId, form }) => {
      requireSignedIn();
      return unwrapCar(await updateCar(tripId, carId, form));
    },
    onSuccess: (_car, { tripId }) => invalidateCars(queryClient, tripId),
  });
}

export function useDeleteCar(): DeleteCarMutation {
  const queryClient = useQueryClient();
  const requireSignedIn = useRequireSignedIn();
  return useMutation<{ id: string }, TripApiError, DeleteCarVariables>({
    mutationFn: async ({ tripId, carId }) => {
      requireSignedIn();
      return unwrapCar(await deleteCar(tripId, carId));
    },
    onSuccess: (_result, { tripId }) => invalidateCars(queryClient, tripId),
  });
}

export interface CarMutations {
  create: CreateCarMutation;
  update: UpdateCarMutation;
  remove: DeleteCarMutation;
}

/** All three mutations at once, for the form screen (save, delete confirmation). */
export function useCarMutations(): CarMutations {
  return { create: useCreateCar(), update: useUpdateCar(), remove: useDeleteCar() };
}
