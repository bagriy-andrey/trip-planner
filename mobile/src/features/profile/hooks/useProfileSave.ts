import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Profile, ProfileField, ProfilePatch } from "@tripplanner/shared";
import { useCallback, useRef, useState } from "react";

import { useSession } from "@/lib/session";

import { saveProfile, unwrapProfile } from "../api";
import type { TripApiError, TripErrorKind } from "../api";
import { enqueue, settle } from "./pendingPatches";
import type { PendingPatch } from "./pendingPatches";
import { profileKeys } from "./queryKeys";

interface SaveVariables {
  seq: number;
  userId: string;
  field: ProfileField;
  patch: ProfilePatch;
  current: Profile;
}

export interface ProfileSaveError {
  field: ProfileField;
  kind: TripErrorKind;
}

export interface ProfileSave {
  /** Patches shown on screen but not answered yet, in order (D-6). */
  queue: readonly PendingPatch[];
  lastError: ProfileSaveError | null;
  clearError: () => void;
  /** `current` is the on-screen profile the patch was computed against. */
  save: (field: ProfileField, patch: ProfilePatch, current: Profile) => void;
}

/**
 * Serialized (`scope`) optimistic writes. Success puts the server row into the cache and drops the
 * patch; failure drops the patch (the whole linked group) and records the error. Nothing is retried.
 */
export function useProfileSave(): ProfileSave {
  const queryClient = useQueryClient();
  const { status, user } = useSession();
  const [queue, setQueue] = useState<PendingPatch[]>([]);
  const [lastError, setLastError] = useState<ProfileSaveError | null>(null);
  const seqRef = useRef(0);

  const { mutate } = useMutation<Profile, TripApiError, SaveVariables>({
    scope: { id: "profile-save" },
    mutationFn: async ({ userId, patch, current }) => unwrapProfile(await saveProfile(userId, patch, current)),
    onSuccess: (server, { seq, userId }) => {
      queryClient.setQueryData(profileKeys.mine(userId), server);
      setQueue((q) => settle(q, seq));
    },
    onError: (error, { seq, field }) => {
      setQueue((q) => settle(q, seq));
      setLastError({ field, kind: error.kind });
    },
  });

  const save = useCallback(
    (field: ProfileField, patch: ProfilePatch, current: Profile) => {
      const userId = user?.id ?? "";
      if (status !== "signedIn" || userId === "") {
        // Nothing is sent without a session.
        setLastError({ field, kind: "denied" });
        return;
      }
      seqRef.current += 1;
      const seq = seqRef.current;
      setQueue((q) => enqueue(q, { seq, patch }));
      mutate({ seq, userId, field, patch, current });
    },
    [mutate, status, user?.id],
  );

  const clearError = useCallback(() => setLastError(null), []);

  return { queue, lastError, clearError, save };
}
