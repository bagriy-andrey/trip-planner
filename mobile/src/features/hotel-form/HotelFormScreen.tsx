import { useRouter } from "expo-router";

import { useHotelQuery } from "@/features/hotels";
import { useTripQuery } from "@/features/trips";
import { useToday } from "@/lib/clock";
import { resolveLocale, useTranslation } from "@/lib/i18n";

import { HotelFormBody } from "./components/HotelFormBody";
import { HotelFormLoadError, HotelFormLoading, HotelNotFound } from "./components/HotelFormStates";
import { hotelFormFromHotel, hotelFormFromTrip } from "./hooks/formState";

export interface HotelFormScreenProps {
  tripId: string;
  /** Missing = create (S14); present = edit (S14b) — one screen, one schema. Raw route param, used only as a key. */
  hotelId?: string;
}

/** S14 / S14b — the hotel form. */
export function HotelFormScreen({ tripId, hotelId }: HotelFormScreenProps) {
  return hotelId === undefined ? (
    <CreateHotelLoader tripId={tripId} />
  ) : (
    <EditHotelLoader tripId={tripId} hotelId={hotelId} />
  );
}

/** Create needs the trip first: its city and dates prefill the form (AC-10/AC-11). */
function CreateHotelLoader({ tripId }: { tripId: string }) {
  const { i18n } = useTranslation();
  const lang = resolveLocale([i18n.language]);
  const router = useRouter();
  const today = useToday();
  const query = useTripQuery(tripId);
  const back = () => router.back();

  if (query.trip !== undefined) {
    return <HotelFormBody key="create" target={{ mode: "create", tripId }} initial={hotelFormFromTrip(query.trip, lang, today)} />;
  }
  if (query.isError && query.error?.kind === "notFound") return <HotelNotFound onBack={back} />;
  if (query.isError) {
    return <HotelFormLoadError kind={query.error?.kind ?? null} onRetry={() => void query.refetch()} onBack={back} />;
  }
  return <HotelFormLoading onBack={back} />;
}

/** Edit: one hotel by id, scoped to the trip. Unknown, foreign, malformed and deleted ids all read "not found" (AC-33). */
function EditHotelLoader({ tripId, hotelId }: { tripId: string; hotelId: string }) {
  const { i18n } = useTranslation();
  const lang = resolveLocale([i18n.language]);
  const router = useRouter();
  const query = useHotelQuery(tripId, hotelId);
  const back = () => router.back();

  if (query.hotel !== undefined) {
    return (
      <HotelFormBody
        key={query.hotel.id}
        target={{ mode: "edit", tripId, hotelId }}
        initial={hotelFormFromHotel(query.hotel, lang)}
        hotelName={query.hotel.name}
      />
    );
  }
  if (query.isError && query.error?.kind === "notFound") return <HotelNotFound onBack={back} />;
  if (query.isError) {
    return <HotelFormLoadError kind={query.error?.kind ?? null} onRetry={() => void query.refetch()} onBack={back} />;
  }
  return <HotelFormLoading onBack={back} />;
}
