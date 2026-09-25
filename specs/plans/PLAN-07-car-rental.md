# Implementation Plan: Аренда авто — бронь проката в поездке (SPEC-07)

**Spec:** `specs/SPEC-07-car-rental.md` (Status: draft, 2026-09-25) — источник истины для WHAT.
Дизайн: `design/screens/add-car.md` (переписан вместе со спеком). Этот документ — только HOW: файлы,
модули, порядок, команды, критерии готовности.
**Status:** planning
**Scope:** `supabase/` (таблица `trip_cars`, RLS, pgTAP), `shared/` (модуль `cars`, общий модуль
текстовой нормализации форм, регенерированные типы БД), `mobile/` (фичи `cars`, `car-form`,
`car-view`; вынос общих с отелем примитивов в `components/`; `platform/clipboard`; namespace `car`
ru/en/uk; маршруты `cars/[carId]` и `cars/[carId]/view`; блок S7; демонтаж `booking-form`;
guardrails), `e2e/` (один поток, откладываемый), `design/screens/*`, статусы `*/AGENTS.md`, insights.
**Platforms:** ios+android. iOS-only поведения нет. **Новый нативный модуль `expo-clipboard`**
(решение владельца, Q2 спека) → **нужна новая сборка dev-клиента** (`npx expo run:ios` / EAS) до
ручной проверки «Копировать».
**Execution mode:** по умолчанию **single-agent, строго по порядку шагов**. Тир 1 (шаги 1, 2, 4, 5) и
тир 4 (шаги 7, 8) файл-непересекающиеся и могут идти параллельными implementer'ами — **решение
владельца, вопрос Q-A в §5**.
**Open questions спека Q1–Q6 приняты как решено/по умолчанию в спеке:** номер SPEC-07;
`expo-clipboard` в этой фиче; валюта без суммы и залога сохраняется без валюты; таймзона аренды не
хранится; «обратный рейс» = ближайший рейс после получения; маршруты по HANDOFF, тап по карточке → S17.

---

## 0. Что уже существует (проверено чтением репозитория 2026-09-25)

| Артефакт | Фактическое состояние | Вывод для плана |
|---|---|---|
| `supabase/migrations/` | 7 миграций; образец — `20260923195003_trip_hotels.sql` + `20260924100000_trip_hotels_date_time_split.sql` (владение через `trips`, 4 политики, `set_updated_at()`, `date`/`time`-колонки, кросс-проверка времени с короткими замыканиями) | Шаг 1 добавляет **восьмую** миграцию `trip_cars`; применённые не трогать |
| `supabase/tests/trip_hotels_{rls,constraints}.test.sql` | RLS-файл считает строки **только по своим фикстурам** (`where trip_id in (…)`), 27 тестов; constraints-файл сверяет число CHECK через `pg_constraint` | Копировать форму; счёт ограничений — по реальному DDL (`supabase/insights.md` 2026-09-23) |
| `shared/src/hotels/schemas.ts` | Приватные `codePointLength`, `singleLine`, `multiLine`, `trimmed`; стоимость по правилу SPEC-06 AC-39 (валюта без суммы → `cost: null`, не ошибка) | Текстовые хелперы **выносятся** в `shared/src/forms/text.ts` (шаг 2), отель импортирует их — не копия |
| `shared/src/hotels/mapsUrl.ts` | `parseMapsUrl` (ручной ASCII-разбор, белый список хостов) | Переиспользуется `cars/` как есть (AC-25) |
| `shared/src/money/` | `parseMoneyAmount` (каноническая строка `"1234.50"`), `MONEY_MAX_INTEGER_DIGITS`, `CURRENCIES`, `isCurrencyCode` | Переиспользуется (AC-27/28) |
| `shared/src/trips/dateRange.ts` | `pickRangeDate`, `monthGrid`, `shiftMonth` — логика диапазона УЖЕ общая | AC-17 закрыт переиспользованием; новой функции не писать |
| `shared/src/trips/calendarDate.ts` | `daysBetween`, `compareCalendarDates`, `isCalendarDate`, `addDays` | Лимит 365 суток — через `daysBetween`; отдельной `rentalDays` не заводить (N-4) |
| `shared/src/segments/time.ts` | `zonedDateTimeToInstant(date, "HH:MM", zone)` DST-безопасно, `isClockTime`, `ClockTime` | Основа `carReturnAfterFlight` (AC-37). `Segment` = `{ from: AirportRecord (есть timeZone), departureAt: Date, … }` |
| `shared/src/trips/__tests__/purity.test.ts` | Скан кириллицы/импортов/часов по каталогам | Шаг 2 добавляет `/src/cars/` и `/src/forms/text.ts` в скан |
| `mobile/src/features/hotels/` | Образец api (`hotelsApi.ts`: UUID-проверка без сети, `maybeSingle`, `mapTripError` из `@/features/trips`, лог только `operation`/`errorCode`), хуки (`hotelKeys`, `unwrapHotel` → throw `TripApiError`) | Фича `cars` копирует **приёмы** |
| `mobile/src/features/hotel-form/` | `MapsLinkField` + `useMapsLink`, `CostField` + `moneyInput.ts` (`filterMoneyInput`, force-re-render, `overlayValue`), `ConfirmOverlay`, `useLeaveGuard`, `submitError.ts`, `useHotelDelete` — всё приватно фиче; `HotelFormBody` монтирует `CurrencyPickerSheet` и `useTimeSheetPicker` на уровне тела | Спек требует выносить общее, а не копировать → шаг 5 переносит поле ссылки, денежное поле, кнопку валюты, `ConfirmOverlay`, `useLeaveGuard` в `components/` / `lib/`; hotel-form переключается на них без изменения поведения |
| `mobile/src/components/picker/CurrencyPickerSheet.tsx` | Общая шторка валюты (профиль + отель) | Переиспользуется как есть (AC-28) |
| `mobile/src/components/AnimatedSheetOverlay.tsx` | In-tree шторка с `Animated` + Reduce Motion, `handle` **декоративный, без жеста** | AC-16 требует «свайп вниз закрывает» → шаг 5 добавляет необязательный жест (N-7) |
| `mobile/src/components/SegmentedControl.tsx` | `value: T` (не nullable), снятия выбора нет; опция `minHeight: layout.minTouch` (44 ≥ 40) | Шаг 5: `value: T \| null` + `allowDeselect` (AC-10), обратно совместимо |
| `mobile/src/features/segment-form/components/BaggageToggle.tsx` | Кастомный переключатель 44×24 (`layout.switchW/H/Knob`, `role="switch"`) внутри segment-form; комментарий упоминает `booking-form` | Шаг 5 выносит трек в `components/ToggleSwitch.tsx`, BaggageToggle его использует; комментарий переписывается (AC-56) |
| `mobile/src/components/icons.ts` | Есть `pin`, `phone`, `calendar`, `chevron` (= chevron-right), `back`/`forward` (стрелки), `car` (Ionicons), `close`, `plus`, `warning`. **Нет** `copy`, `navigation`, `chevron-left`, `chevron-down` | Шаг 5 добавляет 4 имени + `Icon.test.tsx` (N-6) |
| `mobile/src/platform/timeSheetPicker.tsx` | `useTimeSheetPicker` — поведение SPEC-05 AC-65 (первый тап открывает, значение только по «Готово», `startTime`) | Используется для времён аренды (AC-20; N-2) |
| `mobile/src/lib/theme/metrics.ts` | `switchW/H/Knob`, `chainNode 8`, `chainLine`, `sheetHandleW/H`, `radius.sheet`, `textAreaMinHeight`, `iconTile`, `sectionAdd` есть; кружка дня 40 нет | Шаг 5 добавляет `layout.calendarDayCircle: 40` (tokens.md → metrics → `tokens.test.ts`) |
| `mobile/src/features/booking-form/` | Остался ОДИН вариант `car`; потребитель — только `app/trips/[tripId]/cars/new.tsx` | После шага 9 потребителей нет → шаг 10 удаляет модуль целиком (AC-56) |
| `mobile/src/lib/i18n/locales/{ru,en,uk}/bookingForm.ts` | `titles.flight`, `a11y.*Passengers` — ЖИВЫЕ (читает `SegmentFormScreen`); `titles.car`, `car.*` — только booking-form | Шаг 10 удаляет только `titles.car` и `car.*` |
| `mobile/src/lib/i18n/locales/{ru,en,uk}/tripDetail.ts` | `sections.car`, `a11y.addCar`, `empty.car` — живые; `car.{emptyTitle,emptyText,addAction}` — **без потребителей** (grep) | Мёртвые удаляет шаг 10 |
| `mobile/src/features/trip-detail/components/TripDetailContent.tsx` | Блок «Аренда авто» — всегда `EmptyBookingSection` + `hideAdd` | Шаг 9 ставит `CarBlock` (зеркально блоку «Отель») |
| `mobile/app/_layout.tsx` | `trips/[tripId]/cars/new` уже объявлен в `Stack.Protected` | Шаг 9 добавляет `cars/[carId]/index` (modal) и `cars/[carId]/view` (обычный push) |
| `mobile/__tests__/guardrails.test.ts` | Правила `backend-only-behind-the-boundary`, `no-credentials-in-logs` (только `operation`/`errorCode`), `no-maps-allowlist-outside-shared` (mobile-all), `no-platform-os-outside-platform`, `profiles-table-only-in-profile-api` и др. | Шаг 10 добавляет 3 узких правила (§1.10) |
| `expo-clipboard` | Нет в `mobile/package.json` | Шаг 5: `npx expo install expo-clipboard` + переаудит privacy manifest |
| `expo-router` 57.0.22 | `router.dismissTo` есть в сборке | Используется при удалении из S16b, открытой поверх S17 (AC-31) |

---

## 1. Разбивка по модулям

Направление зависимостей: **миграция → типы БД → схемы `shared/` → api `mobile/` → экраны**.
Доменная логика `shared/` (схема формы, телефон, предупреждение) от БД не зависит и идёт
параллельно с миграцией; строка/запись — после обоих.

### 1.1 `supabase/` — таблица `trip_cars` (шаг 1)

Файл: `supabase migration new trip_cars`.

