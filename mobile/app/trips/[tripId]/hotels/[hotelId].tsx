import { useLocalSearchParams } from "expo-router";

import { HotelFormScreen } from "@/features/hotel-form";

/** S14b — edit an existing hotel; an unknown/foreign/malformed id shows "Hotel not found". Both params are untrusted; used only as keys. */
export default function HotelRoute() {
  const { tripId, hotelId } = useLocalSearchParams<{ tripId: string; hotelId: string }>();
  return <HotelFormScreen tripId={tripId} hotelId={hotelId} />;
}
