import { parseTripForm, searchPlaces } from "@tripplanner/shared";
import type { CalendarDate, PlaceRecord, TripFormInput } from "@tripplanner/shared";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";

import { TripApiError, useCreateTrip, useUpdateTrip } from "@/features/trips";
import { useToday } from "@/lib/clock";
import { resolveLocale, useTranslation } from "@/lib/i18n";

import type { TripFormErrors, TripFormField, TripFormState } from "./formState";

export type TripFormMode = { mode: "create" } | { mode: "edit"; tripId: string };

/** Which `trips:errors.*` message a failed request shows; `notFound` has no message of its own. */
export type SubmitErrorKind = "offline" | "timeout" | "denied" | "unknown";

function submitErrorKind(error: unknown): SubmitErrorKind {
  if (!(error instanceof TripApiError)) return "unknown";
  return error.kind === "notFound" ? "unknown" : error.kind;
}

/** What the form sends to validation: "no dates" wins over whatever the pickers still remember. */
function toInput(state: TripFormState): TripFormInput {
  return {
    destination: state.destination,
    placeId: state.placeId,
    title: state.title,
    startDate: state.noDates ? null : state.startDate,
    endDate: state.noDates ? null : state.endDate,
  };
}

/**
 * All logic of the create / edit sheet (S8, S8b): field state, the place-vs-free-text rule,
 * validation BEFORE any request (one shared schema for both modes, AC-49), the single in-flight
 * request (AC-32) and the failure path that keeps everything typed (AC-57, AC-58). The screen
 * only renders what this returns.
 */
export function useTripForm(target: TripFormMode, initial: TripFormState) {
  const router = useRouter();
  const today = useToday();
  const { i18n } = useTranslation();
  const lang = resolveLocale([i18n.language]);
  const createTrip = useCreateTrip();
  const updateTrip = useUpdateTrip();

  const [state, setState] = useState<TripFormState>(initial);
  const [errors, setErrors] = useState<TripFormErrors>({});
  const [submitError, setSubmitError] = useState<SubmitErrorKind | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Suggestions appear only once the user types: a prefilled value must not open the list.
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  // A ref, not the state: two taps in the same frame both see `submitting === false`.
  const inFlight = useRef(false);

  const patch = (changes: Partial<TripFormState>, clears: readonly TripFormField[]) => {
    setState((current) => ({ ...current, ...changes }));
    setErrors((current) => {
      const next = { ...current };
      for (const field of clears) delete next[field];
      return next;
    });
    setSubmitError(null);
  };

  // Typing ALWAYS ends the directory pick (AC-51): the text is now the user's own, so the
  // directory fields must not stay attached to it. The exact text of an entry typed by hand is
  // free text too — only tapping a suggestion picks it.
  const changeDestination = (text: string) => {
    patch({ destination: text, placeId: null }, ["destination"]);
    setSuggestionsOpen(true);
  };

  const clearDestination = () => {
    patch({ destination: "", placeId: null }, ["destination"]);
    setSuggestionsOpen(false);
  };

  const selectPlace = (place: PlaceRecord) => {
    patch({ destination: place[lang], placeId: place.id }, ["destination"]);
    setSuggestionsOpen(false);
  };

  // `null` = list hidden; `[]` = nothing found (the "we'll keep it as typed" row, AC-14).
  const suggestions: PlaceRecord[] | null =
    suggestionsOpen && state.placeId === null && state.destination.trim() !== ""
      ? searchPlaces(state.destination)
      : null;

  const submit = async () => {
    if (inFlight.current) return;
    const parsed = parseTripForm(toInput(state));
    // Invalid input never reaches the network (AC-17..AC-19, AC-26).
    if (!parsed.ok) {
      setErrors(parsed.fieldErrors);
      return;
    }
    inFlight.current = true;
    setErrors({});
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (target.mode === "create") {
        const trip = await createTrip.mutateAsync(parsed.value);
        // Replace, not push: the back gesture from the details must not reopen the sheet (AC-30).
        router.replace({ pathname: "/trips/[tripId]", params: { tripId: trip.id } });
      } else {
        await updateTrip.mutateAsync({ id: target.tripId, form: parsed.value });
        router.back();
      }
      // Success keeps the guard set: the sheet is closing and a late tap must not save twice.
    } catch (error) {
      inFlight.current = false;
      setSubmitting(false);
      setSubmitError(submitErrorKind(error));
    }
  };

  return {
    lang,
    state,
    errors,
    submitError,
    submitting,
    suggestions,
    // Empty after normalization = the button is inactive (AC-29). Any other problem is
    // reported on press, next to its field.
    canSubmit: state.destination.trim() !== "",
    /** A directory place is picked: the field gets the accent border. */
    placeSelected: state.placeId !== null,
    /** Where a picker starts when the user taps an empty date button. */
    startFallback: today,
    changeDestination,
    clearDestination,
    selectPlace,
    changeTitle: (title: string) => patch({ title }, ["title"]),
    changeRange: (start: CalendarDate, end: CalendarDate) => patch({ startDate: start, endDate: end }, ["dates"]),
    changeNoDates: (noDates: boolean) => patch({ noDates }, ["dates"]),
    submit,
    cancel: () => router.back(),
  };
}

export type TripFormController = ReturnType<typeof useTripForm>;
