import { useLocalSearchParams } from "expo-router";

import { SegmentFormScreen } from "@/features/segment-form";

/** S9 — create a segment. The param is untrusted; the feature only uses it as a key. */
export default function NewFlightRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return <SegmentFormScreen tripId={tripId} />;
}
