import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AppState } from "react-native";

import { clearStoredSession, ensureFreshInstallCleared, readStoredSessionUser } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import type { Session } from "@/lib/supabase";

import { SessionContext } from "./useSession";
import type { SessionContextValue, SessionStatus, SessionUser } from "./useSession";

// Session lifecycle: restoring -> signedIn | signedOut, then follows the backend's auth events.
//
// - Restoring is LOCAL (AC-9): first the fresh-install cleanup (AC-6, before the session is
//   first read), then `getSession()`, which reads the encrypted store and only touches the
//   network when the access token has expired.
// - Any unreadable / rejected session means "signed out", silently, with the leftovers wiped
//   (AC-3, AC-4). An offline failure to refresh is NOT a rejection: the stored session stays and
//   the app opens signed in from it (AC-9); auto-refresh retries once the network is back, and a
//   server rejection then ends the session through the auth-event subscription.
// - The subscription callback only sets state — supabase-js forbids awaiting its own methods
//   inside it.
// - Token auto-refresh runs only while the app is in the foreground (AC-5).

interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
}

const RESTORING: SessionState = { status: "restoring", user: null };

function stateOf(session: Session | null): SessionState {
  return session === null ? { status: "signedOut", user: null } : { status: "signedIn", user: session.user };
}

function isUser(value: unknown): value is SessionUser {
  return typeof value === "object" && value !== null && "id" in value && typeof value.id === "string";
}

/** A transient connection failure while refreshing: the stored session is still good. */
function isOfflineRefreshFailure(error: { name?: string }): boolean {
  return error.name === "AuthRetryableFetchError";
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(RESTORING);
  const [holds, setHolds] = useState(0);

  useEffect(() => {
    let active = true;
    let settled = false;
    let unsubscribe: (() => void) | undefined;

    const applyState = (next: SessionState) => {
      if (!active) return;
      settled = true;
      setState(next);
    };
    const apply = (session: Session | null) => applyState(stateOf(session));

    const restore = async () => {
      try {
        await ensureFreshInstallCleared();
      } catch {
        // Documented as never throwing; if it ever does, restoring must still finish.
      }
      if (!active) return;

      const { data } = supabase.auth.onAuthStateChange((_event, session) => apply(session));
      unsubscribe = () => data.subscription.unsubscribe();
      if (!active) {
        unsubscribe();
        return;
      }

      try {
        const { data: current, error } = await supabase.auth.getSession();
        if (error && isOfflineRefreshFailure(error)) {
          // Offline with an expired access token: the stored session is still good (AC-9).
          const stored = await readStoredSessionUser();
          if (!settled) {
            applyState(stored !== null && isUser(stored.user) ? { status: "signedIn", user: stored.user } : stateOf(null));
          }
          return;
        }
        if (error) {
          // Refresh token expired / revoked / unreadable: drop the local remnants (AC-4).
          await clearStoredSession();
        }
        if (!settled) apply(error ? null : current.session);
      } catch {
        await clearStoredSession();
        if (!settled) apply(null);
      }
    };
    void restore();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const sync = (appState: string) => {
      if (appState === "active") void supabase.auth.startAutoRefresh();
      else void supabase.auth.stopAutoRefresh();
    };
    sync(AppState.currentState);
    const subscription = AppState.addEventListener("change", sync);
    return () => {
      subscription.remove();
      void supabase.auth.stopAutoRefresh();
    };
  }, []);

  const holdGating = useCallback(() => {
    let released = false;
    setHolds((count) => count + 1);
    return () => {
      if (released) return;
      released = true;
      setHolds((count) => Math.max(0, count - 1));
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      status: state.status,
      user: state.user,
      isRoutedAsSignedIn: state.status === "signedIn" && holds === 0,
      holdGating,
    }),
    [state, holds, holdGating],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