```sql
create table public.trip_cars (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references public.trips (id) on delete cascade,
  source            text not null default 'manual',
  booking_ref       text not null,
  company           text,
  pickup_place      text not null,
  pickup_date       date not null,
  pickup_time       time not null,
  return_date       date not null,
  return_time       time not null,
  return_same_place boolean not null default true,
  return_place      text,
  maps_url          text,
  address           text,
  phone             text,
  car_class         text,
  insurance         text,
  fuel_policy       text,
  cost_amount       numeric(12,2),
  cost_currency     text,
  payment_status    text,
  extra_driver      boolean not null default false,
  deposit_amount    numeric(12,2),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint trip_cars_source            check (source in ('manual','imported_pending','imported_confirmed')),
  constraint trip_cars_ref_len           check (char_length(booking_ref) between 1 and 32
                                                and btrim(booking_ref, E' \t\r\n') <> ''),
  constraint trip_cars_company_len       check (company is null or (char_length(company) <= 120
                                                and btrim(company, E' \t\r\n') <> '')),
  constraint trip_cars_pickup_place_len  check (char_length(pickup_place) between 1 and 300
                                                and btrim(pickup_place, E' \t\r\n') <> ''),
  constraint trip_cars_return_place_len  check (return_place is null or (char_length(return_place) <= 300
                                                and btrim(return_place, E' \t\r\n') <> '')),
  constraint trip_cars_return_place_pair check ((return_place is null) = return_same_place),
  constraint trip_cars_rental_order      check (return_date >= pickup_date),
  constraint trip_cars_rental_max        check (return_date - pickup_date <= 365),
  constraint trip_cars_rental_times      check (return_date > pickup_date or return_time > pickup_time),
  constraint trip_cars_maps_url          check (maps_url is null
                                                or (char_length(maps_url) <= 2048
                                                    and maps_url ~ '^https://(www\.google\.com/maps|google\.com/maps|maps\.google\.com|maps\.app\.goo\.gl|goo\.gl/maps)([/?#]|$)')),
  constraint trip_cars_address_len       check (address is null or (char_length(address) <= 300
                                                and btrim(address, E' \t\r\n') <> '')),
  constraint trip_cars_phone_fmt         check (phone is null or (char_length(phone) <= 32
                                                and regexp_replace(phone, '[ ()-]', '', 'g') ~ '^\+?[0-9]{3,15}$')),
  constraint trip_cars_class_len         check (car_class is null or (char_length(car_class) <= 120
                                                and btrim(car_class, E' \t\r\n') <> '')),
  constraint trip_cars_insurance         check (insurance is null or insurance in ('none','excess','full')),
  constraint trip_cars_fuel_policy       check (fuel_policy is null or fuel_policy in ('full_full','full_empty','other')),
  constraint trip_cars_payment_status    check (payment_status is null or payment_status in ('paid','on_site')),
  constraint trip_cars_cost_amount       check (cost_amount is null or cost_amount >= 0),
  constraint trip_cars_deposit_amount    check (deposit_amount is null or deposit_amount >= 0),
  constraint trip_cars_currency_fmt      check (cost_currency is null or cost_currency ~ '^[A-Z]{3}$'),
  constraint trip_cars_currency_pair     check ((cost_currency is null) = (cost_amount is null and deposit_amount is null)),
  constraint trip_cars_notes_len         check (notes is null or (char_length(notes) <= 1000
                                                and btrim(notes, E' \t\r\n') <> ''))
);

create index trip_cars_trip_id_pickup_idx on public.trip_cars (trip_id, pickup_date, pickup_time);

create trigger trip_cars_set_updated_at
  before update on public.trip_cars
  for each row execute function public.set_updated_at();
```
Итого **21 CHECK**. Решения:
- Нет `user_id`, нет таймзоны (AC-13), нет числа суток — производные.
- Кросс-время в один день: `return_date > pickup_date or return_time > pickup_time` — оба времени
  `not null`, коротких замыканий по `null` не нужно (отличие от отеля).
- `phone`: хранится **как введён** (после trim/схлопывания пробелов в `shared`); формат проверяется
  после удаления пробелов/скобок/дефисов — тот же набор, что в `shared` (AC-26).
- Пара валюты: валюта ⇔ (стоимость ИЛИ залог) — AC-28 / инварианты спека. `numeric(12,2)` — как у отеля.
- Регэксп `maps_url` — копия отеля (защита в глубину, AC-25).

**RLS в той же миграции** — копия `trip_hotels`: `alter table … enable row level security;` + 4 политики
`trip_cars_{select,insert,update,delete}_own` `to authenticated` с
`exists (select 1 from public.trips t where t.id = trip_cars.trip_id and t.user_id = (select auth.uid()))`;
у `update` — и `using`, и `with check` (AC-2, AC-4).

**pgTAP:**

| Файл | Что доказывает |
|---|---|
| `supabase/tests/trip_cars_rls.test.sql` (~27) | RLS включён; `policies_are` ровно 4; владелец select/insert/update/delete (AC-2); чужой: 0 строк на select/update/delete (AC-3); insert с чужим/несуществующим `trip_id` и update-перенос в чужую поездку → `42501` (AC-4); `anon`: 0 строк на select/update/delete, `42501` на insert; каскад от удаления поездки и от `delete from auth.users` (AC-5). **Все подсчёты — только по своим фикстурам** |
| `supabase/tests/trip_cars_constraints.test.sql` (~30) | AC-6: по одной падающей вставке на **каждое** из 21 ограничений (пустой-после-trim номер с табом, 33 символа; `return_same_place=false` без места и `true` с местом; возврат раньше получения; 366 суток; одинаковые дата и время; `http://` и `google.com.evil.tld` в ссылке; телефон `+351 308 810 777 ext 2`, `12`, 16 цифр, 33 символа; `insurance='partial'`; отрицательный залог; валюта `eur`; валюта без суммы и залога; сумма без валюты; залог без валюты); **позитивные**: залог + валюта без стоимости проходит, `+351 (308) 810-777` проходит; число CHECK = 21 через `pg_constraint`; дефолты `source='manual'`, `return_same_place=true`, `extra_driver=false`; триггер `updated_at` (вставка со старым `updated_at` → update → `= now()`) |

**Типы:** `supabase gen types typescript --local > shared/src/db/database.types.ts` (AC-7).

### 1.2 `shared/` — доменная логика аренды (шаг 2)

```
shared/src/forms/text.ts              ВЫНОС из hotels/schemas.ts: codePointLength, singleLine, multiLine,
                                      trimmed (те же реализации, экспортируемые). hotels/schemas.ts
                                      импортирует их; поведение отеля не меняется
shared/src/forms/__tests__/text.test.ts  эмодзи = 1 code point; singleLine схлопывает \t\n; multiLine
                                      сохраняет \n и нормализует \r\n; пусто → null
shared/src/cars/errorCodes.ts         CAR_FIELD_ERROR + isCarFieldErrorId (таблица ниже — КОНТРАКТ с шагом 4)
shared/src/cars/phone.ts              CAR_PHONE_MAX_LENGTH = 32; parsePhone(input: unknown) →
                                      { ok: true; phone: string | null } | { ok: false; error: "phone.invalid" }:
                                      singleLine; пусто → { ok: true, phone: null }; > 32 code points или
                                      после удаления [ ()-] не ^\+?[0-9]{3,15}$ → ошибка; иначе phone =
                                      нормализованный ТЕКСТ (как введён). telHref(phone: unknown): string |
                                      null — повторная проверка + "tel:" + компактная форма (плюс
                                      сохраняется); невалидное → null (AC-26, AC-47)
shared/src/cars/schemas.ts            CarFormInput / CarFormValue / carFormSchema / parseCarForm; константы
                                      CAR_BOOKING_REF_MAX_LENGTH 32, CAR_COMPANY_MAX_LENGTH 120,
                                      CAR_PLACE_MAX_LENGTH 300, CAR_ADDRESS_MAX_LENGTH 300,
                                      CAR_CLASS_MAX_LENGTH 120, CAR_NOTES_MAX_LENGTH 1000,
                                      CAR_MAX_RENTAL_DAYS 365; CAR_INSURANCE = ["none","excess","full"],
                                      CAR_FUEL_POLICY = ["full_full","full_empty","other"],
                                      CAR_PAYMENT_STATUS = ["paid","on_site"] (as const, порядок = UI)
shared/src/cars/returnAfterFlight.ts  carReturnAfterFlight(rental, flights) → { departureAt: Date;
                                      timeZone: string } | null (алгоритм ниже)
shared/src/cars/__tests__/            phone.test.ts, form.test.ts, returnAfterFlight.test.ts
shared/src/trips/__tests__/purity.test.ts  + /src/cars/ и /src/forms/ в скан (кириллица, импорты, часы, Intl)
```

**`CAR_FIELD_ERROR` — зафиксированный список (id = путь i18n-ключа `car:form.validation.<id>`):**

| Ключ поля (`path`) | id |
|---|---|
| `bookingRef` | `bookingRef.required`, `bookingRef.tooLong` |
| `company` | `company.tooLong` |
| `pickupPlace` | `pickupPlace.required`, `pickupPlace.tooLong` |
| `dates` | `dates.required` (любая из двух дат пуста/невалидна), `dates.tooLong` (> 365 суток) |
| `pickupTime` / `returnTime` | `pickupTime.required`, `returnTime.required` |
| `return` (кросс) | `return.notAfterPickup` (дата возврата раньше получения, ИЛИ та же дата и `returnTime <= pickupTime`) |
| `returnPlace` | `returnPlace.required` (только при `returnSamePlace === false`), `returnPlace.tooLong` |
| `mapsUrl` | `mapsUrl.notGoogleMaps`, `mapsUrl.tooLong` |
| `address` | `address.tooLong` |
| `phone` | `phone.invalid` |
| `carClass` | `carClass.tooLong` |
| `insurance` / `fuelPolicy` / `paymentStatus` / `extraDriver` / `returnSamePlace` | `insurance.invalid`, `fuelPolicy.invalid`, `paymentStatus.invalid`, `extraDriver.invalid`, `returnSamePlace.invalid` (UI не порождает; защита от мусора) |
| `costAmount` | `cost.amountFormat` |
| `depositAmount` | `deposit.amountFormat` |
| `costCurrency` | `cost.currencyMissing`, `cost.currencyUnknown` |
| `notes` | `notes.tooLong` |

Мобильный id (не в `shared`, зависит от часов — `mobile/insights.md` 2026-09-24 (3)):
`pickup.inPast` → `car:form.validation.pickup.inPast`.

**Схема формы — правила** (скилл `zod`, `shared/insights.md`):
- Все ключи входа — `z.unknown().optional()`, вся проверка в ОДНОМ `.transform((raw, ctx) => …)` с
  явными `path` (zod 4 пропускает object-level `.check`).
