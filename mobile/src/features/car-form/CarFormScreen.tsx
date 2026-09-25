import { useRouter } from "expo-router";

import { useCarQuery } from "@/features/cars";
import { useHomeDefaults } from "@/features/profile";
import { useTripQuery } from "@/features/trips";
import { useToday } from "@/lib/clock";

import { CarFormBody } from "./components/CarFormBody";
import { CarFormLoadError, CarFormLoading, CarFormNotFound } from "./components/CarFormStates";
import { carFormFromCar, carFormFromTrip } from "./hooks/formState";

export interface CarFormScreenProps {
  tripId: string;
  /** Missing = create (S16); present = edit (S16b) — one screen, one schema. Raw route param, used only as a key. */
  carId?: string;
}

/** S16 / S16b — the car rental form. */
export function CarFormScreen({ tripId, carId }: CarFormScreenProps) {
  return carId === undefined ? <CreateCarLoader tripId={tripId} /> : <EditCarLoader tripId={tripId} carId={carId} />;
}

/** Create needs the trip first: its dates prefill the form (AC-11). */
function CreateCarLoader({ tripId }: { tripId: string }) {
  const router = useRouter();
  const today = useToday();
  const { homeCurrency } = useHomeDefaults();
  const query = useTripQuery(tripId);
  const back = () => router.back();

  if (query.trip !== undefined) {
    return <CarFormBody key="create" target={{ mode: "create", tripId }} initial={carFormFromTrip(query.trip, today, homeCurrency)} />;
  }
  if (query.isError && query.error?.kind === "notFound") return <CarFormNotFound onBack={back} />;
  if (query.isError) {
    return <CarFormLoadError kind={query.error?.kind ?? null} onRetry={() => void query.refetch()} onBack={back} />;
  }
  return <CarFormLoading onBack={back} />;
}

/** Edit: one rental by id, scoped to the trip. Unknown, foreign, malformed and deleted ids all read "not found" (AC-32). */
function EditCarLoader({ tripId, carId }: { tripId: string; carId: string }) {
  const router = useRouter();
  const query = useCarQuery(tripId, carId);
  const back = () => router.back();

  if (query.car !== undefined) {
    return <CarFormBody key={query.car.id} target={{ mode: "edit", tripId, carId }} initial={carFormFromCar(query.car)} carName={query.car.company ?? query.car.bookingRef} />;
  }
  if (query.isError && query.error?.kind === "notFound") return <CarFormNotFound onBack={back} />;
  if (query.isError) {
    return <CarFormLoadError kind={query.error?.kind ?? null} onRetry={() => void query.refetch()} onBack={back} />;
  }
  return <CarFormLoading onBack={back} />;
}
