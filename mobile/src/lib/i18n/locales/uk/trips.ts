export const trips = {
  title: "Подорожі",
  a11y: {
    newTrip: "Нова подорож",
  },
  newTrip: {
    title: "Нова подорож",
    city: "Місто",
    dates: "Дати",
    cityPlaceholder: "Куди їдемо?",
    datesPlaceholder: "Оберіть дати",
  },
  // Answers of the trips api (a closed set of kinds): the server's own text is never shown (AC-60).
  errors: {
    offline: "Немає з’єднання. Перевірте інтернет і спробуйте ще раз",
    timeout: "Сервер довго не відповідає. Спробуйте ще раз",
    denied: "Немає доступу до цієї подорожі",
    unknown: "Щось пішло не так. Спробуйте ще раз",
  },
  list: {
    emptyTitle: "Подорожей поки немає",
    emptyHint: "Додайте першу кнопкою «плюс» праворуч угорі",
    loadError: "Не вдалося завантажити подорожі",
    a11y: {
      loading: "Завантажуємо подорожі",
      // Spoken label of a trip card: {{title}}, {{status}}, {{dates}}.
      card: "{{title}}, {{status}}, {{dates}}",
    },
    // Spoken when the list settles (AC-71).
    announce: {
      loaded_one: "Подорожі завантажено: {{count}} подорож",
      loaded_few: "Подорожі завантажено: {{count}} подорожі",
      loaded_many: "Подорожі завантажено: {{count}} подорожей",
      loaded_other: "Подорожі завантажено: {{count}} подорожі",
      empty: "Подорожей поки немає",
      error: "Не вдалося завантажити подорожі",
    },
  },
  form: {
    createTitle: "Нова подорож",
    editTitle: "Змінити подорож",
    create: "Створити подорож",
    save: "Зберегти",
    a11y: {
      saving: "Зберігаємо подорож",
      clearDestination: "Очистити місце",
      startDate: "Дата початку: {{value}}",
      endDate: "Дата завершення: {{value}}",
      datesField: "Дати: {{value}}",
      prevMonth: "Попередній місяць",
      nextMonth: "Наступний місяць",
      // Spoken row of a place suggestion.
      suggestionCity: "{{name}}, місто, {{detail}}",
      suggestionCountry: "{{name}}, країна, {{detail}}",
    },
    destination: {
      label: "Куди",
      placeholder: "Місто або країна",
      noMatch: "Нічого не знайшли — залишимо як є, це теж підійде",
    },
    suggestion: {
      city: "Місто · {{detail}}",
      country: "Країна · {{detail}}",
    },
    // Keyed by the PLACE_REGIONS ids from @tripplanner/shared.
    regions: {
      europe: "Європа",
      asia: "Азія",
      "middle-east": "Близький Схід",
      africa: "Африка",
      "north-america": "Північна Америка",
      "south-america": "Південна Америка",
      oceania: "Океанія",
    },
    title: {
      label: "Назва подорожі",
      placeholder: "Необов’язково",
      hint: "Якщо залишити порожнім, підставиться місце",
    },
    dates: {
      label: "Дати",
      start: "Початок",
      end: "Завершення",
      choose: "Оберіть дати",
      pickStart: "Натисніть на перший день подорожі",
      pickEnd: "Тепер натисніть на останній день",
      noDates: "Поки без дат",
      noDatesHint: "Подорож збережеться як чернетка. Дати можна додати пізніше",
    },
    // Field errors of the shared trip form schema, keyed by the stable `TRIP_FIELD_ERROR` ids
    // ("destination.empty" -> validation.destination.empty).
    unsaved: {
      title: "Скасувати зміни?",
      message: "Введені дані буде втрачено.",
      discard: "Скасувати",
    },
    datesSheet: {
      title: "Дати подорожі",
    },
    validation: {
      destination: {
        empty: "Вкажіть, куди їдемо",
        tooLong: "Місце не довше 80 символів",
      },
      title: { tooLong: "Назва не довша 80 символів" },
      dates: {
        incomplete: "Вкажіть обидві дати або оберіть «Поки без дат»",
        endBeforeStart: "Дата завершення раніше за дату початку",
        tooLong: "Подорож не може бути довшою за 365 днів",
      },
    },
  },
};