- Вход: `bookingRef, company, pickupPlace, pickupDate, returnDate, pickupTime, returnTime,
  returnSamePlace, returnPlace, mapsUrl, address, phone, carClass, insurance, fuelPolicy, costAmount,
  costCurrency, paymentStatus, extraDriver, depositAmount, notes`.
- Выход `CarFormValue`: `{ bookingRef, company|null, pickupPlace, pickupDate: CalendarDate, returnDate,
  pickupTime: ClockTime, returnTime: ClockTime, returnSamePlace: boolean, returnPlace: string|null,
  mapsUrl|null, address|null, phone|null, carClass|null, insurance: CarInsurance|null,
  fuelPolicy|null, paymentStatus|null, money: { currency: CurrencyCode; cost: string|null;
  deposit: string|null } | null, extraDriver: boolean, notes|null }`. `source` в выходе нет.
- Нормализация: однострочные (`bookingRef`, `company`, `pickupPlace`, `carClass`, `phone`) —
  `singleLine`; многострочные (`returnPlace`, `address`, `notes`) — `multiLine`. Длины в code points;
  превышение — ошибка, не обрезка. Пусто у необязательного → `null` (AC-23).
- Пустая форма → ровно 5 ошибок: `bookingRef`, `pickupPlace`, `dates`, `pickupTime`, `returnTime` (AC-21).
- `returnSamePlace` отсутствует → `true`; `true` → `returnPlace: null` НЕЗАВИСИМО от входа (AC-24).
- Времена: `isClockTime`; пусто/мусор → `*.required` (оба обязательны, AC-20). Кросс-проверка
  `return.notAfterPickup` — только когда обе даты валидны; при равных датах — только когда оба времени
  валидны; сравнение строк `HH:MM` (AC-22). `daysBetween > 365` → `dates.tooLong`.
- Enum-поля: `null`/отсутствие → `null` (по умолчанию не выбрано, AC-10); неизвестное → `*.invalid`.
- Деньги (SPEC-06 AC-39 для записи): `cost`/`deposit` по `parseMoneyAmount`; ни стоимости, ни залога →
  `money: null` (валюта отбрасывается, ошибки нет — Q3); есть хотя бы одна сумма и валюта пуста →
  `cost.currencyMissing` на `costCurrency`; валюта не из `CURRENCIES` (после trim+upper) →
  `cost.currencyUnknown`. Валюта по умолчанию в `shared` не подставляется.
- Ссылка: пусто → `null`; иначе `parseMapsUrl` из `../hotels/mapsUrl`, ошибка на `mapsUrl`.
- Телефон: `parsePhone`, ошибка на `phone`.

**`carReturnAfterFlight` — алгоритм (AC-37):**
```
rental: { pickupDate, pickupTime, returnDate, returnTime }  (все валидны, иначе → null)
flights: readonly { from: { timeZone: string }; departureAt: Date }[]  (структурный тип; Segment подходит)
1. Для каждого рейса zone = from.timeZone; pickupAt = zonedDateTimeToInstant(pickupDate, pickupTime, zone).
2. Кандидаты — рейсы с departureAt > pickupAt; выбрать с МИНИМАЛЬНЫМ departureAt (ближайший).
3. Нет кандидата → null.
4. returnAt = zonedDateTimeToInstant(returnDate, returnTime, zone кандидата);
   returnAt > departureAt (строго) → { departureAt, timeZone: zone }; иначе null.
```
Тесты: пары зон разных знаков (`Europe/Warsaw` и `America/New_York`), переход DST в сутки возврата,
без рейсов, равные моменты (→ null), несколько рейсов (две аренды в разных городах: предупреждение
только у той, чей ближайший рейс раньше возврата), рейс раньше получения игнорируется, невалидный вход → null.
Никакого `Intl` напрямую — только через `segments/time.ts`; никаких часов.

### 1.3 `shared/` — строка БД и запись (шаг 3)

```
shared/src/cars/rows.ts        carRowSchema (z.object из unknown: все колонки; source enum; date-колонки
                               через isCalendarDate; time-колонки "HH:MM:SS" → slice(0,5) → isClockTime,
                               NOT NULL; numeric (number | string | null) → каноническая строка через
                               parseMoneyAmount, как hotels/rows.ts; .check: пара валюты ⇔ (cost или
                               deposit), валюта из CURRENCIES, return_place ⇔ !return_same_place);
                               Car = CarFormValue & { id, tripId, source }; toCar; carFromRowSchema;
                               CarWrite (snake_case, source: "manual" литералом — AC-33);
                               toCarWrite(value, tripId): суммы → Number(amount), money null → все
                               три колонки null
shared/src/cars/index.ts       публичная поверхность cars (шаг 2 + rows)
shared/src/index.ts            + export * from "./cars"
shared/src/cars/__tests__/row.test.ts  goodRow: Tables<"trip_cars">; повреждённые строки (время "25:00",
                               insurance "partial", валюта без сумм, "XXX", return_place при same=true);
                               numeric строкой "383.3" → "383.30"; round-trip toCarWrite → строка → toCar;
                               CarWrite присваиваем TablesInsert<"trip_cars"> (типовой тест); source "manual"
```

### 1.4 `mobile/src/lib/i18n` — namespace `car` ru/en/uk (шаг 4)

Урок PLAN-04/05 (корневой `insights.md` 2026-09-23): шаг, создающий namespace, владеет **всеми**
строками фичи. Дерево ниже — контракт шагов 6–9; последующие шаги ключи не добавляют (нехватка =
дефект плана: в single-agent дописать во все три локали и отметить в отчёте; в multi-agent —
остановиться и сообщить).

```
car.form.title                          «Аренда авто»
car.form.save                           «Сохранить»
car.form.groups.{pickupReturn, office, carTerms, payment, more, moreCaption}
                                        «Получение и возврат» / «Офис» / «Машина и условия» / «Оплата» /
                                        «Ещё» / «Доп. водитель, залог, заметки»
car.form.field.{bookingRef, company, companyPlaceholder, pickupPlace, dates, datesPlaceholder,
  pickupTime, returnTime, returnSamePlace, returnPlace, mapsUrl, mapsUrlPlaceholder, address, phone,
  carClass, carClassPlaceholder, insurance, fuel, cost, costAmountPlaceholder, currency,
  currencyRequired, currencyPlaceholder, paymentStatus, extraDriver, deposit, depositWithCurrency, notes}
                                        companyPlaceholder «Необязательно»; depositWithCurrency
                                        «Залог на карте · {{currency}}»; currencyPlaceholder «EUR»
car.form.insurance.{none, excess, full}      «Нет / С франшизой / Без франшизы»
car.form.fuel.{full_full, full_empty, other} «Бак в бак / Сдать пустым / Другое»
car.form.payment.{paid, on_site}             «Оплачено / Оплата на месте»
car.form.mapsLink.{added, source, open, remove, openFailed}
car.form.datesSheet.{title, pickStart, pickEnd, done, close, prevMonth, nextMonth}
                                        «Даты аренды» / «Выберите день получения» / «Теперь день
                                        возврата» / «Готово» / a11y подложки / a11y стрелок
car.form.warning.returnAfterFlight      «Вернуть авто нужно до вылета рейса {{time}}»
car.form.a11y.{timeClose, currencyField, currencyEmpty, insuranceGroup, fuelGroup, paymentGroup,
  moreToggle, datesField}
car.form.unsaved.{title, message, discard}
car.form.delete.{link, title, message, confirm}   «Удалить аренду» …; message с {{name}}
car.form.validation.<каждый id из CAR_FIELD_ERROR> + pickup.inPast  — 1:1 с id
car.dates.month.{1…12}                  короткие месяцы (ru: янв фев мар апр мая июн июл авг сент окт
                                        нояб дек — add-car.md; uk/en — свои)
car.dates.weekday.{0…6}                 «Вс»…«Сб» (0 = воскресенье, как getUTCDay)
car.dates.dayMonth                      «{{day}} {{month}}» (en: «{{month}} {{day}}»)
car.dates.range.{sameMonth, sameYear, crossYear}
                                        «{{d1}} – {{d2}} {{m}} {{y}}» / «{{d1}} {{m1}} – {{d2}} {{m2}} {{y}}» /
                                        «{{d1}} {{m1}} {{y1}} – {{d2}} {{m2}} {{y2}}» (en — свой порядок)
car.dates.cardMoment                    «{{date}}, {{time}}»        (S7: «19 авг, 11:00»)
car.dates.viewMoment                    «{{weekday}}, {{date}} · {{time}}» (S17: «Ср, 19 авг · 11:00»)
car.card.{untitled, pickup, return, samePlace, bookingRef, a11y}
                                        «Аренда авто» / «Получение» / «Возврат» / «Там же» / «Бронь» /
                                        a11y «{{company}}, получение {{pickup}}, возврат {{return}}»
car.view.{title, edit, bookingRef, copy, copied, copyFailed, pickup, return, samePlace, office,
  route, call, openFailed, callFailed, terms, insurance, fuel, payment, extraDriver, deposit, notes,
  yes, no, back}
car.view.insuranceValue.{none, excess, full}  «Нет» / «С франшизой» / «Полная, без франшизы»
car.view.paymentStatus.{paid, on_site}        «оплачено» / «оплата на месте»
car.view.paymentLine                    «{{amount}} {{currency}} · {{status}}»
car.notFound.{title, text, action}      «Аренда не найдена» …
```
Ошибки загрузки/сохранения — существующие `trips:errors.*`; «Отмена»/«Готово»/«Назад»/«Повторить» —
`common:actions.*`; дубликатов не заводить. Файлы: `locales/{ru,en,uk}/car.ts` (новые),
`locales/{ru,en,uk}/index.ts` (+ регистрация). Тест `mobile/src/lib/i18n/__tests__/carKeys.test.ts`
(по образцу `hotelKeys.test.ts`): каждый id `CAR_FIELD_ERROR` + `pickup.inPast`, 12 месяцев и 7 дней
недели — непустая строка в трёх локалях. Шаг 4 зависит от шага 2 **только** для этого теста; если
тиры идут параллельно — тест собирается после мерджа шага 2 (в single-agent порядок это покрывает).

### 1.5 `mobile/` — общие примитивы, вынос из hotel-form, буфер обмена (шаг 5)

