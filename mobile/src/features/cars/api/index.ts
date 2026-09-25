// Public api surface of the cars feature. The error classifier and `TripApiError` are the trips
// feature's own (imported from its public index, not copied).
import { mapTripError, TripApiError } from "@/features/trips";
import type { TripErrorKind } from "@/features/trips";

import type { CarResult } from "./carsApi";

export { createCar, deleteCar, getCar, listCars, updateCar } from "./carsApi";
export type {
  CarFailure,
  CarResult,
  CarSuccess,
  DeleteCarResult,
  ListCarsResult,
  SingleCarResult,
} from "./carsApi";

export { mapTripError, TripApiError };
export type { TripErrorKind };

/** The api answers with a closed result; TanStack Query needs a throw to enter the error state. */
export function unwrapCar<T>(result: CarResult<T>): T {
  if (!result.ok) throw new TripApiError(result.kind);
  return result.data;
}
