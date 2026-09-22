import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient, UseMutationResult } from "@tanstack/react-query";
import type { Segment, SegmentFormValue } from "@tripplanner/shared";

import { tripKeys } from "@/features/trips";
import { useSession } from "@/lib/session";

import { createSegment, deleteSegment, TripApiError, unwrapSegment, updateSegment } from "../api";
import { segmentKeys } from "./queryKeys";

// No optimistic updates and no queued writes (AC-82): the UI changes only after the server
// answered and the affected queries were invalidated, so a failed write can never leave a phantom
// segment on screen. Mutations are never retried (query client default).

export interface CreateSegmentVariables {
  tripId: string;
  form: SegmentFormValue;
}

export interface UpdateSegmentVariables {
  tripId: string;
  segmentId: string;
  form: SegmentFormValue;
}

export interface DeleteSegmentVariables {
  tripId: string;
  segmentId: string;
}

export type CreateSegmentMutation = UseMutationResult<Segment, TripApiError, CreateSegmentVariables>;
export type UpdateSegmentMutation = UseMutationResult<Segment, TripApiError, UpdateSegmentVariables>;
export type DeleteSegmentMutation = UseMutationResult<{ id: string }, TripApiError, DeleteSegmentVariables>;

/**
 * Both selections a segment write can change: the trip's own route list AND the trip itself, whose
 * derived values (nearest segment, route summary on S7) come from its segments (AC-75).
 */
async function invalidateSegments(queryClient: QueryClient, tripId: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: segmentKeys.ofTrip(tripId) }),
    queryClient.invalidateQueries({ queryKey: tripKeys.one(tripId) }),
  ]);
}

/** Mutations need the session as much as queries do: without one nothing is sent and the mutation
 * fails as "denied". */
function useRequireSignedIn(): () => void {
  const { status } = useSession();
  return () => {
    if (status !== "signedIn") throw new TripApiError("denied");
  };
}

export function useCreateSegment(): CreateSegmentMutation {
  const queryClient = useQueryClient();
  const requireSignedIn = useRequireSignedIn();
  return useMutation<Segment, TripApiError, CreateSegmentVariables>({
    mutationFn: async ({ tripId, form }) => {
      requireSignedIn();
      return unwrapSegment(await createSegment(tripId, form));
    },
    onSuccess: (_segment, { tripId }) => invalidateSegments(queryClient, tripId),
  });
}

export function useUpdateSegment(): UpdateSegmentMutation {
  const queryClient = useQueryClient();
  const requireSignedIn = useRequireSignedIn();
  return useMutation<Segment, TripApiError, UpdateSegmentVariables>({
    mutationFn: async ({ tripId, segmentId, form }) => {
      requireSignedIn();
      return unwrapSegment(await updateSegment(tripId, segmentId, form));
    },
    onSuccess: (_segment, { tripId }) => invalidateSegments(queryClient, tripId),
  });
}

export function useDeleteSegment(): DeleteSegmentMutation {
  const queryClient = useQueryClient();
  const requireSignedIn = useRequireSignedIn();
  return useMutation<{ id: string }, TripApiError, DeleteSegmentVariables>({
    mutationFn: async ({ tripId, segmentId }) => {
      requireSignedIn();
      return unwrapSegment(await deleteSegment(tripId, segmentId));
    },
    onSuccess: (_result, { tripId }) => invalidateSegments(queryClient, tripId),
  });
}

export interface SegmentMutations {
  create: CreateSegmentMutation;
  update: UpdateSegmentMutation;
  remove: DeleteSegmentMutation;
}

/** All three mutations at once, for a screen that offers several (S9/S9b, delete confirmation). */
export function useSegmentMutations(): SegmentMutations {
  return {
    create: useCreateSegment(),
    update: useUpdateSegment(),
    remove: useDeleteSegment(),
  };
}
