import { TripApiError } from "../api";
import type { TripResult } from "../api";

/**
 * The api answers with a closed result; TanStack Query needs a throw to enter the error state.
 * The thrown `TripApiError` carries the `kind`, which is what the query client's retry rule reads
 * (only "offline" / "timeout" are retried, once) and what screens map to localized text.
 */
export function unwrap<T>(result: TripResult<T>): T {
  if (!result.ok) throw new TripApiError(result.kind);
  return result.data;
}