```
src/components/form/MapsLinkField.tsx  ПЕРЕНОС hotel-form/components/MapsLinkField.tsx; все строки —
                                    пропсом `labels: { field, placeholder, added, source, open, remove,
                                    openFailed }` (уже переведённые) — компонент без namespace фичи
src/components/form/useMapsLink.ts  ПЕРЕНОС hotel-form/hooks/useMapsLink.ts; тип состояния обобщён до
                                    { mapsUrl: string | null; mapsUrlText: string }
src/components/form/MoneyField.tsx  ВЫДЕЛЕНИЕ из CostField: поле суммы (filterMoneyInput + force-re-render
                                    + overlayValue, mobile/insights.md 2026-09-24 (3)/(4)); проп `mono`
                                    (отель — true, аренда — false, AC-12; Q-B)
src/components/form/CurrencyButton.tsx  ВЫДЕЛЕНИЕ из CostField: кнопка валюты (моно-код, плейсхолдер,
                                    required-подпись, рамка danger); строки — пропсами
src/components/form/moneyInput.ts   ПЕРЕНОС hotel-form/hooks/moneyInput.ts (+ тест)
src/components/form/index.ts        поверхность
src/components/ConfirmOverlay.tsx   ПЕРЕНОС hotel-form/components/ConfirmOverlay.tsx (паттерн SheetOverlay,
                                    второй потребитель — car-form/car-view)
src/components/ToggleSwitch.tsx     трек 44×24 из BaggageToggle: { label, value, onChange, testID },
                                    role="switch" + checked, зона ≥44
src/components/SegmentedControl.tsx value: T | null; allowDeselect?: boolean (тап по выбранному → onChange(null));
                                    без пропа — прежнее поведение
src/components/AnimatedSheetOverlay.tsx  + swipeToClose?: boolean — PanResponder на панели: вертикальный
                                    сдвиг вниз > порога → onRequestClose (порог — из токена/доли высоты
                                    панели, не магическое число); без пропа — прежнее поведение
src/components/icons.ts             + copy (feather "copy"), navigation ("navigation"), chevronLeft
                                    ("chevron-left"), chevronDown ("chevron-down")
src/components/index.ts             + экспорты (form/*, ConfirmOverlay, ToggleSwitch)
src/lib/forms/useLeaveGuard.ts      ПЕРЕНОС hotel-form/hooks/useLeaveGuard.ts (зависит только от expo-router)
src/lib/forms/index.ts
src/platform/clipboard.ts           copyText(text: string): Promise<boolean> — `expo-clipboard`
                                    setStringAsync, модуль грузится ЛЕНИВО внутри try (dev-клиент без
                                    модуля → false, а не падение экрана); текст не логируется
src/platform/__tests__/clipboard.test.ts  jest.mock("expo-clipboard"): успех → true; reject → false
features/hotel-form/**              переключить на общие компоненты: CostField = MoneyField(mono) +
                                    CurrencyButton; MapsLinkField/useMapsLink/ConfirmOverlay/useLeaveGuard/
                                    moneyInput — из components/lib; локальные файлы удалить; hotel-строки
                                    передаются пропсами. ПОВЕДЕНИЕ И testID не меняются
features/segment-form/components/BaggageToggle.tsx  использовать ToggleSwitch; комментарий о booking-form убрать
design/tokens.md, lib/theme/metrics.ts, lib/theme/__tests__/tokens.test.ts  + layout.calendarDayCircle: 40
package.json / pnpm-lock.yaml       npx expo install expo-clipboard
app.privacy.ts                      комментарий «Re-audit (SPEC-07): expo-clipboard …» (объединение
                                    причин меняется ТОЛЬКО если установленная версия декларирует
                                    required-reason API — проверить PrivacyInfo.xcprivacy)
docs/release/privacy-manifest-audit.md  строка переаудита
```

### 1.6 `mobile/src/features/cars` — данные, форматирование, блок S7 (шаг 6)

```
api/carsApi.ts          ЕДИНСТВЕННЫЙ модуль, обращающийся к trip_cars. listCars(tripId) —
                        .order("pickup_date").order("pickup_time").order("id"); getCar(tripId, carId) —
                        оба id проверяются как UUID ДО запроса (не UUID → notFound без сети, AC-32),
                        .eq("id").eq("trip_id").maybeSingle(); createCar / updateCar / deleteCar (ноль
                        строк → notFound). Явный список колонок. carFromRowSchema на каждую строку; не
                        разобралась → "unknown". Лог: console.warn("[cars]", operation, "failed", errorCode)
api/index.ts            + unwrapCar → throw TripApiError; mapTripError/TripApiError из @/features/trips
hooks/queryKeys.ts      carKeys = { all, ofTrip(tripId), one(tripId, id) }
hooks/useCarsQuery.ts   useCarsQuery(tripId); queryFn бросает (AC-49)
hooks/useCarQuery.ts    useCarQuery(tripId, carId); initialData — запись из кэша carKeys.ofTrip (если
                        список уже загружался) + initialDataUpdatedAt из состояния списка — S17 без сети
                        показывает кэш сессии (AC-49a); ошибка фоновой перезагрузки при наличии данных
                        экрану не мешает
hooks/useCarMutations.ts  useCreateCar / useUpdateCar / useDeleteCar; без оптимизма; инвалидируют
                        carKeys.ofTrip (+ one явно); сессия не signedIn → TripApiError("denied")
format.ts               чистые форматтеры поверх `t` namespace car и Intl (НЕ календарная арифметика):
                        formatRentalRange(t, start, end) (3 формата AC-15), formatRentalDay(t, date)
                        («19 авг»), formatCardMoment(t, locale, date, time) («19 авг, 11:00»),
                        formatViewMoment(t, locale, date, time) («Ср, 19 авг · 11:00», день недели —
                        new Date(Date.UTC(y, m-1, d)).getUTCDay()), formatMoneyAmount(locale, amount)
                        (Intl.NumberFormat, 2 знака; только отображение)
types.ts                toCarCardData(car, t, locale) → { id, title, pickupText, pickupPlace, returnText,
                        returnPlaceText («Там же» при returnSamePlace), bookingRef, a11yLabel }
components/CarCard.tsx  стекло (GlassSurface: surface + blur + рамка), radius.card, padding 16, gap 12;
                        заголовок Bold 15 + Icon chevron 16 textTertiary; сетка 2 колонки (caption +
                        моно 13 + место caption); divider; «Бронь» + моно 13. Одна Pressable
                        role="button", ≥44. Адреса/телефона/страховки/оплаты/заметок НЕТ (AC-42)
components/CarBlock.tsx список CarCard (порядок = порядок api), onCarPress(id)
components/CarNotFound.tsx  одно состояние «Аренда не найдена» + «Назад» (общее для S16b и S17, AC-32)
index.ts                публичная поверхность: CarBlock, CarCard, CarNotFound, carKeys, хуки, format-функции,
                        toCarCardData. api и unwrapCar наружу не экспортируются
__tests__/ + api/__tests__/ + hooks/__tests__/  по образцу hotels
```

### 1.7 `mobile/src/features/car-form` — S16 / S16b (шаг 7)

Экран режется заранее (≤150 строк на компонент; `useHotelForm` на 246 строк — не образец размера).

```
CarFormScreen.tsx             CarFormScreen({ tripId, carId? }) → CreateCarLoader (useTripQuery +
                              useHomeDefaults) | EditCarLoader (useCarQuery); загрузка / ошибка /
                              CarNotFound (из @/features/cars)
components/CarFormBody.tsx    ModalHeader (cancelAsIcon, hideDone, title car:form.title, AC-8) + Screen
                              (DismissKeyboardView, AC-36) + нижняя панель «Сохранить» (PrimaryButton,
                              пилюля 52) + оверлеи уровня тела: CurrencyPickerSheet, timePicker.element,
                              RentalDatesSheet, ConfirmOverlay ×2 (шторки absoluteFill → НЕ внутри ScrollView,
                              mobile/insights.md 2026-09-24); фон под оверлеем no-hide-descendants
components/CarFormFields.tsx  только порядок полей AC-9 и заголовки групп h2; логики нет
components/PickupReturnGroup.tsx  место получения; поле «Даты» (моно, Icon calendar справа, плейсхолдер,
                              ошибки dates.*); ряд 1fr/1fr «Время получения»/«Время возврата» (кнопки,
                              открывают useTimeSheetPicker со startTime "11:00", моно, без «×», AC-20;
                              TimePick onPick мостится через isClockTime); ошибка return.notAfterPickup под
                              «Время возврата»; плашка предупреждения; ToggleSwitch «Возврат там же»;
                              «Место возврата» (TextField multiline, только при выключенном)
components/ReturnAfterFlightBanner.tsx  warnBg/warnBorder, Icon warning, текст car:form.warning.* с временем
                              вылета formatSegmentDateTime(locale, departureAt, timeZone) (импорт из
                              @/lib/i18n/format — не из barrel'а, mobile/insights.md 2026-09-22)
components/OfficeGroup.tsx    MapsLinkField (components/form, строки car:form.mapsLink.*) + адрес
                              (multiline) + телефон (TextField keyboardType phone-pad / textContentType
                              telephoneNumber, НЕ моно)
components/CarTermsGroup.tsx  «Модель или класс» + SegmentedControl страховки и топлива (allowDeselect)
components/PaymentGroup.tsx   ряд 1fr/112: MoneyField(mono=false) + CurrencyButton; SegmentedControl оплаты
components/MoreSection.tsx    строка-кнопка «Ещё» (h2 + caption + Icon chevronDown с поворотом 180°,
                              accessibilityState.expanded); ToggleSwitch «Доп. водитель»; MoneyField залога
                              (подпись depositWithCurrency при выбранной валюте); заметки multiline (AC-14)
components/RentalDatesSheet.tsx  AnimatedSheetOverlay (handle, swipeToClose) + заголовок + подсказка
                              (pickStart → pickEnd → formatRentalRange) + RentalCalendar + «Готово»
                              (PrimaryButton, disabled пока нет обеих дат); pending-диапазон — локальное
                              состояние шторки; тап подложки/свайп — закрыть без изменений (AC-16…AC-18)
components/RentalCalendar.tsx сетка monthGrid(ym, 1) (ПОНЕДЕЛЬНИК, AC-16), стрелки IconButton 44 (chevronLeft /
                              chevron), заголовок «Август 2026» Bold 15 (Intl month long + year, UTC),
                              дни недели 12 textTertiary, ячейка minTouch, кружок layout.calendarDayCircle,
                              моно 13; начало/конец accent/onAccent, между — полоса surfaceStrong со
                              скруглением minTouch/2 на краях; дни < floor disabled и приглушены; месяц
                              целиком раньше floor недостижим (AC-19). Тапы → pickRangeDate (shared)
components/CarFormStates.tsx  Loading / LoadError(+Повторить)
hooks/formState.ts            CarFormState (строки/выборы: bookingRef, company, pickupPlace, pickupDate,
                              returnDate, pickupTime, returnTime, returnSamePlace, returnPlace, mapsUrlText,
                              mapsUrl, address, phone, carClass, insurance, fuelPolicy, costAmount,
                              costCurrency, paymentStatus, extraDriver, depositAmount, notes); EMPTY_CAR_FORM;
                              carFormFromTrip(trip, today, homeCurrency) (даты: начало = max(start, today),
                              закончившаяся поездка → пусто, как hotelFormFromTrip; времена null;
                              returnSamePlace true; валюта = homeCurrency ?? ""); carFormFromCar(car);
                              moreInitiallyOpen(state) (extraDriver || залог || заметки, AC-14);
                              carDateFloor(mode, today, storedPickup) = min(today, stored) в правке (AC-19);
                              carFormEquals; toCarFormInput(state) (returnPlace передаётся всегда — схема сама
                              обнуляет при same=true, AC-24). Чистые функции
hooks/useCarForm.ts           состояние + touched-группы (ошибки после ухода из поля или первой попытки,
                              AC-21); ошибки — из parseCarForm; pickup.inPast (mobile) блокирует submit;
                              submit: inFlight-ref (дубля нет, AC-34), create/update, успех → guard.leave()
                              (router.back: S16 → S7, S16b → S17, AC-29/30); notFound → CarNotFound;
                              остальное → trips:errors.<kind> в форме; сегмент — повторный тап снимает
                              выбор; валюта — CurrencyPickerSheet; ссылка — useMapsLink; ≤ ~150 строк —
                              вспомогательное в useCarDelete / useFlightWarning
hooks/useCarDelete.ts         подтверждение → deleteCar → router.dismissTo({ pathname: "/trips/[tripId]",
                              params: { tripId } }) — S17 этой аренды уходит из стека (AC-31); notFound →
                              состояние «Аренда не найдена»
hooks/useFlightWarning.ts     сегменты — ТОЛЬКО из кэша: useQueryClient().getQueryData(segmentKeys.ofTrip(tripId))
                              (S7 всегда под формой и уже загрузил их); нет данных → нет плашки, запросов
                              нет (AC-38); результат carReturnAfterFlight(state, segments) через useMemo
hooks/submitError.ts          классификация TripApiError (14 строк, как у отеля; мелкий дубль допустим — не
                              входит в перечень общего AC-25/27/28)
index.ts                      export { CarFormScreen } + тип пропсов
__tests__/                    formState.test.ts; CarFormScreen.{create,edit,fields,rules,sheet}.test.tsx
```

