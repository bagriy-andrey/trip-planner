// Segment (flight) form fields, route-chain captions and warnings (SPEC-04).
// Durations/dates are never glued by hand: `formatDuration`/`formatStopoverDays`/
// `formatSegmentDateTime` in `lib/i18n/format.ts` compose these templates.
export const transport = {
  // S13 header title ("Route"); the "+" and "back" reuse `tripDetail`/`common` labels (same
  // actions as elsewhere), so only the title itself is new here.
  screen: {
    title: "Route",
  },
  field: {
    flightNumber: "Flight number",
    from: "From",
    to: "To",
    departureDate: "Departure date",
    departureTime: "Departure",
    arrivalDate: "Arrival date",
    arrivalTime: "Arrival",
    baggageIncluded: "Baggage included",
    passengers: "Passengers",
    seat: "Seat",
    ticketNumber: "Ticket number",
    seatMany: "Seats",
    ticketNumberMany: "Ticket numbers",
    flightNumberPlaceholder: "LO 1234",
  },
  caption: {
    arrivalOptional: "Optional, only needed to work out layovers",
    flightNumber: "Airline code and number, e.g. LO 1234",
    perPassenger: "One per passenger, comma-separated",
    airportFromDirectory: "Choose an airport from the list; you can search by code",
  },
  carrier: {
    // {{name}} = airline name resolved from the offline directory by flight number.
    fromDirectoryOffline: "{{name}} — from the directory, offline",
    unrecognized: "Airline not recognized",
  },
  duration: {
    // Fixed abbreviated units, not grammatically declined ("1 h 05 min", "45 min").
    hoursMinutes: "{{hours}} h {{minutes}} min",
    minutesOnly: "{{minutes}} min",
  },
  gap: {
    // {{duration}} = formatDuration() output, e.g. "1 h 05 min".
    layover: "Layover {{duration}}",
    risky: "risky",
    // {{city}} = pre-formatted city name.
    stopover_one: "{{count}} day in {{city}}",
    stopover_other: "{{count}} days in {{city}}",
  },
  warning: {
    layoverRisky: "Layover shorter than 1 h 30 min",
    airportMismatch: "Departure is not from the airport you landed at",
    segmentsOverlap: "Flights overlap in time",
    segmentOutsideTripDates: "Segment falls outside the trip dates",
  },
  route: {
    notClosedTitle: "Route not closed",
    notClosedText: "The last segment leaves you in {{city}}, not where the trip started.",
    // The S7 "Transport" block banner — one line, {{city}} = city of the open end of the route.
    notClosedBanner: "Route not closed — no flight from {{city}}",
  },
  segment: {
    notFound: "Segment not found",
    delete: "Delete flight",
  },
  // S7 "Transport" block summary row: "{{title}} · {{segments}}, {{layovers}}" composed in code
  // (i18next plural interpolation only drives ONE count per key, so the two counts are separate
  // pluralized fragments).
  summary: {
    title: "Whole route",
    segments_one: "{{count}} flight",
    segments_other: "{{count}} flights",
    layovers_one: "{{count}} layover",
    layovers_other: "{{count}} layovers",
  },
  // Decorative chain elements (line, filled/hollow nodes) are hidden from the a11y tree
  // (AC-91); these describe the elements that do carry semantics on their own.
  a11y: {
    chain: "Route chain",
    segmentNode: "Route point",
    gapNode: "Gap between flights",
    riskyGapNode: "Risky layover",
  },
  // S9/S9b (segment form) strings step 4 did not anticipate: the bottom "save and add next"
  // button, the unsaved-changes confirmation and the field-error texts keyed by the SHARED
  // `SEGMENT_FIELD_ERROR` ids (`{{group}}.{{key}}`, e.g. "from.required" -> validation.from.required)
  // so a form component can translate an id directly with no extra mapping table. Everything else
  // the form needs (labels, captions, carrier line, delete label, not-found title) already exists
  // above or in `common`/`bookingForm`/`trips` and is reused as-is.
  form: {
    clear: "Clear",
    save: "Save",
    saveAndNext: "Save and add next",
    deleteConfirmMessage: "The flight will be deleted and cannot be restored.",
    unsaved: {
      title: "Close without saving?",
      message: "Your changes will be lost.",
      discard: "Discard changes",
    },
    validation: {
      flightNumber: { format: "Check the flight number" },
      from: {
        required: "Choose a departure airport",
        notInDirectory: "Choose an airport from the list; you can search by code",
      },
      to: {
        required: "Choose an arrival airport",
        notInDirectory: "Choose an airport from the list; you can search by code",
        sameAsFrom: "Arrival airport is the same as departure",
      },
      departure: {
        dateRequired: "Choose a departure date",
        timeRequired: "Choose a departure time",
        inPast: "Departure can't be in the past",
        beforeTripStart: "Departure is before the trip starts",
      },
      arrival: {
        incomplete: "Choose both an arrival date and time",
        notAfterDeparture: "Arrival must be later than departure",
        tooLong: "A flight cannot last longer than 48 hours",
      },
      passengers: { range: "1 to 9 passengers" },
      seat: { tooLong: "Seats are at most 64 characters" },
      ticketNumber: { tooLong: "Ticket numbers are at most 160 characters" },
    },
  },
};
