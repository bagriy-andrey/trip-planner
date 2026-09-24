import { useRef, useState } from "react";

import { useDeleteHotel } from "@/features/hotels";

import { isNotFound, submitErrorKind } from "./submitError";
import type { SubmitErrorKind } from "./submitError";

/**
 * Delete with an on-screen confirmation (AC-32; never a system `Alert`). A hotel that is already gone
 * (deleted on another device) reads as "not found", not as an error (Edge case).
 */
export function useHotelDelete(
  target: { tripId: string; hotelId: string } | null,
  onDeleted: () => void,
  onGone: () => void,
) {
  const remove = useDeleteHotel();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<SubmitErrorKind | null>(null);
  const inFlight = useRef(false);

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
      onDeleted();
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

  return { canDelete: target !== null, open, busy, error, ask, cancel, confirm: () => void confirm() };
}
