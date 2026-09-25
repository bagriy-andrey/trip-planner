export const tripDetail = {
  a11y: {
    more: "Додаткові дії",
    addFlight: "Додати рейс",
    addHotel: "Додати готель",
    addCar: "Додати автомобіль",
  },
  sections: {
    flights: "Транспорт",
    hotel: "Готель",
    car: "Оренда авто",
  },
  flight: {
    // Spoken form of the "WAW [arrow] LIS" route.
    route: "{{from}} — {{to}}",
    baggageIncluded: "Багаж включено",
    noBaggage: "Без багажу",
    passengers_one: "{{count}} пасажир",
    passengers_few: "{{count}} пасажири",
    passengers_many: "{{count}} пасажирів",
    passengers_other: "{{count}} пасажира",
  },
  menu: {
    edit: "Змінити",
    archive: "Відправити в архів",
    unarchive: "Повернути з архіву",
    delete: "Видалити назавжди",
  },
  deleteConfirm: {
    title: "Видалити подорож назавжди?",
    // {{name}} = trip title or place.
    message: "Подорож «{{name}}» буде видалено без можливості відновлення.",
    confirm: "Видалити назавжди",
  },
  // Spoken result of a menu action (AC-71).
  announce: {
    archived: "Подорож відправлено в архів",
    unarchived: "Подорож повернуто з архіву",
    deleted: "Подорож видалено",
  },
  notFound: {
    title: "Подорож не знайдено",
    text: "Можливо, її видалили або посилання застаріло.",
    action: "До списку подорожей",
  },
  loadError: "Не вдалося завантажити подорож",
  // Captions of the empty module blocks (dashed frame + plus icon).
  empty: {
    flight: "Додати рейс",
    hotel: "Додати готель",
    car: "Додати автомобіль",
  },
};
