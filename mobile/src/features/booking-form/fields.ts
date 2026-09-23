// Field sets per booking form variant: data, not markup. The screen renders
// whatever is described here, so adding a field is a one-line change.
//
// The `flight` variant, `STATIC_PASSENGERS` and the toggle/stepper field kinds it alone used were
// removed in PLAN-04 step 11: real flight data now goes through `@/features/segment-form` (S9/S9b),
// which has its own working `BaggageToggle`/`PassengerStepper` components (AC-62, N-5).

export type BookingVariant = "car";

/** Keys of the `bookingForm` namespace used as field captions. */
export type BookingFieldLabelKey =
  | "car.company"
  | "car.pickup"
  | "car.dropoff"
  | "car.dates";

export type BookingFormTitleKey = "titles.car";

export type BookingField =
  /** Inert text field. `mono` marks ticket data (codes, dates, numbers) for the mono face (AC-38). */
  { kind: "text"; id: string; labelKey: BookingFieldLabelKey; mono: boolean };

export interface BookingFormSpec {
  titleKey: BookingFormTitleKey;
  fields: readonly BookingField[];
}

export const BOOKING_FORMS: Record<BookingVariant, BookingFormSpec> = {
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
