import { useLocalSearchParams } from "expo-router";

import { TripFormScreen } from "@/features/trip-form";

/** S8b — edit-trip sheet (modal). The param is untrusted; the feature only uses it as a key. */
export default function EditTripRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return <TripFormScreen mode="edit" tripId={tripId} />;
}
