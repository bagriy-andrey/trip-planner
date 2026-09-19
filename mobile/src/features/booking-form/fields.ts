// Field sets per booking form variant: data, not markup. The screen renders
// whatever is described here, so adding a field is a one-line change.

export type BookingVariant = "flight" | "hotel" | "car";

/** Keys of the `bookingForm` namespace used as field captions. */
export type BookingFieldLabelKey =
  | "flight.from"
  | "flight.to"
  | "flight.departureDate"
  | "flight.time"
  | "flight.baggageIncluded"
  | "flight.passengers"
  | "flight.seat"
  | "flight.ticketNumber"
  | "hotel.name"
  | "hotel.city"
  | "hotel.checkIn"
  | "hotel.checkOut"
  | "hotel.breakfasts"
  | "car.company"
  | "car.pickup"
  | "car.dropoff"
  | "car.dates";

export type BookingFormTitleKey = "titles.flight" | "titles.hotel" | "titles.car";

export type BookingField =
  /** Inert text field. `mono` marks ticket data (codes, dates, numbers) for the mono face (AC-38). */
  | { kind: "text"; id: string; labelKey: BookingFieldLabelKey; mono: boolean }
  | { kind: "toggle"; id: string; labelKey: BookingFieldLabelKey }
  /** Passenger stepper. The skeleton shows a fixed value and never changes it (Q15). */
  | { kind: "stepper"; id: string; labelKey: BookingFieldLabelKey; value: number };

export interface BookingFormSpec {
  titleKey: BookingFormTitleKey;
  fields: readonly BookingField[];
}

/** Static passenger count shown in the flight form's stepper (decision Q15). */
export const STATIC_PASSENGERS = 2;

export const BOOKING_FORMS: Record<BookingVariant, BookingFormSpec> = {
  flight: {
    titleKey: "titles.flight",
    fields: [
      { kind: "text", id: "from", labelKey: "flight.from", mono: true },
      { kind: "text", id: "to", labelKey: "flight.to", mono: true },
      { kind: "text", id: "departureDate", labelKey: "flight.departureDate", mono: true },
      { kind: "text", id: "time", labelKey: "flight.time", mono: true },
      { kind: "toggle", id: "baggageIncluded", labelKey: "flight.baggageIncluded" },
      { kind: "stepper", id: "passengers", labelKey: "flight.passengers", value: STATIC_PASSENGERS },
      { kind: "text", id: "seat", labelKey: "flight.seat", mono: true },
      { kind: "text", id: "ticketNumber", labelKey: "flight.ticketNumber", mono: true },
    ],
  },
  hotel: {
    titleKey: "titles.hotel",
    fields: [
      { kind: "text", id: "name", labelKey: "hotel.name", mono: false },
      { kind: "text", id: "city", labelKey: "hotel.city", mono: false },
      { kind: "text", id: "checkIn", labelKey: "hotel.checkIn", mono: true },
      { kind: "text", id: "checkOut", labelKey: "hotel.checkOut", mono: true },
      { kind: "text", id: "breakfasts", labelKey: "hotel.breakfasts", mono: false },
    ],
  },
  car: {
    titleKey: "titles.car",
    fields: [
      { kind: "text", id: "company", labelKey: "car.company", mono: false },
      { kind: "text", id: "pickup", labelKey: "car.pickup", mono: false },
      { kind: "text", id: "dropoff", labelKey: "car.dropoff", mono: false },
      { kind: "text", id: "dates", labelKey: "car.dates", mono: true },
    ],
  },
};
