import {
  HOTEL_GUESTS_MAX,
  HOTEL_GUESTS_MIN,
  HOTEL_FIELD_ERROR,
  breakfastDaysRange,
  clampBreakfastDays,
  parseHotelForm,
  searchCities,
} from "@tripplanner/shared";
import type {
  CalendarDate,
  CityRecord,
  ClockTime,
  CurrencyCode,
  HotelBreakfast,
  HotelFieldErrorId,
  HotelFormFieldErrors,
  HotelParking,
} from "@tripplanner/shared";
import { useRef, useState } from "react";

import { useCreateHotel, useUpdateHotel } from "@/features/hotels";
import { useToday } from "@/lib/clock";
import { resolveLocale, useTranslation } from "@/lib/i18n";

import { cityDisplayText, hotelDateFloor, hotelFormEquals, nightsOf, toHotelFormInput, withDates } from "./formState";
import type { HotelFormState } from "./formState";
import { filterMoneyInput } from "./moneyInput";
import { isNotFound, submitErrorKind } from "./submitError";
import type { SubmitErrorKind } from "./submitError";
import { useHotelDelete } from "./useHotelDelete";
import { useLeaveGuard } from "./useLeaveGuard";
import { useMapsLink } from "./useMapsLink";

export type HotelFormTarget =
  | { mode: "create"; tripId: string }
  | { mode: "edit"; tripId: string; hotelId: string };

/** Mobile-only date rule (needs the clock, so it is not a `shared` id): key under `hotel.form.validation`. */
export const CHECK_IN_IN_PAST = "checkIn.inPast";
export type DatesErrorId = HotelFieldErrorId | typeof CHECK_IN_IN_PAST;

/** Field groups whose error shows after the user leaves them (or after the first save attempt, AC-15). */
type Group = "name" | "city" | "dates" | "times" | "address" | "mapsUrl" | "cost" | "bookingRef" | "notes";

/**
 * All logic of S14/S14b: field state, the directory-only city rule, nights and breakfast range (from
 * `shared`), the maps link, submit / delete / close. The components only render what this returns.
 * Errors are computed live from the ONE shared schema and merely hidden until a field is "touched".
 */
