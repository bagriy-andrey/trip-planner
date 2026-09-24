import { useQuery } from "@tanstack/react-query";
import type { Profile } from "@tripplanner/shared";

import { useSession } from "@/lib/session";

import { getProfile, unwrapProfile } from "../api";
import type { TripApiError } from "../api";
import { profileKeys } from "./queryKeys";

export interface ProfileQueryResult {
  /** `undefined` until loaded (a missing row arrives as the empty profile). */
  profile: Profile | undefined;
  isPending: boolean;
  isError: boolean;
  error: TripApiError | null;
  refetch: () => Promise<unknown>;
}

/** The user's profile. Runs only for a signed-in session; the query throws so offline/timeout retry. */
export function useProfileQuery(): ProfileQueryResult {
  const { status, user } = useSession();
  const userId = user?.id ?? "";
  const query = useQuery<Profile, TripApiError>({
    queryKey: profileKeys.mine(userId),
    queryFn: async () => unwrapProfile(await getProfile()),
    enabled: status === "signedIn" && userId !== "",
  });
  return {
    profile: query.data,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
