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
    flightNumber: "Номер рейса",
    from: "Откуда",
    to: "Куда",
    departureDate: "Дата вылета",
    departureTime: "Время вылета",
    duration: "Длительность полёта",
    baggageIncluded: "Багаж включён",
    passengers: "Пассажиры",
    seat: "Место",
    ticketNumber: "Номер билета",
    seatMany: "Места",
    ticketNumberMany: "Номера билетов",
    flightNumberPlaceholder: "LO 1234",
  },
  caption: {
    durationOptional: "Необязательно, нужно только для расчёта стыковок",
    flightNumber: "Код авиакомпании и номер, например LO 1234",
    perPassenger: "По одному на пассажира, через запятую",
    airportFromDirectory: "Выберите аэропорт из списка, можно искать по коду",
  },
  carrier: {
    // {{name}} = airline name resolved from the offline directory by flight number.
    fromDirectoryOffline: "{{name}} — из справочника, офлайн",
    unrecognized: "Авиакомпания не распознана",
  },
  duration: {
    // Fixed abbreviated units, not grammatically declined ("1 ч 05 мин", "45 мин").
    hoursMinutes: "{{hours}} ч {{minutes}} мин",
    minutesOnly: "{{minutes}} мин",
  },
  gap: {
    // {{duration}} = formatDuration() output, e.g. "1 ч 05 мин".
    layover: "Пересадка {{duration}}",
    risky: "рискованно",
    // {{city}} = pre-formatted city name (caller supplies the correct grammatical case).
    stopover_one: "{{count}} день в {{city}}",
    stopover_few: "{{count}} дня в {{city}}",
    stopover_many: "{{count}} дней в {{city}}",
    stopover_other: "{{count}} дня в {{city}}",
  },
  warning: {
    layoverRisky: "Стыковка короче 1 ч 30 мин",
    airportMismatch: "Вылет не из того аэропорта, куда прилетели",
    segmentsOverlap: "Рейсы пересекаются по времени",
    segmentOutsideTripDates: "Сегмент выходит за даты поездки",
  },
  route: {
    notClosedTitle: "Маршрут не замкнут",
    notClosedText: "Последний сегмент оставляет вас в городе {{city}}, а не там, где поездка началась.",
    // The S7 "Transport" block banner — one line, {{city}} = city of the open end of the route.
    notClosedBanner: "Маршрут не замкнут — нет рейса из {{city}}",
  },
  segment: {
    notFound: "Сегмент не найден",
    delete: "Удалить рейс",
  },
  // S7 "Transport" block summary row: "{{title}} · {{segments}}, {{layovers}}" composed in code
  // (i18next plural interpolation only drives ONE count per key, so the two counts are separate
  // pluralized fragments, same pattern as `common.nights_one/few/many/other`).
  summary: {
    title: "Весь маршрут",
    segments_one: "{{count}} рейс",
    segments_few: "{{count}} рейса",
    segments_many: "{{count}} рейсов",
    segments_other: "{{count}} рейса",
    layovers_one: "{{count}} пересадка",
    layovers_few: "{{count}} пересадки",
    layovers_many: "{{count}} пересадок",
    layovers_other: "{{count}} пересадки",
  },
  // Decorative chain elements (line, filled/hollow nodes) are hidden from the a11y tree
  // (AC-91); these describe the elements that do carry semantics on their own.
  a11y: {
    chain: "Цепочка маршрута",
    segmentNode: "Точка маршрута",
    gapNode: "Пауза между рейсами",
    riskyGapNode: "Рискованная пересадка",
  },
  // S9/S9b (segment form) strings step 4 did not anticipate: the bottom "save and add next"
  // button, the unsaved-changes confirmation and the field-error texts keyed by the SHARED
  // `SEGMENT_FIELD_ERROR` ids (`{{group}}.{{key}}`, e.g. "from.required" -> validation.from.required)
  // so a form component can translate an id directly with no extra mapping table. Everything else
  // the form needs (labels, captions, carrier line, delete label, not-found title) already exists
  // above or in `common`/`bookingForm`/`trips` and is reused as-is.
  form: {
    dateSheet: {
      title: "Дата вылета",
      prevMonth: "Предыдущий месяц",
      nextMonth: "Следующий месяц",
    },
    durationSheetTitle: "Длительность полёта (часы:минуты)",
    clear: "Очистить",
    save: "Сохранить",
    saveAndNext: "Сохранить и добавить следующий",
    deleteConfirmMessage: "Рейс будет удалён без возможности восстановления.",
    unsaved: {
      title: "Закрыть без сохранения?",
      message: "Изменения будут потеряны.",
      discard: "Не сохранять",
    },
    validation: {
      flightNumber: { format: "Проверьте номер рейса" },
      from: {
        required: "Укажите аэропорт вылета",
        notInDirectory: "Выберите аэропорт из списка, можно искать по коду",
      },
      to: {
        required: "Укажите аэропорт прилёта",
        notInDirectory: "Выберите аэропорт из списка, можно искать по коду",
        sameAsFrom: "Аэропорт прилёта совпадает с аэропортом вылета",
      },
      departure: {
        dateRequired: "Укажите дату вылета",
        timeRequired: "Укажите время вылета",
        inPast: "Вылет не может быть в прошлом",
        beforeTripStart: "Вылет раньше начала поездки",
      },
      arrival: {
        incomplete: "Укажите и дату, и время прилёта",
        notAfterDeparture: "Прилёт должен быть позже вылета",
        tooLong: "Рейс не может длиться дольше 48 часов",
      },
      passengers: { range: "От 1 до 9 пассажиров" },
      seat: { tooLong: "Мест не больше 64 символов" },
      ticketNumber: { tooLong: "Номеров билетов не больше 160 символов" },
    },
  },
};
