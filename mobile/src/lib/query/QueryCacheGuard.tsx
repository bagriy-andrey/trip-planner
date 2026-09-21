import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

// The hook file, not the `lib/session` barrel: the barrel drags in the provider and the backend
// client, which `lib/query` (and its tests) must not depend on.
import { useSession } from "@/lib/session/useSession";

/**
 * Keeps one account's server data away from the next one. The trips keys carry no user id
 * (`["trips"]`), so a cache that survived a sign-out would show user A's trips to user B until
 * the refetch lands. Whenever the signed-in account ENDS or CHANGES (sign-out, session revoked,
 * a different user id) the whole cache is dropped.
 *
 * Deliberately not cleared: the first identity after launch (`restoring` -> `signedIn`, where
 * the list query may already be starting: clearing then would orphan its observer), a token
 * refresh (same user id) and any re-render. Renders nothing; mount it inside both the session
 * and the query provider.
 */
export function QueryCacheGuard() {
  const queryClient = useQueryClient();
  const { status, user } = useSession();
  // `undefined` = no identity seen yet; `null` = seen signed out.
  const seen = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (status === "restoring") return;
    const identity = status === "signedIn" && user !== null ? user.id : null;
    const previous = seen.current;
    seen.current = identity;
    if (previous !== undefined && previous !== null && previous !== identity) queryClient.clear();
  }, [queryClient, status, user]);

  return null;
}
