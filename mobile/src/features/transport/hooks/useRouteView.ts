import { useMemo } from "react";
import { buildRoute } from "@tripplanner/shared";
import type { RouteView, Segment, Trip } from "@tripplanner/shared";

import { useNow } from "@/lib/clock";

/**
 * The route view for a trip's segments (`buildRoute`, `@tripplanner/shared`): chain, gaps,
 * warnings, summary, whether it closes and the segment nearest to `now`. `undefined` until BOTH
 * the trip and its segments have loaded, mirroring the query hooks' own "undefined until loaded"
 * contract. `now` comes from `useNow()` — the one legal clock read in `src/` (guardrail
 * `no-direct-clock-outside-clock`) — so the memo recomputes on its minute-level cadence, not on
 * every render/scroll frame (Non-functional, PLAN-04 §1.6).
 *
 * NOTE (scope): this hook was declared in PLAN-04 §1.6/step 6's file list (`hooks/**`) but was not
 * created there; step 7 adds it here because `RouteScreen`/`TransportBlock` cannot be built without
 * it (`mobile/insights.md` reasoning: a screen only ever wires an existing hook, never invents route
 * math of its own — AC-62). No threshold or airport-code comparison lives here; all of that is
 * `buildRoute`'s.
 */
export function useRouteView(
  segments: readonly Segment[] | undefined,
  trip: Pick<Trip, "startDate" | "endDate"> | undefined,
): RouteView | undefined {
  const now = useNow();
  return useMemo(() => {
    if (segments === undefined || trip === undefined) return undefined;
    return buildRoute({ segments, trip, now });
  }, [segments, trip, now]);
}
