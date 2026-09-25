import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { useDeleteCar } from "@/features/cars";

import { isNotFound, submitErrorKind } from "./submitError";
import type { SubmitErrorKind } from "./submitError";

/**
 * Delete with an on-screen confirmation (AC-31; never a system `Alert`). Success goes to the trip
 * (S7) with `dismissTo`, so the rental's own view (S17) under the form leaves the stack too. A rental
 * that is already gone reads as "not found", not as an error.
 */
export function useCarDelete(target: { tripId: string; carId: string } | null, onGone: () => void) {
  const router = useRouter();
  const remove = useDeleteCar();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<SubmitErrorKind | null>(null);
  const inFlight = useRef(false);
  const tripId = target?.tripId;

  // Navigating from an effect lets the form drop its unsaved-changes guard (it re-subscribes on the
  // `deleted` render, and passive cleanups run before this effect), so a dirty form still closes.
  useEffect(() => {
    if (deleted && tripId !== undefined) router.dismissTo({ pathname: "/trips/[tripId]", params: { tripId } });
  }, [deleted, router, tripId]);

  const ask = () => {
    if (target === null) return;
    setError(null);
    setOpen(true);
  };
  const cancel = () => {
    if (inFlight.current) return;
    setOpen(false);
    setError(null);
  };
  const confirm = async () => {
    if (target === null || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await remove.mutateAsync(target);
      setOpen(false);
      setDeleted(true);
    } catch (failure) {
      if (isNotFound(failure)) {
        setOpen(false);
        onGone();
      } else {
        setError(submitErrorKind(failure));
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return { canDelete: target !== null, open, busy, deleted, error, ask, cancel, confirm: () => void confirm() };
}
