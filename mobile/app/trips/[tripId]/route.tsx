import { useLocalSearchParams, useRouter } from "expo-router";

import { RouteScreen } from "@/features/transport";

/** S13 — the whole route as a read-only chain, pushed over the trip details. */
export default function RouteRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();

  return (
    <RouteScreen tripId={tripId} onBack={() => router.back()} />
  );
}