export function useHotelForm(target: HotelFormTarget, initial: HotelFormState) {
  const { i18n } = useTranslation();
  const lang = resolveLocale([i18n.language]);
  const { t: tTrips } = useTranslation("trips");
  const create = useCreateHotel();
  const update = useUpdateHotel();

  const [state, setState] = useState<HotelFormState>(initial);
  const [initialState] = useState<HotelFormState>(initial);
  const today = useToday();
  // Days before this are not selectable (create: today; edit: min(today, stored check-in)).
  const dateFloor = hotelDateFloor(target.mode, today, initialState.checkInDate);
  const checkInInPast = state.checkInDate !== null && state.checkInDate < dateFloor;
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState<ReadonlySet<Group>>(new Set());
  const [citySuggestionsOpen, setCitySuggestionsOpen] = useState(false);
  const [submitError, setSubmitError] = useState<SubmitErrorKind | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [gone, setGone] = useState(false);
  // Two taps in one frame both see the state from BEFORE the first (AC-40): a ref guards the second.
  const inFlight = useRef(false);

  const dirty = !hotelFormEquals(initialState, state);
  const guard = useLeaveGuard(dirty);
  const del = useHotelDelete(
    target.mode === "edit" ? { tripId: target.tripId, hotelId: target.hotelId } : null,
    guard.leave,
    () => setGone(true),
  );

  const apply = (changes: Partial<HotelFormState>) => {
    setState((current) => ({ ...current, ...changes }));
    setSubmitError(null);
  };
  const touch = (group: Group) => setTouched((current) => new Set(current).add(group));

  // --- Errors ---------------------------------------------------------------------------------
  const parsed = parseHotelForm(toHotelFormInput(state));
  const raw: HotelFormFieldErrors = parsed.ok ? {} : parsed.fieldErrors;
  const visible = (group: Group) => attempted || touched.has(group);
  const errorId = (group: Group, ...fields: string[]): HotelFieldErrorId | undefined =>
    visible(group) ? fields.map((field) => raw[field]).find((id) => id !== undefined) : undefined;

  const cityError: HotelFieldErrorId | undefined =
    errorId("city", "city") === undefined
      ? undefined
      : state.city === null && state.cityText.trim() !== ""
        ? HOTEL_FIELD_ERROR.cityNotInDirectory
        : raw.city;
  // The range field owns the missing-date and stay-too-long errors; the cross-field "not after
  // check-in" (same day, both times) belongs under the check-out TIME field.
  const datesErrors: DatesErrorId[] = visible("dates")
    ? [
        raw.checkInDate,
        checkInInPast ? CHECK_IN_IN_PAST : undefined,
        raw.checkOutDate,
        raw.checkOut === HOTEL_FIELD_ERROR.checkOutStayTooLong ? raw.checkOut : undefined,
      ].filter((id): id is DatesErrorId => id !== undefined)
    : [];
  const timesError =
    visible("times") && raw.checkOut === HOTEL_FIELD_ERROR.checkOutNotAfterCheckIn ? raw.checkOut : undefined;
  const errors = {
    name: errorId("name", "name"),
    city: cityError,
    dates: datesErrors,
    checkOutTime: timesError,
    address: errorId("address", "address"),
    mapsUrl: errorId("mapsUrl", "mapsUrl"),
    costAmount: errorId("cost", "costAmount"),
    costCurrency: errorId("cost", "costCurrency"),
    bookingRef: errorId("bookingRef", "bookingRef"),
    notes: errorId("notes", "notes"),
  };

  // --- Simple text fields -----------------------------------------------------------------------
  const nights = nightsOf(state);
  const breakfastRange = breakfastDaysRange(nights);

  // --- City (directory only, AC-12) ------------------------------------------------------------------
  const changeCity = (text: string) => {
    apply({ cityText: text, city: null });
    setCitySuggestionsOpen(true);
  };
  const selectCity = (city: CityRecord) => {
    apply({ cityText: cityDisplayText(city, lang), city });
    setCitySuggestionsOpen(false);
  };
  const clearCity = () => {
    apply({ cityText: "", city: null });
    setCitySuggestionsOpen(false);
  };
  const citySuggestions: CityRecord[] =
    citySuggestionsOpen && state.city === null && state.cityText.trim() !== "" ? searchCities(state.cityText) : [];

  // --- Dates and times --------------------------------------------------------------------------------
  const changeRange = (checkInDate: CalendarDate, checkOutDate: CalendarDate) => {
    setState((current) => withDates(current, { checkInDate, checkOutDate }));
    setSubmitError(null);
    touch("dates");
  };
  const changeCheckInTime = (checkInTime: ClockTime | null) => {
    apply({ checkInTime });
    touch("times");
  };
  const changeCheckOutTime = (checkOutTime: ClockTime | null) => {
    apply({ checkOutTime });
    touch("times");
  };

  // --- Guests / parking / breakfast --------------------------------------------------------------------
  const stepGuests = (delta: number) =>
    apply({ guests: Math.min(HOTEL_GUESTS_MAX, Math.max(HOTEL_GUESTS_MIN, state.guests + delta)) });
  const changeParking = (parking: HotelParking) => apply({ parking });
  const changeBreakfast = (breakfast: HotelBreakfast) =>
    apply({ breakfast, breakfastDays: clampBreakfastDays(state.breakfastDays, nights) });
  const stepBreakfastDays = (delta: number) =>
    apply({ breakfastDays: clampBreakfastDays(state.breakfastDays + delta, nights) });

  // --- Cost (currency is picked in a bottom sheet, never typed or defaulted) -----------------------------
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const selectCurrency = (code: CurrencyCode | null) => {
    apply({ costCurrency: code ?? "" });
    touch("cost");
    setCurrencyOpen(false);
  };

  const maps = useMapsLink(state, apply);

  // --- Submit --------------------------------------------------------------------------------------------------
  const submit = async () => {
    if (inFlight.current) return;
    setAttempted(true);
    if (checkInInPast) return;
    const result = parseHotelForm(toHotelFormInput(state));
    if (!result.ok) return;
    inFlight.current = true;
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (target.mode === "create") await create.mutateAsync({ tripId: target.tripId, form: result.value });
      else await update.mutateAsync({ tripId: target.tripId, hotelId: target.hotelId, form: result.value });
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
    lang,
    isEdit: target.mode === "edit",
    state,
    errors,
    gone,
    nights,
    breakfastRange,
    submitting,
    submitError: submitError === null ? null : tTrips(`errors.${submitError}`),
    submit: () => void submit(),
    name: { change: (name: string) => apply({ name }), blur: () => touch("name") },
    city: { change: changeCity, select: selectCity, clear: clearCity, blur: () => touch("city"), suggestions: citySuggestions },
    address: { change: (address: string) => apply({ address }), blur: () => touch("address") },
    maps: { ...maps, blur: () => { touch("mapsUrl"); maps.commit(); } },
    dateFloor,
    changeRange,
    changeCheckInTime,
    changeCheckOutTime,
    stepGuests,
    changeParking,
    changeBreakfast,
    stepBreakfastDays,
    cost: {
      changeAmount: (text: string) => apply({ costAmount: filterMoneyInput(text) }),
      // A filled amount without a currency reports the missing currency once the user leaves the amount.
      blurAmount: () => {
        if (state.costAmount !== "") touch("cost");
      },
      currencyOpen,
      openCurrency: () => setCurrencyOpen(true),
      closeCurrency: () => setCurrencyOpen(false),
      selectCurrency,
    },
    bookingRef: { change: (bookingRef: string) => apply({ bookingRef }), blur: () => touch("bookingRef") },
    notes: { change: (notes: string) => apply({ notes }), blur: () => touch("notes") },
    guard,
    del,
  };
}

export type HotelFormController = ReturnType<typeof useHotelForm>;