### 1.8 `mobile/src/features/car-view` — S17 (шаг 8)

```
CarViewScreen.tsx             CarViewScreen({ tripId, carId }) → useCarQuery; есть данные → CarViewBody
                              (даже если фоновая перезагрузка упала, AC-49a); notFound → CarNotFound; ошибка
                              без данных → ошибка загрузки + «Повторить»; загрузка
components/CarViewHeader.tsx  «назад» IconButton 44 (chevronLeft), заголовок по центру, «Изменить» (Bold 15
                              accent, ≥44) → router.push({ pathname: "/trips/[tripId]/cars/[carId]",
                              params: { tripId, carId } }) (AC-43)
components/MainCard.tsx       GlassSurface strengthen: компания ExtraBold 19 / «Аренда авто»; класс 13
                              textSecondary; «Номер брони» + моно 19; пилюля «Копировать» (Icon copy 16, ≥44)
components/ChainCard.tsx      узел chainNode accent залит / контурный, линия chainLine; viewMoment моно 15;
                              место 13; «Там же»
components/OfficeCard.tsx     адрес 15; пилюли 44 «Маршрут» (accent, Icon navigation) и «Позвонить» (surface +
                              рамка, Icon phone); скрытие по AC-47; ошибка открытия — текст на экране
components/TermsCard.tsx      сетка подпись/значение (caption / Bold 13): Страховка, Топливо, Оплата
                              (paymentLine / только статус / только сумма), Доп. водитель (Есть/Нет),
                              Залог (если задан); пустые строки не рисуются (AC-44, AC-48)
components/NotesCard.tsx      если заметки есть
hooks/useCopyBookingRef.ts    copyText (platform/clipboard) → true: «Скопировано» на COPIED_FEEDBACK_MS,
                              затем назад; false: подпись не меняется, ошибка copyFailed на экране (AC-45);
                              таймер чистится при размонтировании
hooks/useOfficeActions.ts     openRoute: parseMapsUrl(car.mapsUrl) → Linking.openURL в try/catch (AC-46);
                              call: telHref(car.phone) (shared) → Linking.openURL; null/отказ → ошибка на
                              экране (AC-47). Ни canOpenURL, ни логов
constants.ts                  COPIED_FEEDBACK_MS = 1500
index.ts                      export { CarViewScreen }
__tests__/                    CarViewScreen.test.tsx (+ по необходимости разрезать): состав карточек,
                              скрытие пустого, копирование (фейковые таймеры, мок @/platform/clipboard),
                              «Маршрут»/«Позвонить» (jest.spyOn(Linking,"openURL")), офлайн из кэша,
                              «Аренда не найдена», ru+en форматирование оплаты/страховки
```

### 1.9 Маршруты и S7 (шаг 9)

```
app/trips/[tripId]/cars/new.tsx            → <CarFormScreen tripId={tripId} /> (≤15 строк)
app/trips/[tripId]/cars/[carId]/index.tsx  НОВЫЙ → <CarFormScreen tripId carId /> (S16b)
app/trips/[tripId]/cars/[carId]/view.tsx   НОВЫЙ → <CarViewScreen tripId carId /> (S17)
app/_layout.tsx                            + Stack.Screen "trips/[tripId]/cars/[carId]/index" { presentation:
                                           "modal" } и "trips/[tripId]/cars/[carId]/view" (push) ВНУТРИ
                                           Stack.Protected (mobile/insights.md 2026-09-21)
__tests__/routes.contract.test.ts          + два маршрута
__tests__/navigation.test.tsx              + недостижимость без сессии; hostile-id таблица: у КАЖДОЙ строки
                                           params расширяются carId (mobile/insights.md 2026-09-24 —
                                           иначе typecheck красный при зелёном jest)
features/trip-detail/components/TripDetailContent.tsx  useCarsQuery(trip.id); hasCars → CarBlock
                                           (onCarPress → push "/trips/[tripId]/cars/[carId]/view"), иначе
                                           прежний EmptyBookingSection; hideAdd={!hasCars} (AC-39…AC-41)
features/trip-detail/__tests__/TripDetailScreen.test.tsx  блок: 0 / 2 аренды, сортировка, «+», состав (AC-42)
features/trip-detail/__tests__/TripDetailCarRoute.test.tsx  real-route: S7 → карточка → S17 (AC-41);
                                           S17 → «Изменить» → S16b; удаление из S16b → S7 без S17 в стеке (AC-31)
```
После шага — регенерация `.expo/types` (`npx expo start` один раз или удалить gitignored-файл), затем
`git checkout -- mobile/.gitignore mobile/expo-env.d.ts` (`mobile/insights.md` 2026-09-22).

### 1.10 Демонтаж и guardrails (шаг 10)

- Удалить `mobile/src/features/booking-form/**` целиком (вариантов не осталось, AC-56). Перед удалением:
  `grep -rn "booking-form\|BookingFormScreen\|BOOKING_FORMS" mobile/src mobile/app` — пусто.
- `locales/{ru,en,uk}/bookingForm.ts`: удалить `titles.car` и `car.*`; **оставить** `titles.flight`,
  `a11y.*Passengers` (их читает `SegmentFormScreen`). Перед удалением —
  `grep -rn 'useTranslation("bookingForm")' mobile/src`.
- `locales/{ru,en,uk}/tripDetail.ts`: удалить мёртвые `car.{emptyTitle,emptyText,addAction}` после grep;
  `sections.car`, `a11y.addCar`, `empty.car` — живые.
- `__tests__/guardrails.test.ts` — три правила (иглы собирать из частей; самотест: ловит нарочный
  пример, не ловит реальное дерево):
  1. `clipboard-only-in-platform`: `expo-clipboard` в `app/**`/`src/**` вне `src/platform/**` запрещён (AC-55).
  2. `tel-scheme-only-in-shared`: литерал `tel:` в `mobile/app|src` запрещён — `tel:` строит только
     `telHref` из `shared` (Non-functional, AC-47).
  3. `trip-cars-table-only-in-cars-api`: `.from("trip_cars")` только в `src/features/cars/api/**` (AC-49).

---

## 2. Изменения зависимостей

| Что | Решение |
|---|---|
| npm-пакеты | Один: `expo-clipboard` через `npx expo install expo-clipboard` (версия под SDK 57). Никаких календарей/телефонных/tz/money-библиотек |
| Нативные модули | **`expo-clipboard` — новый нативный модуль → новая сборка dev-клиента** (`npx expo run:ios` локально; EAS dev-build для устройства). Config-plugin не нужен. Пока клиент старый — `copyText` возвращает `false` (ленивая загрузка в try), экран не падает |
| Privacy manifest | Проверить `PrivacyInfo.xcprivacy` установленного `expo-clipboard` (приём pnpm-обхода из `mobile/insights.md` 2026-09-19). Запись в `UIPasteboard` не required-reason API и не вызывает системный запрос вставки (он только на ЧТЕНИЕ; чтения в фиче нет). Итог — строка в `docs/release/privacy-manifest-audit.md` и комментарий в `app.privacy.ts`; `NS*UsageDescription` не добавлять |
| Миграции | Одна: `supabase/migrations/<ts>_trip_cars.sql` — таблица, 21 CHECK, индекс, триггер, RLS, 4 политики; pgTAP в том же шаге; регенерация `shared/src/db/database.types.ts`. Только локальный стенд |
| Env | Ни одной новой переменной; `service_role` в клиенте не появляется |
| Контракт `@tripplanner/shared` | Расширяется: `cars/*`, `forms/text.ts`, тип строки `trip_cars`. `hotels/schemas.ts` переключается на `forms/text.ts` без изменения поведения. Потребитель один (`mobile/`) |
| Токены | `layout.calendarDayCircle: 40` — `design/tokens.md` → `metrics.ts` → `tokens.test.ts` (шаг 5); затем `node .design-sync/build.mjs` (шаг 12) |
| App Store | Приложение начинает хранить телефоны офисов, суммы залога и номера броней проката — пункт ручного чек-листа M14 |

---

## 3. Порядок выполнения

### 3.0 Режим, тиры, правило непересечения

