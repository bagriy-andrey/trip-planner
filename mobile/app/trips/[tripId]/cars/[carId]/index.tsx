import { useLocalSearchParams } from "expo-router";

import { CarFormScreen } from "@/features/car-form";

/** S16b — edit a car rental. Both params are untrusted; used only as keys. */
export default function CarEditRoute() {
  const { tripId, carId } = useLocalSearchParams<{ tripId: string; carId: string }>();
  return <CarFormScreen tripId={tripId} carId={carId} />;
}
