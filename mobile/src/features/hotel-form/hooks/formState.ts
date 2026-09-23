import { clampBreakfastDays, findCityById, instantToZonedParts, nightsBetweenDates } from "@tripplanner/shared";
import type {
  CalendarDate,
  CityRecord,
  ClockTime,
  Hotel,
  HotelBreakfast,
  HotelFormInput,
  HotelParking,
  PlaceLanguage,
  Trip,
} from "@tripplanner/shared";

/**
 * What the form holds while the user edits it. `cityText`/`city` split typed text from the resolved
 * directory pick (typing clears the pick); `mapsUrlText`/`mapsUrl` split the typed link from the one
 * `parseMapsUrl` accepted. The shared schema still judges everything again on save.
 */
export interface HotelFormState {
  name: string;
  cityText: string;
  city: CityRecord | null;
  address: string;
  mapsUrlText: string;
  mapsUrl: string | null;
  checkInDate: CalendarDate | null;
  checkInTime: ClockTime | null;
  checkOutDate: CalendarDate | null;
  checkOutTime: ClockTime | null;
  guests: number;
  parking: HotelParking;
  breakfast: HotelBreakfast;
  breakfastDays: number;
  costAmount: string;
  costCurrency: string;
  bookingRef: string;
  notes: string;
}

export const EMPTY_HOTEL_FORM: HotelFormState = {
  name: "",
  cityText: "",
  city: null,
  address: "",
  mapsUrlText: "",
  mapsUrl: null,
  checkInDate: null,
  checkInTime: null,
  checkOutDate: null,
  checkOutTime: null,
  guests: 1,
  parking: "none",
  breakfast: "none",
  breakfastDays: 1,
  costAmount: "",
  costCurrency: "",
  bookingRef: "",
  notes: "",
};

export function cityDisplayText(city: CityRecord, lang: PlaceLanguage): string {
  return city[lang];
}

/** Create-mode prefill (AC-10/AC-11): the trip's city (when from the directory) and dates; times stay empty. */
export function hotelFormFromTrip(trip: Trip, lang: PlaceLanguage): HotelFormState {
  const city = trip.place.kind === "city" ? findCityById(trip.place.placeId) : undefined;
  return {
    ...EMPTY_HOTEL_FORM,
    city: city ?? null,
    cityText: city === undefined ? "" : cityDisplayText(city, lang),
    checkInDate: trip.startDate,
    checkOutDate: trip.endDate,
  };
}

/** Edit-mode values, read in the HOTEL's zone, not the device's (AC-31). */
export function hotelFormFromHotel(hotel: Hotel, lang: PlaceLanguage): HotelFormState {
  const checkIn = instantToZonedParts(hotel.checkInAt, hotel.timeZone);
  const checkOut = instantToZonedParts(hotel.checkOutAt, hotel.timeZone);
  return {
    name: hotel.name,
    cityText: cityDisplayText(hotel.city, lang),
    city: hotel.city,
    address: hotel.address ?? "",
    mapsUrlText: hotel.mapsUrl ?? "",
    mapsUrl: hotel.mapsUrl,
    checkInDate: checkIn.date,
    checkInTime: checkIn.time,
    checkOutDate: checkOut.date,
    checkOutTime: checkOut.time,
    guests: hotel.guests,
    parking: hotel.parking,
    breakfast: hotel.breakfast,
    breakfastDays: hotel.breakfastDays ?? 1,
    costAmount: hotel.cost?.amount ?? "",
    costCurrency: hotel.cost?.currency ?? "",
    bookingRef: hotel.bookingRef ?? "",
    notes: hotel.notes ?? "",
  };
}

/** Nights between the two dates, or `null` while a date is missing. The count itself is `shared`'s. */
export function nightsOf(state: Pick<HotelFormState, "checkInDate" | "checkOutDate">): number | null {
  if (state.checkInDate === null || state.checkOutDate === null) return null;
  return nightsBetweenDates(state.checkInDate, state.checkOutDate);
}

/** Applies date changes and pulls "days with breakfast" back into the new range (AC-23). */
export function withDates(
  state: HotelFormState,
  dates: Partial<Pick<HotelFormState, "checkInDate" | "checkOutDate">>,
): HotelFormState {
  const next = { ...state, ...dates };
  return { ...next, breakfastDays: clampBreakfastDays(next.breakfastDays, nightsOf(next)) };
}

/** Pure equality (the "changed since open" flag); the city compares by id, not object identity. */
export function hotelFormEquals(a: HotelFormState, b: HotelFormState): boolean {
  return (
    a.name === b.name &&
    a.cityText === b.cityText &&
    (a.city?.id ?? null) === (b.city?.id ?? null) &&
    a.address === b.address &&
    a.mapsUrlText === b.mapsUrlText &&
    a.mapsUrl === b.mapsUrl &&
    a.checkInDate === b.checkInDate &&
    a.checkInTime === b.checkInTime &&
    a.checkOutDate === b.checkOutDate &&
    a.checkOutTime === b.checkOutTime &&
    a.guests === b.guests &&
    a.parking === b.parking &&
    a.breakfast === b.breakfast &&
    (a.breakfast === "partial" ? a.breakfastDays === b.breakfastDays : true) &&
    a.costAmount === b.costAmount &&
    a.costCurrency === b.costCurrency &&
    a.bookingRef === b.bookingRef &&
    a.notes === b.notes
  );
}

/** Input of `parseHotelForm`. The schema owns every rule, including the link check. */
export function toHotelFormInput(state: HotelFormState): HotelFormInput {
  return {
    name: state.name,
    cityPlaceId: state.city?.id ?? "",
    address: state.address,
    mapsUrl: state.mapsUrl ?? state.mapsUrlText,
    checkInDate: state.checkInDate,
    checkInTime: state.checkInTime,
    checkOutDate: state.checkOutDate,
    checkOutTime: state.checkOutTime,
    guests: state.guests,
    parking: state.parking,
    breakfast: state.breakfast,
    breakfastDays: state.breakfast === "partial" ? state.breakfastDays : null,
    costAmount: state.costAmount,
    costCurrency: state.costCurrency,
    bookingRef: state.bookingRef,
    notes: state.notes,
  };
}
