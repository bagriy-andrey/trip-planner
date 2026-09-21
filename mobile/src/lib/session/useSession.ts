import { createContext, useContext } from "react";

import type { User } from "@/lib/supabase";

export type SessionStatus = "restoring" | "signedIn" | "signedOut";

/** The account as the app sees it (backend type re-exported so features never import the boundary for it). */
export type SessionUser = User;

export interface SessionContextValue {
  /**
   * `restoring` until the stored session has been read (the shell shows no screen until then,
   * AC-2); afterwards `signedIn` or `signedOut`. Follows the backend truth, including while
   * route gating is held (see `holdGating`).
   */
  status: SessionStatus;
  /** The signed-in account; `null` unless `status === "signedIn"`. */
  user: SessionUser | null;
  /**
   * What ROUTE GATING sees: `status === "signedIn"` and no active `holdGating` hold. The root
   * layout (`Stack.Protected`) reads this, nothing else should.
   */
  isRoutedAsSignedIn: boolean;
  /**
   * Password-recovery escape hatch. `verifyRecoveryCodeAndSetPassword` opens a real session
   * (the code is consumed, `SIGNED_IN` fires) BEFORE the new password is set, so without a
   * hold gating would bounce the user off `/reset-password` to `/trips` mid-flow, e.g. when
   * setting the password then fails with `same_password` and the form must stay on step 2.
   *
   * Contract:
   * - Call `holdGating()` BEFORE the verify call; it returns an idempotent `release`.
   * - While at least one hold is active, `isRoutedAsSignedIn` is `false`: the auth screens stay
   *   reachable, the tabs and `trips/*` stay guarded. A hold never widens access — it only
   *   narrows the "signed in" view — so it cannot open a guarded route to a signed-out user.
   * - `release()` re-evaluates gating: if a session exists the user is sent to `/trips` (AC-30);
   *   if not, nothing changes. Holds are counted; release on success, on leaving the flow and
   *   on unmount (a `useEffect` cleanup) so a hold can never outlive its screen.
   */
  holdGating: () => () => void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (value === null) {
    throw new Error("useSession must be used inside <SessionProvider>");
  }
  return value;
}
