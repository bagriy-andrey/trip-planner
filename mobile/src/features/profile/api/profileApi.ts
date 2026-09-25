// The ONLY place the app talks to the `profiles` table (PLAN-06 §1.6). Callers receive a closed
// result and this module never throws. Row-level security limits rows to the owner, so reads need
// no user filter. Writes send only the changed columns plus `user_id` (D-5, AC-8).
//
// Logging: only the operation name and the classified error kind. Field values, the user id and
// the patch are never logged (AC-29, guardrail no-credentials-in-logs).

import { EMPTY_PROFILE, profileFromRowSchema, toProfileWrite, validateProfilePatch } from "@tripplanner/shared";
import type { Profile, ProfilePatch } from "@tripplanner/shared";

import { mapTripError } from "@/features/trips";
import type { TripErrorKind } from "@/features/trips";
import { supabase } from "@/lib/supabase";

export type ProfileFailure = { ok: false; kind: TripErrorKind };
export type ProfileSuccess<T> = { ok: true; data: T };
export type ProfileResult<T> = ProfileSuccess<T> | ProfileFailure;

type Operation = "profile.load" | "profile.save";

const PROFILE_COLUMNS =
  "user_id,citizenship_country_code,residence_country_code,home_city_place_id,home_city_name,home_airport_code,home_currency";

function failure(operation: Operation, error: unknown, status?: number): ProfileFailure {
  const kind = mapTripError(error, status);
  // Guardrail: only literals plus `operation` / `errorCode` may be logged in feature api code.
  const errorCode = kind;
  if (__DEV__) {
    console.warn("[profile]", operation, "failed", errorCode);
  }
  return { ok: false, kind };
}

function unreadable(operation: Operation): ProfileFailure {
  if (__DEV__) {
    console.warn("[profile]", operation, "unreadable row");
  }
  return { ok: false, kind: "unknown" };
}

/** The signed-in user's profile; no row yet is the empty profile (AC-7). */
export async function getProfile(): Promise<ProfileResult<Profile>> {
  try {
    const { data, error, status } = await supabase.from("profiles").select(PROFILE_COLUMNS).maybeSingle();
    if (error) return failure("profile.load", error, status);
    if (data === null || data === undefined) return { ok: true, data: EMPTY_PROFILE };
    const parsed = profileFromRowSchema.safeParse(data);
    return parsed.success ? { ok: true, data: parsed.data } : unreadable("profile.load");
  } catch (error) {
    return failure("profile.load", error);
  }
}

/**
 * Upserts the changed columns. `current` is the profile the patch was computed against (write-time
 * validation); an invalid patch is `unknown` WITHOUT a request.
 */
export async function saveProfile(
  userId: string,
  patch: ProfilePatch,
  current: Profile,
): Promise<ProfileResult<Profile>> {
  if (!validateProfilePatch(current, patch).ok) return { ok: false, kind: "unknown" };
  try {
    const { data, error, status } = await supabase
      .from("profiles")
      .upsert(toProfileWrite(userId, patch), { onConflict: "user_id" })
      .select(PROFILE_COLUMNS)
      .single();
    if (error) return failure("profile.save", error, status);
    const parsed = profileFromRowSchema.safeParse(data);
    return parsed.success ? { ok: true, data: parsed.data } : unreadable("profile.save");
  } catch (error) {
    return failure("profile.save", error);
  }
}
