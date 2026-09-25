// Api surface of the profile feature. The error classifier and `TripApiError` are the trips
// feature's own (imported from its public index, not copied).
import { TripApiError } from "@/features/trips";
import type { TripErrorKind } from "@/features/trips";

import type { ProfileResult } from "./profileApi";

export { getProfile, saveProfile } from "./profileApi";
export type { ProfileFailure, ProfileResult, ProfileSuccess } from "./profileApi";

export { TripApiError };
export type { TripErrorKind };

/** The api answers with a closed result; TanStack Query needs a throw to enter the error state. */
export function unwrapProfile<T>(result: ProfileResult<T>): T {
  if (!result.ok) throw new TripApiError(result.kind);
  return result.data;
}
