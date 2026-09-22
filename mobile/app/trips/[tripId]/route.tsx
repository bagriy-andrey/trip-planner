import { useLocalSearchParams, useRouter } from "expo-router";

import { RouteScreen } from "@/features/transport";

/**
 * S13 — the whole route as one chain, pushed over the trip details. `RouteScreen` (Step 7) is
 * state-only and reports intent through callback props; only "back" has a real target yet.
 * Adding/opening a segment targets the segment form (Step 9, `features/segment-form`, not built
 * yet) and is wired once that route exists — leaving it a no-op here does not renaming or add a
 * route outside this step's file list.
 */
export default function RouteRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();

  return (
    <RouteScreen
      tripId={tripId}
      onBack={() => router.back()}
      onAddSegment={() => {}}
      onSegmentPress={() => {}}
      onAddFromNotClosed={() => {}}
    />
  );
}
