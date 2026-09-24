import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient, UseMutationResult } from "@tanstack/react-query";
import type { Hotel, HotelFormValue } from "@tripplanner/shared";

import { useSession } from "@/lib/session";

import { createHotel, deleteHotel, TripApiError, unwrapHotel, updateHotel } from "../api";
import { hotelKeys } from "./queryKeys";

// No optimistic updates: the UI changes only after the server answered and queries were
// invalidated. Mutations are never retried (query client default).

export interface CreateHotelVariables {
  tripId: string;
  form: HotelFormValue;
}

export interface UpdateHotelVariables {
  tripId: string;
  hotelId: string;
  form: HotelFormValue;
}

export interface DeleteHotelVariables {
  tripId: string;
  hotelId: string;
}

export type CreateHotelMutation = UseMutationResult<Hotel, TripApiError, CreateHotelVariables>;
export type UpdateHotelMutation = UseMutationResult<Hotel, TripApiError, UpdateHotelVariables>;
export type DeleteHotelMutation = UseMutationResult<{ id: string }, TripApiError, DeleteHotelVariables>;

/** `hotelKeys.ofTrip` is the prefix of every by-id key of the trip, so it reaches both. */
async function invalidateHotels(queryClient: QueryClient, tripId: string): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: hotelKeys.ofTrip(tripId) });
}

/** Without a session nothing is sent and the mutation fails as "denied". */
function useRequireSignedIn(): () => void {
  const { status } = useSession();
  return () => {
    if (status !== "signedIn") throw new TripApiError("denied");
  };
}

export function useCreateHotel(): CreateHotelMutation {
  const queryClient = useQueryClient();
  const requireSignedIn = useRequireSignedIn();
  return useMutation<Hotel, TripApiError, CreateHotelVariables>({
    mutationFn: async ({ tripId, form }) => {
      requireSignedIn();
      return unwrapHotel(await createHotel(tripId, form));
    },
    onSuccess: (_hotel, { tripId }) => invalidateHotels(queryClient, tripId),
  });
}

export function useUpdateHotel(): UpdateHotelMutation {
  const queryClient = useQueryClient();
  const requireSignedIn = useRequireSignedIn();
  return useMutation<Hotel, TripApiError, UpdateHotelVariables>({
    mutationFn: async ({ tripId, hotelId, form }) => {
      requireSignedIn();
      return unwrapHotel(await updateHotel(tripId, hotelId, form));
    },
    onSuccess: (_hotel, { tripId }) => invalidateHotels(queryClient, tripId),
  });
}

export function useDeleteHotel(): DeleteHotelMutation {
  const queryClient = useQueryClient();
  const requireSignedIn = useRequireSignedIn();
  return useMutation<{ id: string }, TripApiError, DeleteHotelVariables>({
    mutationFn: async ({ tripId, hotelId }) => {
      requireSignedIn();
      return unwrapHotel(await deleteHotel(tripId, hotelId));
    },
    onSuccess: (_result, { tripId }) => invalidateHotels(queryClient, tripId),
  });
}

export interface HotelMutations {
  create: CreateHotelMutation;
  update: UpdateHotelMutation;
  remove: DeleteHotelMutation;
}

/** All three mutations at once, for the form screen (save, delete confirmation). */
export function useHotelMutations(): HotelMutations {
  return { create: useCreateHotel(), update: useUpdateHotel(), remove: useDeleteHotel() };
}
