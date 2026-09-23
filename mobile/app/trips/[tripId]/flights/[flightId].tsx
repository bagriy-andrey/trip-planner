import { useLocalSearchParams } from "expo-router";

import { SegmentFormScreen } from "@/features/segment-form";

/** S9b — edit an existing segment; an unknown/foreign/malformed id shows "Segment not found"
 * (AC-80/81), not a blank flight form. Both params are untrusted; used only as keys. */
export default function FlightRoute() {
  const { tripId, flightId } = useLocalSearchParams<{ tripId: string; flightId: string }>();
  return <SegmentFormScreen tripId={tripId} segmentId={flightId} />;
}