12 шагов, 7 тиров. Списки файлов шагов **не пересекаются**.

| Тир | Шаги | Зависит от |
|---|---|---|
| 1 | 1 (supabase), 2 (shared-логика), 4 (i18n), 5 (примитивы + clipboard) — взаимно независимы (кроме теста ключей шага 4 → id шага 2) | — |
| 2 | 3 (shared: строка/запись) | 1, 2 |
| 3 | 6 (фича `cars`) | 3, 4, 5 |
| 4 | 7 (`car-form`), 8 (`car-view`) — взаимно независимы | 6 (+2, 4, 5) |
| 5 | 9 (маршруты + S7) | 7, 8 |
| 6 | 10 (демонтаж + guardrails), 11 (e2e, откладываемый) | 9 |
| 7 | 12 (документы, статусы, insights) | 1–11 |

Правила порядка:
1. **Миграция раньше строки** (шаг 3 тестируется против `Tables<"trip_cars">`).
2. **Id ошибок ↔ ключи i18n — один контракт** (§1.2 ↔ §1.4). Шаги 2 и 4 сверяются с таблицей плана.
3. **Файл маршрута и его объявление — один шаг** (шаг 9). Шаги 7/8 пишут фичи без файлов маршрутов;
   их тесты рендерят экраны напрямую (`renderWithProviders`, мок `expo-router`), как тесты hotel-form.
4. **Заглушка умирает последней** (шаг 10), когда `cars/new` уже ведёт на `CarFormScreen` (шаг 9).
5. **Вынос из hotel-form (шаг 5) — рефакторинг без изменения поведения:** все существующие тесты
   hotel-form/segment-form зелёные без правок, кроме путей импорта и перенесённого `moneyInput.test.ts`.
6. **Typed routes:** в шагах 7/8 href на ещё не существующие маршруты типизируются только после шага 9;
   в worktree (без `.expo/types`) typecheck чист, в основном checkout — регенерация после шага 9.
7. **Worktree-гоча** (корневой `insights.md`): первым делом `git merge --ff-only <integration-branch>` +
   `pnpm install`; `supabase db reset` из worktree бьёт по ОБЩЕМУ локальному стенду.

---

### Шаг 1 — `supabase/`: миграция `trip_cars`, RLS, pgTAP, типы *(Тир 1)*

**Зависит от:** ничего. **Блокирует:** 3.
**Владеет файлами:** `supabase/migrations/<timestamp>_trip_cars.sql`,
`supabase/tests/trip_cars_rls.test.sql`, `supabase/tests/trip_cars_constraints.test.sql`,
`shared/src/db/database.types.ts`.
**Что делать:** §1.1.
```bash
supabase start -x vector
supabase migration new trip_cars
supabase db reset          # ЛОКАЛЬНО; стирает локальные аккаунты — только с согласия владельца
supabase test db
supabase gen types typescript --local > shared/src/db/database.types.ts
```
**НЕ делать:** `user_id`, таймзону, число суток в таблице; закрытый список валют в CHECK; правку
существующих миграций/pgTAP/`config.toml`; ничего против хостингового проекта.
**Критерии готовности:** 8 миграций применяются (AC-1); `supabase test db` зелёный целиком, в т.ч. на
непустой локальной БД (AC-2…AC-6); ровно по тесту на каждый из 21 CHECK + позитивные кейсы;
повторная генерация типов без диффа; `pnpm -r typecheck` зелёный (AC-7).

### Шаг 2 — `shared/`: логика аренды и вынос текстовых хелперов *(Тир 1)*

**Зависит от:** ничего. **Блокирует:** 3, 4 (тест ключей), 7.
**Владеет файлами:** `shared/src/forms/text.ts`, `shared/src/forms/__tests__/text.test.ts`,
`shared/src/hotels/schemas.ts`, `shared/src/cars/{errorCodes,phone,schemas,returnAfterFlight}.ts`,
`shared/src/cars/__tests__/{phone,form,returnAfterFlight}.test.ts`,
`shared/src/trips/__tests__/purity.test.ts`.
**Что делать:** §1.2.
**НЕ делать:** пользовательские строки (только id); `URL`/`new URL`; `Intl` напрямую в `cars/`; чтение
часов; литерал `"from"` нигде вне `__tests__` (`shared/insights.md`); `cars/index.ts` и
`shared/src/index.ts` (шаг 3); менять поведение отеля.
**Критерии готовности (`pnpm --filter @tripplanner/shared test` + `typecheck`):**
- Все существующие тесты `hotels/` зелёные без правок.
- Схема: пустой вход → ровно 5 ошибок (AC-21); список id зафиксирован литеральным массивом в тесте;
  `returnSamePlace=true` + место → `returnPlace: null`; `false` без места → `returnPlace.required` (AC-24);
  те же даты и `11:00`/`11:00` → `return.notAfterPickup`, `11:00`/`05:00` через 8 суток — валидно, дата
  возврата раньше → `return.notAfterPickup`; 365 ок / 366 → `dates.tooLong` (AC-22); длины на границе и
  +1 в code points (эмодзи = 1), многострочное место возврата сохраняет `\n` (AC-23); деньги: залог без
  стоимости + валюта → ок, `money.cost === null`; валюта без сумм → `money: null` без ошибки; сумма без
  валюты → `cost.currencyMissing`; `xxx` → `cost.currencyUnknown`; `12.345` → `cost.amountFormat` /
  `deposit.amountFormat` (AC-27/28); enum `null` → `null`, мусор → `*.invalid` (AC-10).
- `parsePhone`/`telHref`: таблица принять (`+351 308 810 777`, `(308) 810-777`, `123`) / отклонить
  (`12`, 16 цифр, `ext 2`, `++1`, буквы, 33 символа); `telHref("+351 (308) 810-777")` → `tel:+351308810777`;
  невалидное → `null` (AC-26, AC-47).
- `carReturnAfterFlight`: все кейсы §1.2 (AC-37).
- `purity.test.ts` сканирует `cars/` и `forms/` и зелёный.

### Шаг 3 — `shared/`: строка БД и запись *(Тир 2)*

**Зависит от:** 1, 2. **Блокирует:** 6.
**Владеет файлами:** `shared/src/cars/rows.ts`, `shared/src/cars/index.ts`, `shared/src/index.ts`,
`shared/src/cars/__tests__/row.test.ts`.
**Что делать:** §1.3.
**Критерии готовности:** `toCarWrite` всегда `source: "manual"` (AC-33); `CarWrite` присваиваем
`TablesInsert<"trip_cars">`; валидная строка → `Car`; каждая повреждённая → ошибка разбора; `time`
`"11:00:00"` → `"11:00"`; весь `@tripplanner/shared` зелёный.

### Шаг 4 — `mobile/`: namespace `car` ru/en/uk *(Тир 1)*

**Зависит от:** ничего (тест ключей — от id шага 2). **Блокирует:** 6, 7, 8.
**Владеет файлами:** `mobile/src/lib/i18n/locales/{ru,en,uk}/car.ts`,
`mobile/src/lib/i18n/locales/{ru,en,uk}/index.ts`, `mobile/src/lib/i18n/__tests__/carKeys.test.ts`.
**Что делать:** §1.4 — полное дерево, включая `validation.*` для каждого id и `pickup.inPast`.
**НЕ делать:** трогать `bookingForm.ts`/`tripDetail.ts` (шаг 10), `hotel.ts`; дубликаты `common:*`/`trips:errors.*`.
**Критерии готовности:** `parity.test.ts` зелёный в трёх локалях; `carKeys.test.ts` зелёный;
`pnpm --filter @tripplanner/mobile typecheck` зелёный (AC-54).

### Шаг 5 — `mobile/`: общие примитивы, вынос из hotel-form, `expo-clipboard` *(Тир 1)*

**Зависит от:** ничего. **Блокирует:** 6, 7, 8.
**Владеет файлами:** `mobile/src/components/form/**` (новый каталог, включая `__tests__/`),
`mobile/src/components/{ConfirmOverlay,ToggleSwitch,SegmentedControl,AnimatedSheetOverlay}.tsx`,
`mobile/src/components/icons.ts`, `mobile/src/components/index.ts`,
`mobile/src/components/__tests__/{Icon,SegmentedControl,AnimatedSheetOverlay,ToggleSwitch,ConfirmOverlay}.test.tsx`,
`mobile/src/lib/forms/**`, `mobile/src/platform/clipboard.ts`,
`mobile/src/platform/__tests__/clipboard.test.ts`, `mobile/src/features/hotel-form/**`,
`mobile/src/features/segment-form/components/BaggageToggle.tsx`, `design/tokens.md`,
`mobile/src/lib/theme/metrics.ts`, `mobile/src/lib/theme/__tests__/tokens.test.ts`,
`mobile/package.json`, `pnpm-lock.yaml`, `mobile/app.privacy.ts`, `docs/release/privacy-manifest-audit.md`.
**Что делать:** §1.5.
**НЕ делать:** менять поведение, тексты и testID hotel-form/segment-form; `Platform.OS` вне
`src/platform/`; hex/магические числа; `react-native-reanimated`/gesture-handler (жест — RN `PanResponder`);
config-plugin для clipboard; чтение буфера обмена.
**Критерии готовности:** все существующие тесты `mobile` зелёные (hotel-form/segment-form — без правок
логики тестов); новые: `SegmentedControl` с `value=null` не отмечает ни одной опции, повторный тап при
`allowDeselect` → `onChange(null)`, без пропа — как раньше; `ToggleSwitch` `getByRole("switch")` +
`toBeChecked()`, ≥44; `AnimatedSheetOverlay swipeToClose` — жест вниз → `onRequestClose`, без пропа
жеста нет; `MoneyField mono={false}` рисует не моно; `copyText` true/false; `Icon.test` знает 4 новых
имени (только feather); `tokens.test.ts` зелёный; `npx expo config --type public` без ошибок.

### Шаг 6 — `mobile/`: фича `cars` (api, хуки, форматирование, блок) *(Тир 3)*

