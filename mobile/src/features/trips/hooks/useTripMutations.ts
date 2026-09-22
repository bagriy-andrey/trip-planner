import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient, UseMutationResult } from "@tanstack/react-query";
import type { Trip, TripFormValue } from "@tripplanner/shared";

import { useSession } from "@/lib/session";

import { archiveTrip, createTrip, deleteTrip, TripApiError, unarchiveTrip, updateTrip } from "../api";
import { tripKeys } from "./queryKeys";
import { unwrap } from "./unwrap";

// No optimistic updates and no queued writes (SPEC-03 contract 3, AC-57): the UI changes only
// after the server answered and the affected queries were invalidated, so a failed write can
// never leave a phantom trip on screen. Mutations are never retried (query client default).

export interface UpdateTripVariables {
  id: string;
  form: TripFormValue;
}

export type CreateTripMutation = UseMutationResult<Trip, TripApiError, TripFormValue>;
export type UpdateTripMutation = UseMutationResult<Trip, TripApiError, UpdateTripVariables>;
export type TripIdMutation = UseMutationResult<Trip, TripApiError, string>;
export type DeleteTripMutation = UseMutationResult<{ id: string }, TripApiError, string>;

/** Both selections a trip write can change: the list and this trip's own entry (AC-42). */
async function invalidateTrip(queryClient: QueryClient, id: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: tripKeys.all }),
    queryClient.invalidateQueries({ queryKey: tripKeys.one(id) }),
  ]);
}

/**
 * Mutations need the session as much as queries do (AC-62): without one nothing is sent and the
 * mutation fails as "denied".
 */
function useRequireSignedIn(): () => void {
  const { status } = useSession();
  return () => {
    if (status !== "signedIn") throw new TripApiError("denied");
  };
}

export function useCreateTrip(): CreateTripMutation {
  const queryClient = useQueryClient();
  const requireSignedIn = useRequireSignedIn();
  return useMutation<Trip, TripApiError, TripFormValue>({
    mutationFn: async (form) => {
      requireSignedIn();
      return unwrap(await createTrip(form));
    },
    onSuccess: (trip) => invalidateTrip(queryClient, trip.id),
  });
}

export function useUpdateTrip(): UpdateTripMutation {
  const queryClient = useQueryClient();
  const requireSignedIn = useRequireSignedIn();
  return useMutation<Trip, TripApiError, UpdateTripVariables>({
    mutationFn: async ({ id, form }) => {
      requireSignedIn();
      return unwrap(await updateTrip(id, form));
    },
    onSuccess: (_trip, { id }) => invalidateTrip(queryClient, id),
  });
}

export function useArchiveTrip(): TripIdMutation {
  const queryClient = useQueryClient();
  const requireSignedIn = useRequireSignedIn();
  return useMutation<Trip, TripApiError, string>({
    mutationFn: async (id) => {
      requireSignedIn();
      return unwrap(await archiveTrip(id));
    },
    onSuccess: (_trip, id) => invalidateTrip(queryClient, id),
  });
}

export function useUnarchiveTrip(): TripIdMutation {
  const queryClient = useQueryClient();
  const requireSignedIn = useRequireSignedIn();
  return useMutation<Trip, TripApiError, string>({
    mutationFn: async (id) => {
      requireSignedIn();
      return unwrap(await unarchiveTrip(id));
    },
    onSuccess: (_trip, id) => invalidateTrip(queryClient, id),
  });
}

/**
 * The deleted trip's own entry is invalidated too (AC-42) but NOT refetched while a screen still
 * observes it: the details screen is open at that moment and a refetch would flash "trip not
 * found" (AC-56) before it closes. The list refetches as usual; the stale entry answers
 * `notFound` on the next open.
 */
export function useDeleteTrip(): DeleteTripMutation {
  const queryClient = useQueryClient();
  const requireSignedIn = useRequireSignedIn();
  return useMutation<{ id: string }, TripApiError, string>({
    mutationFn: async (id) => {
      requireSignedIn();
      return unwrap(await deleteTrip(id));
    },
    onSuccess: async (_result, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tripKeys.all, refetchType: "active", exact: true }),
        queryClient.invalidateQueries({ queryKey: tripKeys.one(id), refetchType: "none" }),
      ]);
    },
  });
}

export interface TripMutations {
  create: CreateTripMutation;
  update: UpdateTripMutation;
  archive: TripIdMutation;
  unarchive: TripIdMutation;
  remove: DeleteTripMutation;
}

/** All five mutations at once, for a screen that offers several (details, edit sheet). */
export function useTripMutations(): TripMutations {
  return {
    create: useCreateTrip(),
    update: useUpdateTrip(),
    archive: useArchiveTrip(),
    unarchive: useUnarchiveTrip(),
    remove: useDeleteTrip(),
  };
}
