import { useLocalSearchParams } from "expo-router";

import { TripDetailScreen } from "@/features/trip-detail";

export default function TripDetailRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return <TripDetailScreen tripId={tripId} />;
}
