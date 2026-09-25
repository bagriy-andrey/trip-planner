import { useQueryClient } from "@tanstack/react-query";
import { carReturnAfterFlight } from "@tripplanner/shared";
import type { Segment } from "@tripplanner/shared";
import { useMemo } from "react";

import { segmentKeys } from "@/features/transport";

import type { CarFormState } from "./formState";

/**
 * The "return after the flight" warning (AC-38). Segments come ONLY from the cache: S7 sits under the
 * form and has already loaded them, so there is no request here and nothing to fail. No cache, no
 * warning. The comparison itself is `shared`'s `carReturnAfterFlight`.
 */
export function useFlightWarning(
  tripId: string,
  state: Pick<CarFormState, "pickupDate" | "pickupTime" | "returnDate" | "returnTime">,
): { departureAt: Date; timeZone: string } | null {
  const queryClient = useQueryClient();
  const segments = queryClient.getQueryData<readonly Segment[]>(segmentKeys.ofTrip(tripId));
  const { pickupDate, pickupTime, returnDate, returnTime } = state;
  return useMemo(
    () =>
      segments === undefined ? null : carReturnAfterFlight({ pickupDate, pickupTime, returnDate, returnTime }, segments),
    [segments, pickupDate, pickupTime, returnDate, returnTime],
  );
}
