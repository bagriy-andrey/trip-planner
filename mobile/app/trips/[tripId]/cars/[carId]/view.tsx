import { useLocalSearchParams } from "expo-router";

import { CarViewScreen } from "@/features/car-view";

/** S17 — read-only car rental view. Both params are untrusted; used only as keys. */
export default function CarViewRoute() {
  const { tripId, carId } = useLocalSearchParams<{ tripId: string; carId: string }>();
  return <CarViewScreen tripId={tripId} carId={carId} />;
}
