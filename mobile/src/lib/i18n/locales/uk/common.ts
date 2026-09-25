// Plural keys (`_one/_few/_many/_other`) follow the CLDR categories of the locale;
// i18next picks the right one from `count`.
export const common = {
  actions: {
    cancel: "Скасувати",
    done: "Готово",
    save: "Зберегти",
    back: "Назад",
    retry: "Повторити",
  },
  tabs: {
    trips: "Подорожі",
    history: "Історія",
    profile: "Профіль",
  },
  // Static "coming soon" mark shared by every stub (decision Q7).
  soon: "скоро",
  a11y: {
    soonHint: "Скоро буде доступно",
    openProfile: "Відкрити профіль",
    addItem: "Додати",
  },
  status: {
    completed: "завершено",
    today: "сьогодні",
    inDays_one: "через {{count}} день",
    inDays_few: "через {{count}} дні",
    inDays_many: "через {{count}} днів",
    inDays_other: "через {{count}} дня",
    draft: "план · дату не обрано",
    // Chip of a trip without dates (S4/S7); the caption under it is `dates.notChosen`.
    plan: "план",
    // Chip of an archived trip in History (AC-37); deliberately not "завершено".
    archived: "архів",
  },
  dates: {
    notChosen: "дату не обрано",
    // Range + nights of a trip header, composed by `formatTripDateLine` (never glued by hand, AC-74).
    line: "{{range}} · {{nights}}",
  },
  nights_one: "{{count}} ніч",
  nights_few: "{{count}} ночі",
  nights_many: "{{count}} ночей",
  nights_other: "{{count}} ночі",
};
