export const trips = {
  title: "Trips",
  a11y: {
    newTrip: "New trip",
  },
  cities: {
    lisbon: "Lisbon",
    barcelona: "Barcelona",
    vienna: "Vienna",
    tokyo: "Tokyo",
    rome: "Rome",
    prague: "Prague",
    amsterdam: "Amsterdam",
  },
  newTrip: {
    title: "New trip",
    city: "City",
    dates: "Dates",
    cityPlaceholder: "Where to?",
    datesPlaceholder: "Choose dates",
  },
  errors: {
    offline: "No connection. Check your internet and try again",
    timeout: "The server is taking too long. Try again",
    denied: "You don't have access to this trip",
    unknown: "Something went wrong. Try again",
  },
  list: {
    emptyTitle: "No trips yet",
    emptyHint: "Add your first one with the button at the bottom right",
    loadError: "Could not load your trips",
    a11y: {
      loading: "Loading trips",
      card: "{{title}}, {{status}}, {{dates}}",
    },
    announce: {
      loaded_one: "Trips loaded: {{count}} trip",
      loaded_other: "Trips loaded: {{count}} trips",
      empty: "No trips yet",
      error: "Could not load your trips",
    },
  },
  form: {
    createTitle: "New trip",
    editTitle: "Edit trip",
    create: "Create trip",
    save: "Save",
    a11y: {
      saving: "Saving the trip",
      clearDestination: "Clear place",
      startDate: "Start date: {{value}}",
      endDate: "End date: {{value}}",
      suggestionCity: "{{name}}, city, {{detail}}",
      suggestionCountry: "{{name}}, country, {{detail}}",
    },
    destination: {
      label: "Where to",
      placeholder: "City or country",
      noMatch: "Nothing found — we'll keep it as typed, that works too",
    },
    suggestion: {
      city: "City · {{detail}}",
      country: "Country · {{detail}}",
    },
    title: {
      label: "Trip name",
      placeholder: "Optional",
      hint: "Leave it empty to use the place",
    },
    dates: {
      label: "Dates",
      start: "Start",
      end: "End",
      noDates: "No dates yet",
      noDatesHint: "The trip is saved as a draft. You can add dates later",
    },
    validation: {
      destination: {
        empty: "Enter where you're going",
        tooLong: "The place can't be longer than 80 characters",
      },
      title: { tooLong: "The name can't be longer than 80 characters" },
      dates: {
        incomplete: "Set both dates or choose \"No dates yet\"",
        endBeforeStart: "The end date is before the start date",
        tooLong: "A trip can't be longer than 365 days",
      },
    },
  },
};
