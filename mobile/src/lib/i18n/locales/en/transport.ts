// Segment (flight) form fields, route-chain captions and warnings (SPEC-04).
// Durations/dates are never glued by hand: `formatDuration`/`formatStopoverDays`/
// `formatSegmentDateTime` in `lib/i18n/format.ts` compose these templates.
export const transport = {
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
  },
  caption: {
    arrivalOptional: "Optional, only needed to work out layovers",
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
    notClosedText: "The last segment leaves you in a different city from where the trip started.",
    // {{city}} = city of the open end of the route.
    addFlightFrom: "Add flight from {{city}}",
  },
  segment: {
    notFound: "Segment not found",
    delete: "Delete flight",
  },
  // Decorative chain elements (line, filled/hollow nodes) are hidden from the a11y tree
  // (AC-91); these describe the elements that do carry semantics on their own.
  a11y: {
    chain: "Route chain",
    segmentNode: "Route point",
    gapNode: "Gap between flights",
    riskyGapNode: "Risky layover",
  },
};
