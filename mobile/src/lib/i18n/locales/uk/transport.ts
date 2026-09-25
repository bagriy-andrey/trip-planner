// Segment (flight) form fields, route-chain captions and warnings (SPEC-04).
// Durations/dates are never glued by hand: `formatDuration`/`formatStopoverDays`/
// `formatSegmentDateTime` in `lib/i18n/format.ts` compose these templates.
export const transport = {
  // S13 header title ("Маршрут"); the "+" and "back" reuse `tripDetail`/`common` labels (same
  // actions as elsewhere), so only the title itself is new here.
  screen: {
    title: "Маршрут",
  },
  field: {
    flightNumber: "Номер рейсу",
    from: "Звідки",
    to: "Куди",
    departureDate: "Дата вильоту",
    departureTime: "Час вильоту",
    duration: "Тривалість польоту",
    baggageIncluded: "Багаж включено",
    passengers: "Пасажири",
    seat: "Місце",
    ticketNumber: "Номер квитка",
    seatMany: "Місця",
    ticketNumberMany: "Номери квитків",
    flightNumberPlaceholder: "LO 1234",
  },
  caption: {
    durationOptional: "Необов’язково, потрібно лише для розрахунку пересадок",
    flightNumber: "Код авіакомпанії та номер, наприклад LO 1234",
    perPassenger: "По одному на пасажира, через кому",
    airportFromDirectory: "Оберіть аеропорт зі списку, можна шукати за кодом",
  },
  carrier: {
    // {{name}} = airline name resolved from the offline directory by flight number.
    fromDirectoryOffline: "{{name}} — з довідника, офлайн",
    unrecognized: "Авіакомпанію не розпізнано",
  },
  duration: {
    // Fixed abbreviated units, not grammatically declined ("1 год 05 хв", "45 хв").
    hoursMinutes: "{{hours}} год {{minutes}} хв",
    minutesOnly: "{{minutes}} хв",
  },
  gap: {
    // {{duration}} = formatDuration() output, e.g. "1 год 05 хв".
    layover: "Пересадка {{duration}}",
    risky: "ризиковано",
    // {{city}} = pre-formatted city name (caller supplies the correct grammatical case).
    stopover_one: "{{count}} день у {{city}}",
    stopover_few: "{{count}} дні у {{city}}",
    stopover_many: "{{count}} днів у {{city}}",
    stopover_other: "{{count}} дня у {{city}}",
  },
  warning: {
    layoverRisky: "Пересадка коротша за 1 год 30 хв",
    airportMismatch: "Виліт не з того аеропорту, куди прилетіли",
    segmentsOverlap: "Рейси перетинаються за часом",
    segmentOutsideTripDates: "Сегмент виходить за дати подорожі",
  },
  route: {
    notClosedTitle: "Маршрут не замкнений",
    notClosedText: "Останній сегмент залишає вас у місті {{city}}, а не там, де подорож почалася.",
    // The S7 "Transport" block banner — one line, {{city}} = city of the open end of the route.
    notClosedBanner: "Маршрут не замкнений — немає рейсу з {{city}}",
  },
  segment: {
    notFound: "Сегмент не знайдено",
    delete: "Видалити рейс",
  },
  // S7 "Transport" block summary row: "{{title}} · {{segments}}, {{layovers}}" composed in code
  // (i18next plural interpolation only drives ONE count per key, so the two counts are separate
  // pluralized fragments, same pattern as `common.nights_one/few/many/other`).
  summary: {
    title: "Весь маршрут",
    segments_one: "{{count}} рейс",
    segments_few: "{{count}} рейси",
    segments_many: "{{count}} рейсів",
    segments_other: "{{count}} рейсу",
    layovers_one: "{{count}} пересадка",
    layovers_few: "{{count}} пересадки",
    layovers_many: "{{count}} пересадок",
    layovers_other: "{{count}} пересадки",
  },
  // Decorative chain elements (line, filled/hollow nodes) are hidden from the a11y tree
  // (AC-91); these describe the elements that do carry semantics on their own.
  a11y: {
    chain: "Ланцюжок маршруту",
    segmentNode: "Точка маршруту",
    gapNode: "Пауза між рейсами",
    riskyGapNode: "Ризикована пересадка",
  },
  // S9/S9b (segment form) strings step 4 did not anticipate: the bottom "save and add next"
  // button, the unsaved-changes confirmation and the field-error texts keyed by the SHARED
  // `SEGMENT_FIELD_ERROR` ids (`{{group}}.{{key}}`, e.g. "from.required" -> validation.from.required)
  // so a form component can translate an id directly with no extra mapping table. Everything else
  // the form needs (labels, captions, carrier line, delete label, not-found title) already exists
  // above or in `common`/`bookingForm`/`trips` and is reused as-is.
  form: {
    dateSheet: {
      title: "Дата вильоту",
      prevMonth: "Попередній місяць",
      nextMonth: "Наступний місяць",
    },
    durationSheetTitle: "Тривалість польоту (години:хвилини)",
    clear: "Очистити",
    save: "Зберегти",
    saveAndNext: "Зберегти й додати наступний",
    deleteConfirmMessage: "Рейс буде видалено без можливості відновлення.",
    unsaved: {
      title: "Закрити без збереження?",
      message: "Зміни буде втрачено.",
      discard: "Не зберігати",
    },
    validation: {
      flightNumber: { format: "Перевірте номер рейсу" },
      from: {
        required: "Вкажіть аеропорт вильоту",
        notInDirectory: "Оберіть аеропорт зі списку, можна шукати за кодом",
      },
      to: {
        required: "Вкажіть аеропорт прильоту",
        notInDirectory: "Оберіть аеропорт зі списку, можна шукати за кодом",
        sameAsFrom: "Аеропорт прильоту збігається з аеропортом вильоту",
      },
      departure: {
        dateRequired: "Вкажіть дату вильоту",
        timeRequired: "Вкажіть час вильоту",
        inPast: "Виліт не може бути в минулому",
        beforeTripStart: "Виліт раніше за початок подорожі",
      },
      arrival: {
        incomplete: "Вкажіть і дату, і час прильоту",
        notAfterDeparture: "Приліт має бути пізніше за виліт",
        tooLong: "Рейс не може тривати довше за 48 годин",
      },
      passengers: { range: "Від 1 до 9 пасажирів" },
      seat: { tooLong: "Місць не більше 64 символів" },
      ticketNumber: { tooLong: "Номерів квитків не більше 160 символів" },
    },
  },
};
