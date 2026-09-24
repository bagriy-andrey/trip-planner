import { useLocalSearchParams } from "expo-router";

import { HotelFormScreen } from "@/features/hotel-form";

/** S14 — create a hotel. The param is untrusted; the feature only uses it as a key. */
export default function NewHotelRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return <HotelFormScreen tripId={tripId} />;
}
