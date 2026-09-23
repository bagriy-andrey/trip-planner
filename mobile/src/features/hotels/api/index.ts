// Public api surface of the hotels feature. The error classifier and `TripApiError` are the trips
// feature's own (imported from its public index, not copied).
import { mapTripError, TripApiError } from "@/features/trips";
import type { TripErrorKind } from "@/features/trips";

import type { HotelResult } from "./hotelsApi";

export { createHotel, deleteHotel, getHotel, listHotels, updateHotel } from "./hotelsApi";
export type {
  DeleteHotelResult,
  HotelFailure,
  HotelResult,
  HotelSuccess,
  ListHotelsResult,
  SingleHotelResult,
} from "./hotelsApi";

export { mapTripError, TripApiError };
export type { TripErrorKind };

/** The api answers with a closed result; TanStack Query needs a throw to enter the error state. */
export function unwrapHotel<T>(result: HotelResult<T>): T {
  if (!result.ok) throw new TripApiError(result.kind);
  return result.data;
}
