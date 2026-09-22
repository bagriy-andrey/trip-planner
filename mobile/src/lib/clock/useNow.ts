import { useEffect, useState } from "react";
import { AppState } from "react-native";

/** How often `useNow()` refreshes on its own, absent a foreground event. A route's "nearest
 * segment" (SPEC-04 AC-61) only needs minute-level freshness, not a per-frame timer. */
const REFRESH_INTERVAL_MS = 60_000;

/**
 * The current moment. The ONLY legal source of "now" (as opposed to "today", `useToday()`'s
 * calendar date) in `src/` — enforced by the guardrail `no-direct-clock-outside-clock`, which
 * allows a bare `new Date()` / `Date.now(` only inside `src/lib/clock/**`.
 *
 * Updates when the app returns to the foreground (so a stale background tab does not misjudge
 * "the nearest segment" the moment it is reopened) and on a `REFRESH_INTERVAL_MS` timer;
 * deliberately not on every render or frame.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), REFRESH_INTERVAL_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(new Date());
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  return now;
}
