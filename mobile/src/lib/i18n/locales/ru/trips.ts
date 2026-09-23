export const trips = {
  title: "Поездки",
  a11y: {
    newTrip: "Новая поездка",
  },
  newTrip: {
    title: "Новая поездка",
    city: "Город",
    dates: "Даты",
    cityPlaceholder: "Куда едем?",
    datesPlaceholder: "Выберите даты",
  },
  // Answers of the trips api (a closed set of kinds): the server's own text is never shown (AC-60).
  errors: {
    offline: "Нет соединения. Проверьте интернет и попробуйте ещё раз",
    timeout: "Сервер долго не отвечает. Попробуйте ещё раз",
    denied: "Нет доступа к этой поездке",
    unknown: "Что-то пошло не так. Попробуйте ещё раз",
  },
  list: {
    emptyTitle: "Поездок пока нет",
    emptyHint: "Добавьте первую кнопкой справа внизу",
    loadError: "Не удалось загрузить поездки",
    a11y: {
      loading: "Загружаем поездки",
      // Spoken label of a trip card: {{title}}, {{status}}, {{dates}}.
      card: "{{title}}, {{status}}, {{dates}}",
    },
    // Spoken when the list settles (AC-71).
    announce: {
      loaded_one: "Поездки загружены: {{count}} поездка",
      loaded_few: "Поездки загружены: {{count}} поездки",
      loaded_many: "Поездки загружены: {{count}} поездок",
      loaded_other: "Поездки загружены: {{count}} поездки",
      empty: "Поездок пока нет",
      error: "Не удалось загрузить поездки",
    },
  },
  form: {
    createTitle: "Новая поездка",
    editTitle: "Изменить поездку",
    create: "Создать поездку",
    save: "Сохранить",
    a11y: {
      saving: "Сохраняем поездку",
      clearDestination: "Очистить место",
      startDate: "Дата начала: {{value}}",
      endDate: "Дата конца: {{value}}",
      datesField: "Даты: {{value}}",
      prevMonth: "Предыдущий месяц",
      nextMonth: "Следующий месяц",
      // Spoken row of a place suggestion.
      suggestionCity: "{{name}}, город, {{detail}}",
      suggestionCountry: "{{name}}, страна, {{detail}}",
    },
    destination: {
      label: "Куда",
      placeholder: "Город или страна",
      noMatch: "Ничего не нашли — оставим как есть, это тоже подойдёт",
    },
    suggestion: {
      city: "Город · {{detail}}",
      country: "Страна · {{detail}}",
    },
    // Keyed by the PLACE_REGIONS ids from @tripplanner/shared.
    regions: {
      europe: "Европа",
      asia: "Азия",
      "middle-east": "Ближний Восток",
      africa: "Африка",
      "north-america": "Северная Америка",
      "south-america": "Южная Америка",
      oceania: "Океания",
    },
    title: {
      label: "Название поездки",
      placeholder: "Необязательно",
      hint: "Если оставить пустым, подставится место",
    },
    dates: {
      label: "Даты",
      start: "Начало",
      end: "Конец",
      choose: "Выберите даты",
      pickStart: "Нажмите на первый день поездки",
      pickEnd: "Теперь нажмите на последний день",
      noDates: "Пока без дат",
      noDatesHint: "Поездка сохранится как черновик. Даты можно добавить позже",
    },
    // Field errors of the shared trip form schema, keyed by the stable `TRIP_FIELD_ERROR` ids
    // ("destination.empty" -> validation.destination.empty).
    validation: {
      destination: {
        empty: "Укажите, куда едем",
        tooLong: "Место не длиннее 80 символов",
      },
      title: { tooLong: "Название не длиннее 80 символов" },
      dates: {
        incomplete: "Укажите обе даты или выберите «Пока без дат»",
        endBeforeStart: "Дата конца раньше даты начала",
        tooLong: "Поездка не может быть длиннее 365 дней",
      },
    },
  },
};
