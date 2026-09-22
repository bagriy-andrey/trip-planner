import { createContext, useMemo } from "react";
import type { ReactNode } from "react";
import type { CalendarDate } from "@tripplanner/shared";

import { createClock, fixedClock, realClock } from "./clock";
import type { ClockSource } from "./clock";

/** Defaults to the real clock, so production code needs no provider to work. */
export const ClockContext = createContext<ClockSource>(realClock);

export interface ClockProviderProps {
  /** Pin "today" to a calendar date (the usual test override). */
  today?: CalendarDate;
  /** Or supply the current instant; "today" is then its device-local calendar date. */
  now?: () => Date;
  children: ReactNode;
}

/**
 * Overrides the clock for a subtree. With neither prop it is the real clock. The source object
 * is memoised so `useToday()` consumers do not recompute on every render.
 */
export function ClockProvider({ today, now, children }: ClockProviderProps) {
  const source = useMemo<ClockSource>(() => {
    if (today !== undefined) return fixedClock(today);
    if (now !== undefined) return createClock(now);
    return realClock;
  }, [today, now]);
  return <ClockContext.Provider value={source}>{children}</ClockContext.Provider>;
}
