// Public surface of the trips feature: other features import ONLY from here.

// Screens and presentation (S4 list; the card and chip are reused by S5 and S7).
export { TripsScreen } from "./TripsScreen";
export { TripCard } from "./components/TripCard";
export type { TripCardProps } from "./components/TripCard";
export { TripStatusPill, useTripStatusLabel } from "./components/TripStatusPill";
export type { TripStatusPillProps } from "./components/TripStatusPill";
export {
  TRIP_LIST_WINDOW,
  TripListStates,
  tripListStatus,
  useTripListStatus,
} from "./components/TripListStates";
export type { TripListStatus, TripListStatesProps, TripListVariant } from "./components/TripListStates";
export { toTripCardData } from "./types";
export type { TripCardContext, TripCardData, TripStatusKind } from "./types";

// Data: queries, mutations and the api error type (steps 9 and 10).
export { tripKeys } from "./hooks/queryKeys";
export { useTripQuery } from "./hooks/useTripQuery";
export type { TripQueryResult } from "./hooks/useTripQuery";
export { useTripsQuery } from "./hooks/useTripsQuery";
export type { TripsQueryResult } from "./hooks/useTripsQuery";
export {
  useArchiveTrip,
  useCreateTrip,
  useDeleteTrip,
  useTripMutations,
  useUnarchiveTrip,
  useUpdateTrip,
} from "./hooks/useTripMutations";
export type {
  CreateTripMutation,
  DeleteTripMutation,
  TripIdMutation,
  TripMutations,
  UpdateTripMutation,
  UpdateTripVariables,
} from "./hooks/useTripMutations";
export { TripApiError, mapTripError } from "./api";
export type { TripErrorKind } from "./api";
