export const tripDetail = {
  a11y: {
    more: "Дополнительные действия",
    addFlight: "Добавить рейс",
    addHotel: "Добавить отель",
    addCar: "Добавить автомобиль",
  },
  sections: {
    flights: "Рейс",
    hotel: "Отель",
    car: "Аренда авто",
  },
  flight: {
    // Spoken form of the "WAW [arrow] LIS" route.
    route: "{{from}} — {{to}}",
    baggageIncluded: "Багаж включён",
    noBaggage: "Без багажа",
    passengers_one: "{{count}} пассажир",
    passengers_few: "{{count}} пассажира",
    passengers_many: "{{count}} пассажиров",
    passengers_other: "{{count}} пассажира",
  },
  hotel: {
    checkIn: "Заезд",
    checkOut: "Выезд",
    // {{count}} = total days (genitive after "из"), {{included}} = days with breakfast.
    breakfast_one: "Завтрак: {{included}} из {{count}} дня",
    breakfast_few: "Завтрак: {{included}} из {{count}} дней",
    breakfast_many: "Завтрак: {{included}} из {{count}} дней",
    breakfast_other: "Завтрак: {{included}} из {{count}} дня",
  },
  car: {
    emptyTitle: "Автомобиль не добавлен",
    emptyText: "Добавьте аренду авто, чтобы держать бронь рядом с поездкой.",
    addAction: "Добавить автомобиль",
  },
  menu: {
    edit: "Изменить",
    archive: "Отправить в архив",
    unarchive: "Вернуть из архива",
    delete: "Удалить навсегда",
  },
  deleteConfirm: {
    title: "Удалить поездку навсегда?",
    // {{name}} = trip title or place.
    message: "Поездка «{{name}}» будет удалена без возможности восстановления.",
    confirm: "Удалить навсегда",
  },
  // Spoken result of a menu action (AC-71).
  announce: {
    archived: "Поездка отправлена в архив",
    unarchived: "Поездка возвращена из архива",
    deleted: "Поездка удалена",
  },
  notFound: {
    title: "Поездка не найдена",
    text: "Возможно, её удалили или ссылка устарела.",
    action: "К списку поездок",
  },
  loadError: "Не удалось загрузить поездку",
  // Captions of the empty module blocks (dashed frame + plus icon).
  empty: {
    flight: "Добавить рейс",
    hotel: "Добавить отель",
    car: "Добавить автомобиль",
  },
};