**Зависит от:** 3, 4, 5. **Блокирует:** 7, 8, 9.
**Владеет файлами:** `mobile/src/features/cars/**`.
**Что делать:** §1.6. Владеет **всеми** хуками и форматтерами фичи, включая нужные только шагам 7–9
(урок PLAN-04).
**НЕ делать:** `supabase-js` напрямую; копию классификатора ошибок; оптимизм; логирование чего-либо
кроме `operation`/`errorCode`; адрес/телефон/условия/оплату/заметки в карточке; календарную арифметику.
**Критерии готовности:** пять операций api; не-UUID → `notFound` без вызова клиента; ноль строк →
`notFound`; повреждённая строка → ошибка целиком; insert содержит `source:"manual"` (AC-33); порядок
`.order` pickup_date → pickup_time → id (AC-39); мутации инвалидируют `carKeys.ofTrip`; queryFn бросает
`TripApiError` (AC-49); `useCarQuery` отдаёт запись из кэша списка без сети (AC-49a); форматтеры —
3 формата диапазона в ru/en/uk (AC-15), «19 авг, 11:00», «Ср, 19 авг · 11:00»; карточка: состав AC-39,
«Там же», моно только у дат/времени/номера, без компании — «Аренда авто» (AC-39, AC-42, AC-12).

### Шаг 7 — `mobile/`: форма аренды S16/S16b *(Тир 4)*

**Зависит от:** 2, 4, 5, 6. **Блокирует:** 9.
**Владеет файлами:** `mobile/src/features/car-form/**`.
**Что делать:** §1.7.
**НЕ делать:** «Готово» в шапке, «Сохранить и добавить следующий» (AC-8); системный `Alert`; проверку
ссылки/телефона/денег/порядка дат в `mobile` (только `shared`); сравнение моментов для плашки в
клиенте (только `carReturnAfterFlight`); запрос сегментов ради плашки; поле таймзоны; выставление
`source`; импорт внутренностей `hotel-form`/`trip-detail`/`segment-form`; файлы в `app/`; тесты в `app/`.
**Критерии готовности:** порядок полей и группы AC-9; шапка AC-8; сегменты AC-10 (радиогруппа по
`getByLabelText`, опции `getByRole("radio",{checked})`, снятие выбора); предзаполнение AC-11 (даты
поездки с зажимом к сегодня, пусто у поездки без дат/закончившейся, «Возврат там же» вкл., валюта
профиля); моно-роли AC-12; «Ещё» — шеврон, раскрыт при заполненном залоге/заметках/доп. водителе
AC-14; шторка дат — открытие, подсказки, «Готово» неактивна до второй даты, подложка закрывает без
изменений, Reduce Motion, прошлые дни отключены, правка с прошлым получением сохраняема AC-15…AC-19;
времена — первый тап открывает, пустое колесо 11:00, отмена оставляет пустым AC-20; ошибки пустой формы
все сразу после первой попытки, `return.notAfterPickup` под «Время возврата», `dates.tooLong` под
«Даты» AC-21/22; «Возврат там же» выкл./вкл. — место не отправляется, но хранится в форме AC-24; ссылка —
поведение отеля AC-25; телефон `phone.invalid` AC-26; деньги/валюта/подпись залога AC-27/28; сохранение
→ `router.back`, инвалидация AC-29/30; удаление с подтверждением → `dismissTo` S7 AC-31; «Аренда не
найдена» AC-32; ошибка сети — в форме, двойной тап = один вызов AC-34; «Закрыть без сохранения?»
(включая `beforeRemove`) AC-35; тап вне поля AC-36; плашка появляется/исчезает, не блокирует,
нет плашки без кэша сегментов AC-38.

### Шаг 8 — `mobile/`: просмотр брони S17 *(Тир 4)*

**Зависит от:** 4, 5, 6. **Блокирует:** 9.
**Владеет файлами:** `mobile/src/features/car-view/**`.
**Что делать:** §1.8.
**НЕ делать:** `expo-clipboard` напрямую (только `@/platform/clipboard`); ручную сборку `tel:`;
`canOpenURL`; логирование номера/ссылки/телефона; системный `Alert`; файлы в `app/`.
**Критерии готовности:** шапка AC-43; порядок и скрытие карточек AC-44/47; копирование + 1,5 с +
ошибка без смены подписи AC-45; «Маршрут» — повторная проверка и ошибка на экране, скрыт без ссылки
AC-46; «Позвонить» — `tel:` из `telHref`, скрыт без телефона, одна пилюля на ряд AC-47; форматы
оплаты/страховки/топлива/доп. водителя/залога ru+en AC-48; офлайн из кэша, «Аренда не найдена» AC-49a,
AC-32; зоны ≥44 AC-53.

### Шаг 9 — `mobile/`: маршруты и блок «Аренда авто» на S7 *(Тир 5)*

**Зависит от:** 6, 7, 8. **Блокирует:** 10, 11.
**Владеет файлами:** `mobile/app/trips/[tripId]/cars/new.tsx`,
`mobile/app/trips/[tripId]/cars/[carId]/index.tsx`, `mobile/app/trips/[tripId]/cars/[carId]/view.tsx`,
`mobile/app/_layout.tsx`, `mobile/__tests__/routes.contract.test.ts`, `mobile/__tests__/navigation.test.tsx`,
`mobile/src/features/trip-detail/**`.
**Что делать:** §1.9, затем регенерация `.expo/types` (§3.0 п. 6).
**НЕ делать:** трогать блоки «Транспорт»/«Отель»; менять `EmptyBookingSection`; кодировать id вручную
(объектные href, сырой id).
**Критерии готовности:** оба новых маршрута объявлены в `Stack.Protected` и недостижимы без сессии;
контрактный тест зелёный; 0 аренд → прежнее пустое состояние, «+» скрыт; 2 аренды → 2 карточки по
получению, «+» виден (AC-39, AC-40); тап → `trips/[tripId]/cars/[carId]/view` с `carId` в params
(real-route, AC-41); «Изменить» → S16b; удаление → S7, S17 нет в стеке (AC-31); `pnpm -r typecheck`
зелёный в основном checkout после регенерации.

### Шаг 10 — `mobile/`: демонтаж `booking-form` и guardrails *(Тир 6)*

**Зависит от:** 9.
**Владеет файлами:** `mobile/src/features/booking-form/**` (удаление),
`mobile/src/lib/i18n/locales/{ru,en,uk}/bookingForm.ts`, `mobile/src/lib/i18n/locales/{ru,en,uk}/tripDetail.ts`,
`mobile/__tests__/guardrails.test.ts`.
**Что делать:** §1.10.
**НЕ делать:** удалять `titles.flight`/`a11y.*Passengers`, `sections.car`/`a11y.addCar`/`empty.car`;
ослаблять существующие правила; удалять `PlaceholderField` из `components/` (решение отдельное).
**Критерии готовности:** grep по `booking-form|BookingFormScreen|BOOKING_FORMS` в `mobile/src mobile/app`
пуст; `parity.test.ts` зелёный; три новых правила ловят нарочный пример и проходят на дереве;
`pnpm --filter @tripplanner/mobile test` и `typecheck` зелёные (AC-55, AC-56).

### Шаг 11 — `e2e/`: поток «добавить аренду → карточка → просмотр» *(Тир 6; можно отложить)*

**Зависит от:** 9.
**Владеет файлами:** `e2e/flows/car-rental.yaml`, `scripts/e2e.sh`, `e2e/insights.md`.
**Что делать:** вход → поездка с датами → «Добавить автомобиль» → номер брони, место → времена →
«Сохранить» → карточка на S7 → тап → S17 (номер виден) → «Изменить» → удалить → пустое состояние.
Строки — `KEY=VALUE` в `scripts/e2e.sh`. Maestro не установлен → авторится вслепую; колесо времени
может не поддаться Maestro — такие шаги уходят в ручной чек-лист, допущения в `e2e/insights.md`.
**Критерии готовности:** поток без литералов UI; `./scripts/e2e.sh car-rental` — когда Maestro и
симулятор доступны; иначе явная запись «не запускался» в `e2e/insights.md`.

### Шаг 12 — документы дизайна, статусы, insights *(Тир 7)*

**Зависит от:** 1–11.
**Владеет файлами:** `design/screens/add-car.md`, `design/screens/trip-detail.md`,
`design/screens/navigation.md`, `mobile/AGENTS.md`, `shared/AGENTS.md`, `supabase/AGENTS.md`,
`mobile/insights.md`, `shared/insights.md`, `supabase/insights.md`, `insights.md`.
**Что делать:** `add-car.md` — строка «рейс — с самым поздним вылетом» → «ближайший рейс, вылетающий
после получения» (N-1); «Решения, которые ещё надо принять» — оставить Follow-ups. `trip-detail.md` —
карточка авто (AC-39), тап → S17. `navigation.md` — строки 27/48/55: маршруты `cars/[carId]` (modal) и
`cars/[carId]/view` реализованы. Статусы пакетов (таблица `trip_cars`, фичи `cars`/`car-form`/`car-view`,
`expo-clipboard` + требование пересборки dev-клиента, `booking-form` удалён). Затем
`node .design-sync/build.mjs` (новый токен). Insights — только существенное, после чтения и
дедупликации; в multi-agent implementer'ы возвращают находки в отчёте, пишет этот шаг.
**НЕ делать:** менять продуктовые требования; переписывать SPEC-07.
**Критерии готовности:** ни одного пункта «Документы дизайна, которые нужно обновить» не осталось.

---

## 4. Definition of Done

**Автоматика (из корня):**
```bash
pnpm install
pnpm -r typecheck
pnpm -r test
supabase start -x vector && supabase test db          # db reset — только с согласия владельца
supabase gen types typescript --local | diff - shared/src/db/database.types.ts   # пусто
cd mobile && npx expo config --type public
./scripts/e2e.sh car-rental                           # когда Maestro и симулятор доступны
```
Без `@ts-ignore` / `@ts-expect-error` / `eslint-disable` (guardrail).

**Ручной чек-лист (iOS; ПЕРЕД ним — пересборка dev-клиента из-за `expo-clipboard`):**

