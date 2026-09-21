import { useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import type { CalendarDate } from "@tripplanner/shared";

import { ClockContext } from "./ClockProvider";

/**
 * Today's calendar date in the device's time zone — the ONLY way `src/` learns "today"
 * (AC-24, AC-64). Recomputed whenever the app returns to the foreground, so a trip that ended
 * yesterday moves to history on the next refresh; there is no timer. An unchanged date is the
 * same string, so React bails out of the re-render.
 */
export function useToday(): CalendarDate {
  const source = useContext(ClockContext);
  const [today, setToday] = useState<CalendarDate>(() => source.today());

  useEffect(() => {
    setToday(source.today());
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setToday(source.today());
    });
    return () => subscription.remove();
  }, [source]);

  return today;
}
