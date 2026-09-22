// Plural keys (`_one/_few/_many/_other`) follow the CLDR categories of the locale;
// i18next picks the right one from `count`.
export const common = {
  actions: {
    cancel: "Отмена",
    done: "Готово",
    save: "Сохранить",
    back: "Назад",
    retry: "Повторить",
  },
  tabs: {
    trips: "Поездки",
    history: "История",
    profile: "Профиль",
  },
  // Static "coming soon" mark shared by every stub (decision Q7).
  soon: "скоро",
  a11y: {
    soonHint: "Скоро будет доступно",
    openProfile: "Открыть профиль",
    addItem: "Добавить",
  },
  status: {
    completed: "завершено",
    today: "сегодня",
    inDays_one: "через {{count}} день",
    inDays_few: "через {{count}} дня",
    inDays_many: "через {{count}} дней",
    inDays_other: "через {{count}} дня",
    draft: "план · дата не выбрана",
    // Chip of a trip without dates (S4/S7); the caption under it is `dates.notChosen`.
    plan: "план",
    // Chip of an archived trip in History (AC-37); deliberately not "завершено".
    archived: "архив",
  },
  dates: {
    notChosen: "дата не выбрана",
    // Range + nights of a trip header, composed by `formatTripDateLine` (never glued by hand, AC-74).
    line: "{{range}} · {{nights}}",
  },
  nights_one: "{{count}} ночь",
  nights_few: "{{count}} ночи",
  nights_many: "{{count}} ночей",
  nights_other: "{{count}} ночи",
};
