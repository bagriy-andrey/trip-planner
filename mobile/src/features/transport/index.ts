// Public surface of the transport feature (route chain, S13 "Route", and the S7 "Transport"
// block). Step 6 deliberately did not create this file ("index.ts фичи ... принадлежит шагу 7",
// PLAN-04 §1.6), so this is also the first export of step 6's api/hooks — not just step 7's own
// new pieces.

// Screens and presentation.
export { RouteScreen } from "./RouteScreen";
export type { RouteScreenProps } from "./RouteScreen";
export { TransportBlock } from "./components/TransportBlock";
export type { TransportBlockProps } from "./components/TransportBlock";
export { NotClosedCard } from "./components/NotClosedCard";
export type { NotClosedCardProps } from "./components/NotClosedCard";
export { RouteEmpty, RouteLoadError, RouteLoading, RouteTripNotFound } from "./components/RouteStates";
export type { RouteLoadErrorProps, RouteTripNotFoundProps } from "./components/RouteStates";

// Data: query keys, queries, mutations, view-model helpers (step 6) and the route-view hook (step 7).
export { segmentKeys } from "./hooks/queryKeys";
export { useSegmentQuery } from "./hooks/useSegmentQuery";
export type { SegmentQueryResult } from "./hooks/useSegmentQuery";
export { useSegmentsQuery } from "./hooks/useSegmentsQuery";
export type { SegmentsQueryResult } from "./hooks/useSegmentsQuery";
export {
  useCreateSegment,
  useDeleteSegment,
  useSegmentMutations,
  useUpdateSegment,
} from "./hooks/useSegmentMutations";
export type {
  CreateSegmentMutation,
  CreateSegmentVariables,
  DeleteSegmentMutation,
  DeleteSegmentVariables,
  SegmentMutations,
  UpdateSegmentMutation,
  UpdateSegmentVariables,
} from "./hooks/useSegmentMutations";
export { useRouteView } from "./hooks/useRouteView";
export { segmentListStatus } from "./types";
export type { SegmentListStatus } from "./types";
