// The ONLY place the app calls Supabase Auth operations (AC-8). Screens receive a closed result
// type — `{ ok: true, … } | { ok: false, kind }` — never a raw backend error (AC-37), and this
// module never throws. Inputs are the already-validated `@tripplanner/shared` form values.
//
// Logging (AC-39): request data (email, password, code, tokens) is never logged — only the
// operation name and the server error code, in development builds.

import type {
  Email,
  NewPasswordValues,
  PasswordResetRequestValues,
  SignInValues,
  SignUpValues,
} from "@tripplanner/shared";

import { supabase } from "@/lib/supabase";
import type { Session } from "@/lib/supabase";

import { mapAuthError, safeErrorCode } from "./errors";
import type { AuthErrorKind } from "./errors";

export type AuthFailure = { ok: false; kind: AuthErrorKind };
export type AuthSuccess = { ok: true };
export type AuthSessionSuccess = { ok: true; session: Session };

export type SignUpResult = AuthSessionSuccess | AuthFailure;
export type SignInResult = AuthSessionSuccess | AuthFailure;
export type RequestPasswordResetResult = AuthSuccess | AuthFailure;
/**
 * `codeAccepted: true` on a failure means the emailed code WAS consumed (the recovery session
 * exists) and only setting the password failed — retry with `updatePassword`, not with the same
 * code again (a code is single-use).
 */
export type VerifyRecoveryResult = AuthSessionSuccess | (AuthFailure & { codeAccepted: boolean });
export type UpdatePasswordResult = AuthSuccess | AuthFailure;
export type SignOutResult = AuthSuccess;

type Operation =
  | "signUp"
  | "signIn"
  | "requestPasswordReset"
  | "verifyRecoveryCode"
  | "updatePassword"
  | "signOut";

function failure(operation: Operation, error: unknown): AuthFailure {
  const kind = mapAuthError(error);
  if (__DEV__) {
    const errorCode = safeErrorCode(error) ?? kind;
    console.warn("[auth]", operation, "failed", errorCode);
  }
  return { ok: false, kind };
}

export async function signUp({ name, email, password }: SignUpValues): Promise<SignUpResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // AC-11: the display name travels as user metadata under `display_name`.
      options: { data: { display_name: name } },
    });
    if (error) return failure("signUp", error);
    // Email confirmation is off (AC-10): a sign-up without a session is a server misconfiguration.
    if (!data.session) return failure("signUp", undefined);
    return { ok: true, session: data.session };
  } catch (error) {
    return failure("signUp", error);
  }
}

export async function signIn({ email, password }: SignInValues): Promise<SignInResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return failure("signIn", error);
    if (!data.session) return failure("signIn", undefined);
    return { ok: true, session: data.session };
  } catch (error) {
    return failure("signIn", error);
  }
}

/** Sends the recovery code. Unknown and known emails answer identically (AC-28). */
export async function requestPasswordReset({
  email,
}: PasswordResetRequestValues): Promise<RequestPasswordResetResult> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return failure("requestPasswordReset", error);
    return { ok: true };
  } catch (error) {
    return failure("requestPasswordReset", error);
  }
}

/** Sets the new password on the current (recovery) session. */
export async function updatePassword(password: string): Promise<UpdatePasswordResult> {
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return failure("updatePassword", error);
    return { ok: true };
  } catch (error) {
    return failure("updatePassword", error);
  }
}

/** AC-30: verify the emailed code (opens a session), then set the new password on it. */
export async function verifyRecoveryCodeAndSetPassword({
  email,
  code,
  password,
}: NewPasswordValues & { email: Email }): Promise<VerifyRecoveryResult> {
  let session: Session;
  try {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });
    if (error) return { ...failure("verifyRecoveryCode", error), codeAccepted: false };
    if (!data.session) return { ...failure("verifyRecoveryCode", undefined), codeAccepted: false };
    session = data.session;
  } catch (error) {
    return { ...failure("verifyRecoveryCode", error), codeAccepted: false };
  }

  const updated = await updatePassword(password);
  if (!updated.ok) return { ...updated, codeAccepted: true };
  return { ok: true, session };
}

/**
 * AC-23: signing out cannot "fail" on the device. If the server part fails (offline, error),
 * the local session is still removed (`scope: "local"` never talks to the server).
 */
export async function signOut(): Promise<SignOutResult> {
  try {
    const { error } = await supabase.auth.signOut();
    if (!error) return { ok: true };
    failure("signOut", error);
  } catch (error) {
    failure("signOut", error);
  }
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (error) {
    failure("signOut", error);
  }
  return { ok: true };
}
