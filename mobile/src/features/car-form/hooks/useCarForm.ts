import { parseCarForm } from "@tripplanner/shared";
import type { CalendarDate, ClockTime, CurrencyCode } from "@tripplanner/shared";
import { useRef, useState } from "react";

import { useMapsLink } from "@/components";
import { useCreateCar, useUpdateCar } from "@/features/cars";
import { useHomeDefaults } from "@/features/profile";
import { useToday } from "@/lib/clock";
import { useLeaveGuard } from "@/lib/forms";
import { useTranslation } from "@/lib/i18n";

import { deriveCarErrors } from "./carErrors";
import type { ErrorGroup } from "./carErrors";
import { carDateFloor, carFormEquals, toCarFormInput } from "./formState";
import type { CarFormState } from "./formState";
import { isNotFound, submitErrorKind } from "./submitError";
import type { SubmitErrorKind } from "./submitError";
import { useCarDelete } from "./useCarDelete";
import { useFlightWarning } from "./useFlightWarning";

export type CarFormTarget = { mode: "create"; tripId: string } | { mode: "edit"; tripId: string; carId: string };

/**
 * All logic of S16/S16b: state, errors (live from the ONE shared schema, hidden until a group is
 * "touched" or a save was attempted), the maps link, currency sheet, submit, delete and close.
 * The components only render what this returns.
 */
export function useCarForm(target: CarFormTarget, initial: CarFormState) {
  const { t: tTrips } = useTranslation("trips");
  const { homeCurrency } = useHomeDefaults();
  const create = useCreateCar();
  const update = useUpdateCar();
  const today = useToday();

  const [state, setState] = useState<CarFormState>(initial);
  const [initialState] = useState<CarFormState>(initial);
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState<ReadonlySet<ErrorGroup>>(new Set());
  const [submitError, setSubmitError] = useState<SubmitErrorKind | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [gone, setGone] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  // Two taps in one frame both see the state from BEFORE the first (AC-34): a ref guards the second.
  const inFlight = useRef(false);

  const dateFloor = carDateFloor(target.mode, today, initialState.pickupDate);
  const pickupInPast = state.pickupDate !== null && state.pickupDate < dateFloor;
  const del = useCarDelete(target.mode === "edit" ? { tripId: target.tripId, carId: target.carId } : null, () =>
    setGone(true),
  );
  const guard = useLeaveGuard(!carFormEquals(initialState, state) && !del.deleted);
  const flightWarning = useFlightWarning(target.tripId, state);

  const apply = (changes: Partial<CarFormState>) => {
    setState((current) => ({ ...current, ...changes }));
    setSubmitError(null);
  };
  const touch = (group: ErrorGroup) => setTouched((current) => new Set(current).add(group));

  const parsed = parseCarForm(toCarFormInput(state));
  const errors = deriveCarErrors(
    parsed.ok ? {} : parsed.fieldErrors,
    (group) => attempted || touched.has(group),
    pickupInPast,
  );

  const maps = useMapsLink(state, apply);

  const submit = async () => {
    if (inFlight.current) return;
    setAttempted(true);
    if (pickupInPast) return;
    const result = parseCarForm(toCarFormInput(state));
    if (!result.ok) return;
    inFlight.current = true;
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (target.mode === "create") await create.mutateAsync({ tripId: target.tripId, form: result.value });
      else await update.mutateAsync({ tripId: target.tripId, carId: target.carId, form: result.value });
      guard.leave();
    } catch (failure) {
      if (isNotFound(failure)) setGone(true);
      else setSubmitError(submitErrorKind(failure));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  return {
    isEdit: target.mode === "edit",
    state,
    errors,
    gone,
    submitting,
    submitError: submitError === null ? null : tTrips(`errors.${submitError}`),
    submit: () => void submit(),
    apply,
    touch,
    maps: { ...maps, blur: () => { touch("mapsUrl"); maps.commit(); } },
    dateFloor,
    flightWarning,
    changeRange: (pickupDate: CalendarDate, returnDate: CalendarDate) => {
      apply({ pickupDate, returnDate });
      touch("dates");
    },
    changeTime: (which: "pickupTime" | "returnTime", time: ClockTime) => {
      apply({ [which]: time });
      touch(which);
    },
    currency: {
      open: currencyOpen,
      openSheet: () => setCurrencyOpen(true),
      close: () => setCurrencyOpen(false),
      select: (code: CurrencyCode | null) => {
        apply({ costCurrency: code ?? "" });
        touch("cost");
        setCurrencyOpen(false);
      },
      placeholder: homeCurrency,
    },
    guard,
    del,
  };
}

export type CarFormController = ReturnType<typeof useCarForm>;
