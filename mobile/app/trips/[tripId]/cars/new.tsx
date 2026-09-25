import { useLocalSearchParams } from "expo-router";

import { CarFormScreen } from "@/features/car-form";

/** S16 — create a car rental. The param is untrusted; the feature only uses it as a key. */
export default function NewCarRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return <CarFormScreen tripId={tripId} />;
}
