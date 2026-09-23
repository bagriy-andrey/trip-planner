import {
  SEGMENT_FIELD_ERROR,
  SEGMENT_PASSENGERS_MAX,
  SEGMENT_PASSENGERS_MIN,
  buildRoute,
  findAirline,
  nextSegmentPrefill,
  parseFlightNumber,
  parseSegmentForm,
  searchAirports,
} from "@tripplanner/shared";
import type {
  AirportRecord,
  CalendarDate,
  ClockTime,
  Segment,
  SegmentFormFieldErrors,
  SegmentFormInput,
  SegmentFormRules,
} from "@tripplanner/shared";
import { useNavigation, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { TripApiError, useTripQuery } from "@/features/trips";
import { useSegmentMutations, useSegmentsQuery } from "@/features/transport";
import { useNow } from "@/lib/clock";
import { resolveLocale, useTranslation } from "@/lib/i18n";

import {
  EMPTY_SEGMENT_FORM,
  airportDisplayText,
  segmentFormEquals,
  segmentFormFromNextPrefill,
} from "./formState";
import type { SegmentFormState } from "./formState";

export type SegmentFormTarget =
  | { mode: "create"; tripId: string }
  | { mode: "edit"; tripId: string; segmentId: string };

/** Which `trips:errors.*` message a failed request shows; `notFound` has no message of its own. */
export type SubmitErrorKind = "offline" | "timeout" | "denied" | "unknown";

function submitErrorKind(error: unknown): SubmitErrorKind {
  if (!(error instanceof TripApiError)) return "unknown";
  return error.kind === "notFound" ? "unknown" : error.kind;
}

export type CarrierInfo =
  | { kind: "empty" }
  | { kind: "recognized"; name: string }
  | { kind: "unrecognized" };

/** Which sheet the delete flow is showing (edit mode only). */
export type DeleteSheet = "closed" | "confirm";

function toSegmentFormInput(state: SegmentFormState): SegmentFormInput {
  return {
    flightNumber: state.flightNumber,
    from: state.fromAirport?.iata ?? "",
    to: state.toAirport?.iata ?? "",
    departureDate: state.departureDate,
    departureTime: state.departureTime,
    arrivalDate: state.arrivalDate,
    arrivalTime: state.arrivalTime,
    baggageIncluded: state.baggageIncluded,
    passengers: state.passengers,
    seat: state.seat,
    ticketNumber: state.ticketNumber,
  };
}

/**
 * All logic of S9/S9b: field state, the airport-directory-only rule, carrier recognition, the two
 * submit paths ("Done" and "Save and add next"), delete with an on-screen confirmation, and the
 * unsaved-changes-on-close guard. The screen only renders what this returns.
 *
 * "Save and add next" never navigates: it resets the form IN PLACE to a fresh create, prefilled
 * from `nextSegmentPrefill` (AC-41..AC-44) — this is what "immediately opens the next form" means
 * here, and it needs no route params (this step owns no route beyond `new`/`[flightId]`). The chain
 * used for that prefill is accumulated locally for the lifetime of this screen (seeded once from
 * the trip's current segments): each save is folded into it, so a multi-segment session computes
 * the same `RouteView` a fresh load would after the mutations' own cache invalidation lands.
 */
export function useSegmentForm(target: SegmentFormTarget, initial: SegmentFormState) {
  const router = useRouter();
  const navigation = useNavigation();
  const now = useNow();
  const { t: tTrips } = useTranslation("trips");
  const { i18n } = useTranslation();
  const lang = resolveLocale([i18n.language]);

  const tripQuery = useTripQuery(target.tripId);
  const segmentsQuery = useSegmentsQuery(target.tripId);
  const { create, update, remove } = useSegmentMutations();

  const [active, setActive] = useState<SegmentFormTarget>(target);
  const [state, setState] = useState<SegmentFormState>(initial);
  const [initialState, setInitialState] = useState<SegmentFormState>(initial);
  const [errors, setErrors] = useState<SegmentFormFieldErrors>({});
  const [submitError, setSubmitError] = useState<SubmitErrorKind | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fromSuggestionsOpen, setFromSuggestionsOpen] = useState(false);
  const [toSuggestionsOpen, setToSuggestionsOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [deleteSheet, setDeleteSheet] = useState<DeleteSheet>("closed");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<SubmitErrorKind | null>(null);

  // Two taps in the same frame both see the ref as it was BEFORE the first one started (AC-46);
  // a plain `submitting` state re-render is not fast enough to guard the second tap.
  const inFlight = useRef(false);
  const deleteInFlight = useRef(false);

  // Seeded once the trip's segments have loaded, then folded locally as this screen saves more
  // (see the doc comment above) — never refetched mid-session, so a "save and add next" chain
  // stays correct even before the mutation's own cache invalidation round-trips.
  const [sessionSegments, setSessionSegments] = useState<Segment[] | null>(null);
  useEffect(() => {
    if (sessionSegments === null && segmentsQuery.segments !== undefined) {
      setSessionSegments([...segmentsQuery.segments]);
    }
  }, [sessionSegments, segmentsQuery.segments]);

  type UiField =
    | "flightNumber"
    | "fromAirport"
    | "to"
    | "departureDate"
    | "departureTime"
    | "arrival"
    | "passengers"
    | "seat"
    | "ticketNumber";

  const patch = (changes: Partial<SegmentFormState>, clears: readonly UiField[] = []) => {
    setState((current) => ({ ...current, ...changes }));
    if (clears.length > 0) {
      setErrors((current) => {
        const next = { ...current };
        for (const field of clears) delete next[field];
        return next;
      });
    }
    setSubmitError(null);
  };

  // --- Flight number / carrier ------------------------------------------------------------------
  const parsedFlightNumber = parseFlightNumber(state.flightNumber);
  const trimmedFlightNumber = state.flightNumber.trim();
  const airline =
    parsedFlightNumber.valid && parsedFlightNumber.designator !== null
      ? findAirline(parsedFlightNumber.designator)
      : undefined;
  const carrier: CarrierInfo =
    trimmedFlightNumber === ""
      ? { kind: "empty" }
      : airline !== undefined
        ? { kind: "recognized", name: airline.name }
        : { kind: "unrecognized" };

  const changeFlightNumber = (value: string) => patch({ flightNumber: value }, ["flightNumber"]);

  // --- Airports (directory-only, AC-33) -----------------------------------------------------------
  const changeFrom = (text: string) => {
    patch({ fromText: text, fromAirport: null }, ["fromAirport"]);
    setFromSuggestionsOpen(true);
  };
  const clearFrom = () => {
    patch({ fromText: "", fromAirport: null }, ["fromAirport"]);
    setFromSuggestionsOpen(false);
  };
  const selectFromAirport = (airport: AirportRecord) => {
    patch({ fromText: airportDisplayText(airport, lang), fromAirport: airport }, ["fromAirport"]);
    setFromSuggestionsOpen(false);
  };

  const changeTo = (text: string) => {
    patch({ toText: text, toAirport: null }, ["to"]);
    setToSuggestionsOpen(true);
  };
  const clearTo = () => {
    patch({ toText: "", toAirport: null }, ["to"]);
    setToSuggestionsOpen(false);
  };
  const selectToAirport = (airport: AirportRecord) => {
    patch({ toText: airportDisplayText(airport, lang), toAirport: airport }, ["to"]);
    setToSuggestionsOpen(false);
  };

  const fromSuggestions: AirportRecord[] | null =
    fromSuggestionsOpen && state.fromAirport === null && state.fromText.trim() !== ""
      ? searchAirports(state.fromText)
      : null;
  const toSuggestions: AirportRecord[] | null =
    toSuggestionsOpen && state.toAirport === null && state.toText.trim() !== ""
      ? searchAirports(state.toText)
      : null;

  // --- Dates / time / baggage / passengers / seat / ticket ---------------------------------------
  const changeDepartureDate = (date: CalendarDate) => patch({ departureDate: date }, ["departureDate"]);
  const changeDepartureTime = (time: ClockTime) => patch({ departureTime: time }, ["departureTime"]);
  const changeArrivalDate = (date: CalendarDate | null) => patch({ arrivalDate: date }, ["arrival"]);
  const changeArrivalTime = (time: ClockTime | null) => patch({ arrivalTime: time }, ["arrival"]);
  const changeBaggage = (value: boolean) => patch({ baggageIncluded: value });
  const incrementPassengers = () =>
    patch({ passengers: Math.min(SEGMENT_PASSENGERS_MAX, state.passengers + 1) }, ["passengers"]);
  const decrementPassengers = () =>
    patch({ passengers: Math.max(SEGMENT_PASSENGERS_MIN, state.passengers - 1) }, ["passengers"]);
  const changeSeat = (value: string) => patch({ seat: value }, ["seat"]);
  const changeTicketNumber = (value: string) => patch({ ticketNumber: value }, ["ticketNumber"]);

  // --- Departure rules (past / before the trip) ---------------------------------------------------
  // Create always checks them; edit only once the departure moment or origin was touched, so an
  // already-departed segment can still have its seat or ticket fixed.
  const departureTouched =
    state.departureDate !== initialState.departureDate ||
    state.departureTime !== initialState.departureTime ||
    state.fromAirport?.iata !== initialState.fromAirport?.iata;
  const rules: SegmentFormRules | undefined =
    active.mode === "create" || departureTouched
      ? { now, tripStartDate: tripQuery.trip?.startDate ?? null }
      : undefined;

  const liveDepartureParse = parseSegmentForm(toSegmentFormInput(state), rules);
  const liveDepartureId = liveDepartureParse.ok ? undefined : liveDepartureParse.fieldErrors.departureDate;
  const departureRuleError =
    liveDepartureId === SEGMENT_FIELD_ERROR.departureInPast ||
    liveDepartureId === SEGMENT_FIELD_ERROR.departureBeforeTripStart
      ? liveDepartureId
      : undefined;

  // --- Submit --------------------------------------------------------------------------------------
  const canSubmit =
    state.fromAirport !== null &&
    state.toAirport !== null &&
    state.departureDate !== null &&
    state.departureTime !== null &&
    departureRuleError === undefined;

  async function trySubmit(): Promise<Segment | undefined> {
    if (inFlight.current) return undefined;
    const parsed = parseSegmentForm(toSegmentFormInput(state), rules);
    if (!parsed.ok) {
      setErrors(parsed.fieldErrors);
      return undefined;
    }
    inFlight.current = true;
    setErrors({});
    setSubmitError(null);
    setSubmitting(true);
    try {
      const segment =
        active.mode === "create"
          ? await create.mutateAsync({ tripId: active.tripId, form: parsed.value })
          : await update.mutateAsync({ tripId: active.tripId, segmentId: active.segmentId, form: parsed.value });
      return segment;
    } catch (error) {
      setSubmitError(submitErrorKind(error));
      return undefined;
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  /** Header "Готово" (AC-45): saves, then leaves to wherever the screen was opened from. */
  const done = async () => {
    const segment = await trySubmit();
    if (segment !== undefined) leave();
  };

  /** Bottom "Сохранить и добавить следующий" (AC-41..AC-46). */
  const saveAndNext = async () => {
    const segment = await trySubmit();
    if (segment === undefined) return;

    const prior = sessionSegments ?? [];
    const folded =
      active.mode === "create"
        ? [...prior, segment]
        : prior.map((existing) => (existing.id === segment.id ? segment : existing));
    setSessionSegments(folded);

    const trip = tripQuery.trip ?? { startDate: null, endDate: null };
    const route = buildRoute({ segments: folded, trip, now });
    const prefill = nextSegmentPrefill(route, segment);
    const next = segmentFormFromNextPrefill(prefill, lang);

    setState(next);
    setInitialState(next);
    setActive({ mode: "create", tripId: active.tripId });
    setErrors({});
    setSubmitError(null);
  };

  // --- Close / unsaved changes (AC-40) ------------------------------------------------------------
  const dirty = !segmentFormEquals(initialState, state);
  // Swipe-down / hardware back go through the navigator, not `requestClose`: intercept them while
  // there are unsaved edits. Our own exits (saved, deleted, discarded) set `leaving` first.
  const leaving = useRef(false);
  useEffect(() => {
    if (!dirty) return undefined;
    return navigation.addListener("beforeRemove", (event) => {
      if (leaving.current) return;
      event.preventDefault();
      setCloseConfirmOpen(true);
    });
  }, [dirty, navigation]);
  const leave = () => {
    leaving.current = true;
    router.back();
  };
  const requestClose = () => {
    if (dirty) setCloseConfirmOpen(true);
    else leave();
  };
  const confirmDiscard = () => {
    setCloseConfirmOpen(false);
    leave();
  };
  const cancelCloseConfirm = () => setCloseConfirmOpen(false);

  // --- Delete (edit mode only; AC-78/79) -----------------------------------------------------------
  const canDelete = active.mode === "edit";
  const askDelete = () => {
    if (!canDelete) return;
    setDeleteError(null);
    setDeleteSheet("confirm");
  };
  const cancelDelete = () => {
    if (deleteInFlight.current) return;
    setDeleteSheet("closed");
    setDeleteError(null);
  };
  const confirmDelete = async () => {
    if (active.mode !== "edit" || deleteInFlight.current) return;
    deleteInFlight.current = true;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await remove.mutateAsync({ tripId: active.tripId, segmentId: active.segmentId });
      setDeleteSheet("closed");
      leave();
    } catch (error) {
      setDeleteError(submitErrorKind(error));
    } finally {
      deleteInFlight.current = false;
      setDeleteBusy(false);
    }
  };

  return {
    lang,
    isEdit: active.mode === "edit",
    state,
    errors,
    departureRuleError,
    flightNumberInvalid: trimmedFlightNumber !== "" && !parsedFlightNumber.valid,
    carrier,
    fromSuggestions,
    toSuggestions,
    canSubmit,
    submitting,
    submitError: submitError === null ? null : tTrips(`errors.${submitError}`),
    dirty,
    changeFlightNumber,
    changeFrom,
    clearFrom,
    selectFromAirport,
    changeTo,
    clearTo,
    selectToAirport,
    changeDepartureDate,
    changeDepartureTime,
    changeArrivalDate,
    changeArrivalTime,
    changeBaggage,
    incrementPassengers,
    decrementPassengers,
    changeSeat,
    changeTicketNumber,
    done: () => void done(),
    saveAndNext: () => void saveAndNext(),
    requestClose,
    closeConfirmOpen,
    confirmDiscard,
    cancelCloseConfirm,
    canDelete,
    deleteSheet,
    deleteBusy,
    deleteError: deleteError === null ? null : tTrips(`errors.${deleteError}`),
    askDelete,
    cancelDelete,
    confirmDelete: () => void confirmDelete(),
  };
}

export type SegmentFormController = ReturnType<typeof useSegmentForm>;