| # | Проверка | AC |
|---|---|---|
| M0 | `npx expo run:ios` пересобран; в логе Metro строка «iOS Bundled …» (mobile/insights.md 2026-09-22) | §2 |
| M1 | Сверка формы и S17 с макетом HANDOFF: порядок полей, группы, шапки, пилюли | AC-8, AC-9, AC-43, AC-44 |
| M2 | Авиарежим: форма целиком заполняется; сохранение → ошибка в форме, ввод на месте | Goal 3, AC-34 |
| M3 | Шторка «Даты аренды»: анимация, свайп вниз, тап по подложке, Reduce Motion, прошлые дни | AC-16…AC-19 |
| M4 | Колесо времени: пустое открывается на 11:00; «Отмена» оставляет пустым | AC-20 |
| M5 | Ссылка `maps.app.goo.gl/…` → «Маршрут» открывает Google Maps/Safari; `evil.tld` → ошибка | AC-25, AC-46 |
| M6 | «Позвонить» на устройстве открывает набор; на симуляторе — ошибка на экране, не падение | AC-47 |
| M7 | «Копировать» → «Скопировано» 1,5 с; вставка в Заметки даёт номер | AC-45 |
| M8 | S17 офлайн после просмотра S7 в той же сессии — данные видны | AC-49a |
| M9 | Рейс LIS 06:00, возврат 07:00 того же дня → плашка; исправить → исчезает | AC-37, AC-38 |
| M10 | Светлая/тёмная: сегменты, переключатели, плашка, контраст ≥4.5:1 | AC-51, AC-53 |
| M11 | VoiceOver: радиогруппы, переключатели «вкл/выкл», «Ещё» развёрнуто/свёрнуто, «×» ссылки | AC-10, AC-52, AC-53 |
| M12 | ru / en / uk: нет непереведённых ключей; форматы дат трёх видов | AC-15, AC-54 |
| M13 | Второй аккаунт: чужой `carId` → «Аренда не найдена» на S16b и S17; удаление поездки → аренд нет | AC-3, AC-5, AC-32 |
| M14 | Декларация сбора данных App Store Connect покрывает телефоны офисов/номера броней/залог | §2 |
| M15 | Логи dev-клиента при ошибке: только операция и код | AC-50 |

### 4a. Трассируемость AC → шаг

| AC | Шаг(и) | AC | Шаг(и) | AC | Шаг(и) |
|---|---|---|---|---|---|
| 1 | 1 | 20 | 5, 7 | 39 | 6, 9 |
| 2 | 1 | 21 | 2, 7 | 40 | 9 |
| 3 | 1 (+M13) | 22 | 2, 7 | 41 | 9 |
| 4 | 1 | 23 | 2 | 42 | 6, 9 |
| 5 | 1 | 24 | 2, 7 | 43 | 8 |
| 6 | 1 | 25 | 2, 5, 7 | 44 | 8 |
| 7 | 1, 3 | 26 | 2, 7 | 45 | 5, 8 |
| 8 | 7 | 27 | 2, 5, 7 | 46 | 8 |
| 9 | 7 | 28 | 2, 7 | 47 | 2, 8, 10 |
| 10 | 5, 7 | 29 | 6, 7 | 48 | 8 |
| 11 | 7 | 30 | 7 | 49 | 6, 10 |
| 12 | 5, 6, 7 | 31 | 7, 9 | 49a | 6, 8 |
| 13 | 1, 2 | 32 | 6, 7, 8 | 50 | 6, 8, 10 (+M15) |
| 14 | 7 | 33 | 3, 6 | 51 | 5, 6, 7, 8 |
| 15 | 6, 7 | 34 | 7 | 52 | 5, 6, 7, 8 |
| 16 | 5, 7 | 35 | 5, 7 | 53 | 5, 7, 8 |
| 17 | 7 (shared `pickRangeDate`) | 36 | 7 | 54 | 4 |
| 18 | 7 | 37 | 2 | 55 | 5, 10 |
| 19 | 7 | 38 | 7 | 56 | 5, 10 |
| | | | | 57 | все (§4) |

### 4b. Стоп-лист implementer'а

1. Никаких таблиц, кроме `trip_cars`; ни `user_id`, ни таймзоны на ней; применённые миграции не трогать.
2. Ничего против хостингового Supabase; `db reset` локально — только с согласия владельца.
3. `with check` на insert **и** update; каждая политика покрыта pgTAP.
4. `service_role`/секреты в `mobile/` — нигде.
5. `trip_cars` — только `features/cars/api/`; `supabase-js` — только `lib/supabase`.
6. Проверка ссылки, телефона, денег, порядка дат/времён, лимита 365, предупреждения о рейсе — только `shared`.
7. `new URL(...)` — нигде; ссылку и `tel:` открывать только после повторной проверки; без `canOpenURL`.
8. Номер брони, ссылка, адрес, телефон, залог, заметки, id — не в логах и не в текстах ошибок.
9. Никакого системного `Alert`; подтверждения и шторки — in-tree overlay.
10. `Platform.OS`/`.ios.*`/`.android.*`/`expo-clipboard` — только в `src/platform/**`.
11. Никаких строк UI вне `locales/**`; hex/магических чисел/имён шрифтов вне `lib/theme`.
12. Моно — номер брони, значения дат и времён, код валюты. Телефон, суммы, залог, компания, места, адрес, класс, заметки — Manrope.
13. Никакой конвертации валют и итогов; валюта профиля — только умолчание НОВОЙ записи.
14. `source` из клиента — только `'manual'`.
15. Никаких проверок «аренда вне дат поездки», нахлёстов, конфликтов «получение ↔ прилёт».
16. Никаких `@ts-ignore`/`@ts-expect-error`/`eslint-disable`; существующие guardrails не ослаблять.
17. Единственная новая нативная зависимость — `expo-clipboard`; ни разрешений, ни `NS*UsageDescription`, ни ключей хранилища, ни чтения буфера.
18. Не менять поведение/тексты/testID отеля и сегментов при выносе общих компонентов.
19. Тесты — вне `app/`.

---

## 5. Риски, допущения, расхождения, вопросы

**Допущения (если неверны — остановиться и спросить):**
- A-1. Только локальный Supabase; хостинговый проект не трогается.
- A-2. Приёмка на iOS; код кросс-платформенный, Android не проверяется.
- A-3. S17 — обычный push-экран (не модальный); S16b — модальный поверх S17.
- A-4. Кэш сегментов для плашки AC-38 есть всегда, когда форма открыта с S7; при холодном deep link
  его нет — плашка не показывается (спек это допускает).

**Риски:**
- **R-1 (сборка).** `expo-clipboard` — новый нативный модуль: уже установленный dev-клиент не знает о
  нём (`mobile/insights.md` 2026-09-22 про «застрявший» клиент). Ленивая загрузка в `platform/clipboard`
  превращает отсутствие модуля в экранную ошибку (AC-45), но ручная проверка M7 требует пересборки (M0).
- **R-2 (навигация).** `router.dismissTo` к S7 при стеке S7 → S17 → S16b(modal): поведение проверить
  real-route тестом шага 9; если `dismissTo` не снимает модальный экран и S17 одним вызовом — fallback
  `router.dismissAll()` + `router.navigate` к S7 (решение implementer'а шага 7, фиксируется в insights).
- **R-3 (регрессия).** Шаг 5 трогает hotel-form и segment-form. Защита — «все их тесты зелёные без
  изменения логики тестов» и ручной прогон формы отеля в M1.
- **R-4 (жест).** Свайп шторки на `PanResponder` поверх `ScrollView`-формы: жест живёт только на панели
  шторки, форма под подложкой неактивна; проверка M3.
- **R-5 (тестовый).** Большая асинхронная форма: `renderWithProviders` async, уничтожение мутаций перед
  `QueryClient.clear()`, `includeHiddenElements` при открытой шторке, фейковые таймеры для «Скопировано»
  (не смешивать `setSystemTime` и `advanceTimersByTime`), `useToday` пиннуется через `renderWithProviders({ today })`.
- **R-6 (продукт).** Белый список карт не пускает национальные домены Google (как у отеля, PLAN-05 R-2).
- **R-7 (инструмент).** Maestro не установлен — шаг 11 авторится вслепую.

**Расхождения спека, дизайна и кода (не чиним молча):**
- **N-1.** `add-car.md` («Поведение»): «рейс — с самым поздним вылетом» против AC-37 «ближайший рейс,
  вылетающий после получения». План следует спеку; документ правит шаг 12.
- **N-2.** AC-20 ссылается на `platform/datePicker`, но поведение SPEC-05 AC-65 (первый тап открывает
  шторку, запись только по «Готово», `startTime`) сейчас живёт в `platform/timeSheetPicker`
  (`useTimeSheetPicker`) — используется он.
- **N-3.** AC-37/38 говорят «функция вернула true»; для текста плашки нужно время вылета и зона, поэтому
  `carReturnAfterFlight` возвращает `{ departureAt, timeZone } | null` (не-null = предупреждение).
- **N-4.** Контракт спека называет `daysBetween/rentalDays`: `daysBetween` уже есть в
  `trips/calendarDate`, потребителя у `rentalDays` в UI нет — отдельную функцию не заводим.
- **N-5.** Календарь отеля начинает неделю по правилу `locale === "ru" ? 1 : 0` — у `uk` неделя с
  воскресенья (вероятный дефект SPEC-06). Календарь аренды — всегда с понедельника (AC-16); отель не
  трогаем (Follow-up спека про единообразие календарей).
- **N-6.** AC-52 называет `chevron-left`/`chevron-down`/`copy`/`navigation` — в `icons.ts` их нет (`back` —
  это `arrow-left`); шаг 5 добавляет имена.
- **N-7.** AC-16 требует закрытие шторки свайпом вниз, а у `AnimatedSheetOverlay` ручка декоративная —
  шаг 5 добавляет необязательный жест.
- **N-8.** `tripDetail.car.{emptyTitle,emptyText,addAction}` — мёртвые ключи эпохи моков; удаляет шаг 10.
- **N-9.** «Вынести SheetOverlay в components/»: переносится `ConfirmOverlay` hotel-form (тот же паттерн);
  `trip-detail/components/SheetOverlay.tsx` остаётся на месте (перевод его на общий — Follow-up, не
  расширяем шаг 9).

**Вопросы владельцу (все с вариантом по умолчанию; ни один не блокирует тир 1):**
- **Q-A. Режим выполнения.** *По умолчанию:* single-agent, по порядку. Параллелятся тир 1 (шаги 1, 2, 4,
  5) и тир 4 (шаги 7, 8); шаги 10 и 11 тоже независимы. Подтвердить.
- **Q-B. Шрифт сумм.** SPEC-07 AC-12: суммы аренды — Manrope, а у отеля сумма моно (SPEC-05 AC-14) —
  две формы будут выглядеть по-разному. *По умолчанию:* аренда по SPEC-07, отель не меняем (проп `mono`).
- **Q-C. Неделя в календаре аренды на en.** AC-16 — «с понедельника» для всех языков. *По умолчанию:* так
  и делаем; альтернатива — по локали (en с воскресенья), тогда стоит заодно починить `uk` у отеля (N-5).
- **Q-D. Строки общих полей.** *По умолчанию:* общие `MapsLinkField`/`CurrencyButton` получают строки
  пропсами, у аренды свои ключи в `car` (тексты частично совпадают с `hotel`). Альтернатива — общий
  namespace для полей формы с переносом ключей отеля (больше правок в hotel-form).
