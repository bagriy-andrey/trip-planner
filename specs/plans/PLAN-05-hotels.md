# Implementation Plan: Отель — бронь проживания в поездке (SPEC-05)

**Spec:** `specs/SPEC-05-hotels.md` (Status: draft, 2026-09-23) — источник истины для WHAT.
Этот документ — только HOW: файлы, модули, порядок, команды, критерии готовности.
**Status:** planning
**Scope:** `supabase/` (таблица `trip_hotels`, RLS, pgTAP), `shared/` (модуль `hotels`, модуль
`money`, поиск только городов в `places`, регенерированные типы БД), `mobile/` (фича `hotels`:
api + хуки + блок S7; фича `hotel-form`: S14/S14b; примитивы `components/` и `platform/datePicker`;
namespace `hotel` ru/en; маршрут `hotels/[hotelId]`; демонтаж варианта `hotel` у `booking-form`;
guardrails), `e2e/` (один поток, откладываемый), `design/screens/*`, статусные строки `*/AGENTS.md`,
`*/insights.md`.
**Platforms:** ios+android. iOS-only поведения нет. Новых нативных зависимостей нет
(`Linking` — ядро RN; время — уже установленный `@react-native-community/datetimepicker` за
`src/platform/datePicker.tsx`) → **новая сборка dev-клиента не нужна.**
**Execution mode:** по умолчанию **single-agent, строго по порядку шагов**. Тир 1 (шаги 1, 2, 3, 4)
файл-непересекающийся и может быть роздан четырём параллельным implementer'ам — **решение
владельца, вопрос Q-A в §5**.
**Open questions спека Q1–Q5 приняты по умолчанию, как написано в спеке:** гостей 1…9; закрытый
список валют в `shared/`; оба времени обязательны; выезд в день заезда разрешён (0 ночей); город
только из справочника мест.

---

## 0. Что уже существует (проверено чтением репозитория 2026-09-23)

| Артефакт | Фактическое состояние | Вывод для плана |
|---|---|---|
| `supabase/migrations/` | Три миграции: `…_trips.sql` (в т.ч. функция `public.set_updated_at()`), `…_trip_segments.sql` (образец владения через родителя: 4 политики с `exists(…trips…)`, `with check` на insert И update), `…_trip_segments_wider_seat_ticket.sql` | Шаг 1 добавляет **четвёртую** миграцию; `set_updated_at()` переиспользуется; применённые миграции не трогаются |
| `supabase/tests/trip_segments_{rls,constraints}.test.sql` | 27 + 28 тестов; фикстуры `auth.users(id,email)`, смена личности `set local role` + `request.jwt.claims` | Образец для шага 1. **Но:** RLS-файлы считают строки по всей таблице и краснеют на непустой БД (`supabase/insights.md`, Open Questions 2026-09-23) — новый RLS-файл обязан считать **только свои фикстуры** (`where id in (…)` / `where trip_id in (…)`) |
| `shared/src/segments/time.ts` | `zonedDateTimeToInstant(date, "HH:MM", zone)` и `instantToZonedParts(instant, zone)`, DST-безопасно на обоих знаках смещения, `isClockTime`, тип `ClockTime` | **Переиспользовать** (AC-30). Второй реализации не писать |
| `shared/src/segments/schemas.ts` | Образец схемы формы: всё в одном `.transform` с явными `path`, id ошибок вместо текстов, `codePointLength`, `normalizeText`; `segmentRowSchema` из `unknown`; `toSegmentWrite` с литералом `source:'manual'` | Схема отеля пишется по тому же образцу. **Отличие:** `normalizeText` схлопывает ВСЕ пробелы, включая переводы строк — для многострочных `address`/`notes` его использовать нельзя (§1.2) |
| `shared/src/trips/calendarDate.ts` | `isCalendarDate`, `daysBetween`, `addDays`, `compareCalendarDates`, тип `CalendarDate` | `daysBetween` — основа подсчёта ночей (в `shared`, не в `mobile`) |
| `shared/src/places/` | `PLACE_DIRECTORY` (197 стран + 100 городов), `searchPlaces` (города И страны, лимит 4), `findPlaceById`, `CityRecord.timeZone`, `isValidTimeZone` | Нужен поиск **только городов** (у страны нет таймзоны) → новая `searchCities` рядом с `searchPlaces` (шаг 2). Id мест не перенумеровывать |
| `shared/src/trips/__tests__/purity.test.ts` | Сканирует `places/`, `trips/`, `forms/`: только относительные импорты + zod, никаких часов, `Intl` только в `places/timeZone.ts`, кириллица только в `directory.ts`/`airports.ts`/`fold.ts` | Шаг 2 **расширяет** скан на `hotels/` и `money/` (AC-«без кириллицы», контракт спека) |
| `shared/src/auth/__tests__/schemas.test.ts` | Сканирует весь `src/**` регэкспом спецификаторов; строковый литерал ровно `"from"` вне `__tests__` даёт ложное срабатывание (`shared/insights.md`) | В `hotels/`/`money/` литерал `"from"` не использовать нигде, даже в комментариях в кавычках |
| `shared/src/db/database.types.ts` | `trips`, `trip_segments` | Регенерируется шагом 1 |
| `mobile/src/features/transport/` | Образец api (`segmentsApi.ts`: закрытый результат, `mapTripError` из `@/features/trips`, лог только `operation`/`errorCode`), хуки (`queryKeys`, `unwrap*` → throw `TripApiError`, мутации без оптимизма, `useRequireSignedIn`) | Фича `hotels` копирует **приёмы**, не файлы; классификатор ошибок импортируется из `@/features/trips` (как у transport, PLAN-04 R-5) |
| `mobile/src/features/segment-form/` | Образец формы: загрузчики create/edit, `formState.ts` (чистые функции), `useSegmentForm.ts` (`beforeRemove` для свайпа, `leaving`-ref, подтверждение удаления), локальный `ConfirmOverlay` (паттерн `SheetOverlay` копией), `SegmentFormScreen.tsx` — **580 строк** | Приёмы переиспользовать, размер — нет: экран отеля режется на компоненты ≤150 строк (§1.7) |
| `mobile/src/components/TextField.tsx` | Нет `multiline`, нет моно-варианта, пресеты `text/email/password/newPassword/code` | segment-form из-за этого завёл локальный моно-`TextInput`. Шаг 4 добавляет `multiline`, `mono` и пресеты `url`/`decimal`/`code3` (§1.4) — иначе форма отеля продублирует 4 разных инпута |
| `mobile/src/components/Stepper.tsx` | Кнопки без блокировки на границах | Шаг 4 добавляет необязательные `min`/`max` (обратно совместимо) |
| `mobile/src/platform/datePicker.tsx` | `DatePicker` (`minimumDate`, `startDate`, `emptyContent`), `TimePicker` — пустое значение открывается на **жёстко зашитых** `"12:00"` (`EMPTY_START`), пропа нет | AC-13 требует 15:00 / 11:00 → шаг 4 добавляет проп `startTime`. Глобальный jest-мок сообщает свой `value` → в тестах нажатие пустого пикера даст ровно `startTime` |
| `mobile/src/features/booking-form/` | Варианты `hotel` и `car`; `BOOKING_FORMS.hotel`, ключи `bookingForm.hotel.*`, `titles.hotel` | Вариант `hotel` удаляется шагом 9 (AC-48). `titles.flight` и `a11y.*Passengers` читает segment-form — **не трогать** |
| `mobile/src/lib/i18n/locales/{ru,en}/tripDetail.ts` | Мёртвые ключи `hotel.checkIn/checkOut/breakfast_*` (формат «Завтрак: N из M дня» — наследие моков, не совпадает с AC-35); `sections.hotel`, `a11y.addHotel`, `empty.hotel` — живые | Мёртвые ключи удаляет шаг 9 после grep; живые не трогаются |
| `mobile/src/features/trip-detail/components/TripDetailContent.tsx` | Блок «Отель» — всегда `EmptyBookingSection` + `hideAdd` | Шаг 8 ставит `HotelBlock` при наличии отелей (зеркально блоку «Транспорт») |
| `mobile/app/trips/[tripId]/hotels/new.tsx` | Рендерит `BookingFormScreen variant="hotel"`; объявлен в `Stack.Protected`, в `routes.contract.test.ts` и `navigation.test.tsx` | Шаг 7 перенаправляет на `HotelFormScreen`; новый `hotels/[hotelId].tsx` + объявление + тесты — тот же шаг |
| `mobile/__tests__/guardrails.test.ts` | Правила `backend-only-behind-the-boundary` (в спеке назван старым именем `no-backend-or-network`), `no-credentials-in-logs` (разрешены только `operation`/`errorCode`), `no-platform-os-outside-platform`, `no-cyrillic-outside-locales`, цвета/шрифты, часы | Новые правила шага 9 — узко по фичам отеля (§1.9) |
| Использование `Linking` в `mobile/` | Нет ни одного | Первое использование; только из `hotel-form/hooks`, только после повторной проверки ссылки (AC-27) |

---

## 1. Разбивка по модулям

Порядок раздела — от схемы к клиенту: `supabase/` → `shared/` → `mobile/` → `e2e/` → документы.
Направление зависимостей: **миграция → типы БД → схемы `shared/` → api `mobile/` → экраны**.
Доменная логика `shared/` (ночи, завтраки, ссылка, валюты, схема формы) от БД **не зависит** и
идёт параллельно с миграцией; разбор строки и write-маппер — после обоих.

### 1.1 `supabase/` — таблица `trip_hotels` (шаг 1)

Файл: `supabase migration new trip_hotels`.

**DDL (контракт плана; синтаксис проверяется применением):**

```sql
create table public.trip_hotels (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references public.trips (id) on delete cascade,
  source         text not null default 'manual',
  name           text not null,
  city_place_id  text not null,
  time_zone      text not null,
  address        text,
  maps_url       text,
  check_in_at    timestamptz not null,
  check_out_at   timestamptz not null,
  guests         smallint not null default 1,
  parking        text not null default 'none',
  breakfast      text not null default 'none',
  breakfast_days smallint,
  cost_amount    numeric(12,2),
  cost_currency  text,
  booking_ref    text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint trip_hotels_source        check (source in ('manual','imported_pending','imported_confirmed')),
  constraint trip_hotels_name_len      check (char_length(name) between 1 and 120
                                              and btrim(name, E' \t\r\n') <> ''),
  constraint trip_hotels_city_fmt      check (city_place_id ~ '^city-[a-z0-9-]+$'),
  constraint trip_hotels_tz_fmt        check (time_zone ~ '^[A-Za-z][A-Za-z0-9_+-]*(/[A-Za-z0-9_+-]+)+$'),
  constraint trip_hotels_address_len   check (address is null
                                              or (char_length(address) <= 300
                                                  and btrim(address, E' \t\r\n') <> '')),
  constraint trip_hotels_maps_url      check (maps_url is null
                                              or (char_length(maps_url) <= 2048
                                                  and maps_url ~ '^https://(www\.google\.com/maps|google\.com/maps|maps\.google\.com|maps\.app\.goo\.gl|goo\.gl/maps)([/?#]|$)')),
  constraint trip_hotels_stay_order    check (check_out_at > check_in_at),
  constraint trip_hotels_stay_max      check (check_out_at - check_in_at <= interval '367 days'),
  constraint trip_hotels_guests        check (guests between 1 and 9),
  constraint trip_hotels_parking       check (parking in ('none','free','paid')),
  constraint trip_hotels_breakfast     check (breakfast in ('all','partial','none')),
  constraint trip_hotels_bdays_partial check ((breakfast_days is not null) = (breakfast = 'partial')),
  constraint trip_hotels_bdays_range   check (breakfast_days is null or breakfast_days between 1 and 365),
  constraint trip_hotels_cost_pair     check ((cost_amount is null) = (cost_currency is null)),
  constraint trip_hotels_cost_amount   check (cost_amount is null or cost_amount >= 0),
  constraint trip_hotels_currency_fmt  check (cost_currency is null or cost_currency ~ '^[A-Z]{3}$'),
  constraint trip_hotels_ref_len       check (booking_ref is null
                                              or (char_length(booking_ref) <= 32
                                                  and btrim(booking_ref, E' \t\r\n') <> '')),
  constraint trip_hotels_notes_len     check (notes is null
                                              or (char_length(notes) <= 1000
                                                  and btrim(notes, E' \t\r\n') <> ''))
);

create index trip_hotels_trip_id_check_in_at_idx on public.trip_hotels (trip_id, check_in_at);

create trigger trip_hotels_set_updated_at
  before update on public.trip_hotels
  for each row execute function public.set_updated_at();
```

Решения, которые иначе переоткроют вслепую:
- **`btrim(x, E' \t\r\n')`**, не `btrim(x)` — голый снимает только U+0020 (`supabase/insights.md`).
- **`char_length` в Postgres (UTF-8) считает code points** — ровно как `shared` (AC-17).
- **`numeric(12,2)`** = до 12 цифр всего, из них 2 после запятой (10 целых). Округления на стороне
  БД быть не должно: `shared` заранее отвергает третий знак после запятой (AC-19).
- **Валюта — только формат** `^[A-Z]{3}$`, не закрытый список: расширение списка — правка `shared`,
  не миграция (Q2 спека).
- **Лимит 365 ночей** точно проверяется в `shared` (календарные даты в зоне отеля). В БД — грубая
  внешняя граница `367 days` (365 ночей + поздний выезд + сдвиг DST не должны её задевать). Точная
  проверка через `at time zone` в CHECK сознательно не делается: неизвестная, но синтаксически
  верная зона дала бы исключение `22023` вместо нарушения ограничения.
- **`maps_url`** проверяется в БД тем же белым списком хостов, что и в `shared` (защита в глубину,
  AC-24/AC-25). Нормализованная ссылка (схема и хост в нижнем регистре) под регэксп подходит.
- **`city_place_id`** — формат id города справочника (`city-porto`); существование id проверяет
  `shared` (справочник только растёт и не перенумеровывается).
- Ни `user_id`, ни денормализованного названия города, ни числа ночей в таблице нет (ночи —
  производное, AC-20).

**RLS в той же миграции** — копия формы `trip_segments` (владение через родителя, `supabase/insights.md`):

```sql
alter table public.trip_hotels enable row level security;

create policy trip_hotels_select_own on public.trip_hotels for select to authenticated
  using (exists (select 1 from public.trips t
                 where t.id = trip_hotels.trip_id and t.user_id = (select auth.uid())));
create policy trip_hotels_insert_own on public.trip_hotels for insert to authenticated
  with check (exists (select 1 from public.trips t
                      where t.id = trip_hotels.trip_id and t.user_id = (select auth.uid())));
create policy trip_hotels_update_own on public.trip_hotels for update to authenticated
  using      (exists (select 1 from public.trips t
                      where t.id = trip_hotels.trip_id and t.user_id = (select auth.uid())))
  with check (exists (select 1 from public.trips t
                      where t.id = trip_hotels.trip_id and t.user_id = (select auth.uid())));
create policy trip_hotels_delete_own on public.trip_hotels for delete to authenticated
  using (exists (select 1 from public.trips t
                 where t.id = trip_hotels.trip_id and t.user_id = (select auth.uid())));
```

**pgTAP:**

| Файл | Что доказывает |
|---|---|
| `supabase/tests/trip_hotels_rls.test.sql` (~27) | RLS включён; `policies_are` ровно 4 политики; владелец: select/insert/update/delete своего отеля (AC-2); другой пользователь: 0 строк на select, 0 затронутых на update/delete (AC-3); insert с чужим и несуществующим `trip_id`, update-перенос в чужую поездку → `42501` (AC-4); `anon`: 0 строк на select/update/delete и `42501` на insert (AC-2, `supabase/insights.md`); каскад от удаления поездки и от `delete from auth.users` (AC-5). **Все подсчёты — только по своим фикстурам** (`where trip_id in (<фикстуры>)` или `where id in (…)`), чтобы файл был зелёным и на непустой локальной БД |
| `supabase/tests/trip_hotels_constraints.test.sql` (~30) | AC-6: по одной падающей вставке на **каждое** из 19 ограничений DDL (включая пустую-после-trim строку с табом в `name`, `http://`, `https://google.com.evil.tld/maps`, `javascript:`, `maps_url` 2049 символов, `cost_amount` без валюты и наоборот, `breakfast_days` при `all`, `partial` без дней, `check_out_at = check_in_at`, валюта `eur`) + дефолты `source='manual'`, `guests=1`, `parking='none'`, `breakfast='none'` + триггер `updated_at` (приём: вставить со старым `updated_at`, обновить, сравнить с `now()`) |

Счёт тестов в плане — ориентир; пишется ровно по тесту на каждое ограничение, которое реально есть
в DDL (урок PLAN-04: «14 в прозе, 15 в DDL»).

**Типы:** `supabase gen types typescript --local > shared/src/db/database.types.ts` (AC-7).
Ничего не выполняется против хостингового проекта.

### 1.2 `shared/` — доменная логика отеля и денег (шаг 2)

```
shared/src/money/currencies.ts   CURRENCIES: readonly список кодов ISO 4217 (as const), по умолчанию
                                 40 штук: EUR USD GBP PLN UAH CZK CHF SEK NOK DKK HUF RON BGN RSD ISK
                                 TRY GEL AMD AZN KZT ILS AED EGP MAD ZAR JPY CNY KRW HKD SGD THB VND
                                 IDR INR CAD AUD NZD MXN BRL ARS. isCurrencyCode(x): x is CurrencyCode;
                                 searchCurrencies(query, limit = 4): префикс по коду, регистр не важен
                                 (для подсказок в форме, синхронно)
shared/src/money/amount.ts       parseMoneyAmount(input: string) → { ok: true; amount: string } |
                                 { ok: false }. trim; ровно одно из: цифры; цифры + ("." | ",") +
                                 1–2 цифры. Без знака, без пробелов внутри, без экспоненты, не более
                                 10 целых цифр (numeric(12,2)). Нормализация в КАНОНИЧЕСКУЮ строку
                                 "1234.50" (точка, ровно 2 знака, без ведущих нулей кроме "0.xx").
                                 Денежное значение в домене — СТРОКА, не float (никакой арифметики
                                 в этой фазе, Non-goals). MONEY_MAX_INTEGER_DIGITS = 10
shared/src/money/index.ts        публичная поверхность
shared/src/hotels/errorCodes.ts  HOTEL_FIELD_ERROR + isHotelFieldErrorId (список ниже — КОНТРАКТ
                                 с шагом 3, менять только вместе)
shared/src/hotels/nights.ts      nightsBetweenDates(checkInDate, checkOutDate): number — разность
                                 календарных дат (daysBetween), может быть ≤ 0;
                                 countNights(checkInAt: Date, checkOutAt: Date, timeZone): number —
                                 то же, но из UTC-моментов через instantToZonedParts в зоне ОТЕЛЯ
                                 (AC-20). HOTEL_MAX_NIGHTS = 365 (AC-18)
shared/src/hotels/breakfast.ts   BREAKFAST_DAYS_FALLBACK_MAX = 30;
                                 breakfastDaysRange(nights: number | null) → { min: 1, max }
                                 (формула — «Диапазон дней завтрака» ниже);
                                 clampBreakfastDays(days, nights) → число в диапазоне (AC-22, AC-23)
shared/src/hotels/mapsUrl.ts     parseMapsUrl(input: unknown) → { ok: true; url } |
                                 { ok: false; error: "mapsUrl.notGoogleMaps" | "mapsUrl.tooLong" }
                                 (AC-24, AC-25). MAPS_URL_MAX_LENGTH = 2048. Алгоритм ниже
shared/src/hotels/schemas.ts     HotelFormInput / HotelFormValue / hotelFormSchema / parseHotelForm
                                 (без row/write — они в шаге 5, файл rows.ts). HOTEL_* лимиты:
                                 NAME 120, ADDRESS 300, BOOKING_REF 32, NOTES 1000, GUESTS 1…9,
                                 HOTEL_PARKING = ["none","free","paid"], HOTEL_BREAKFAST =
                                 ["all","partial","none"] (as const, порядок = порядок UI, AC-44)
shared/src/places/search.ts      + searchCities(query, limit = PLACE_SUGGESTION_LIMIT): CityRecord[] —
                                 тот же проход и порядок, что searchPlaces, но фильтр kind === "city"
                                 ДО отсечения лимита (иначе страны вытеснят города); findCityById(id)
shared/src/places/index.ts       + экспорт searchCities, findCityById
shared/src/hotels/__tests__/     nights.test.ts, breakfast.test.ts, mapsUrl.test.ts, form.test.ts
shared/src/money/__tests__/      currencies.test.ts, amount.test.ts
shared/src/places/__tests__/     citySearch.test.ts (новый файл; search.test.ts не трогать)
shared/src/trips/__tests__/purity.test.ts  расширить скан на /src/hotels/ и /src/money/ (кириллица,
                                 импорты, часы). Ожидание `intlUsers` остаётся ["/src/places/timeZone.ts"]:
                                 hotels/ использует Intl только КОСВЕННО через segments/time.ts
```

**`HOTEL_FIELD_ERROR` — зафиксированный список (id = путь i18n-ключа `hotel:form.validation.<id>`):**

| Ключ поля (`path`) | id |
|---|---|
| `name` | `name.required`, `name.tooLong` |
| `city` | `city.required`, `city.notInDirectory` |
| `checkInDate` / `checkInTime` | `checkIn.dateRequired`, `checkIn.timeRequired` |
| `checkOutDate` / `checkOutTime` | `checkOut.dateRequired`, `checkOut.timeRequired` |
| `checkOut` (перекрёстные) | `checkOut.notAfterCheckIn`, `checkOut.stayTooLong` |
| `address` | `address.tooLong` |
| `mapsUrl` | `mapsUrl.notGoogleMaps`, `mapsUrl.tooLong` |
| `guests` | `guests.range` |
| `parking` / `breakfast` | `parking.invalid`, `breakfast.invalid` (UI их не порождает; защита от мусора) |
| `breakfastDays` | `breakfastDays.range` |
| `costAmount` | `cost.amountFormat`, `cost.amountMissing` (валюта без суммы) |
| `costCurrency` | `cost.currencyMissing` (сумма без валюты), `cost.currencyUnknown` |
| `bookingRef` | `bookingRef.tooLong` |
| `notes` | `notes.tooLong` |

**Схема формы — правила** (скилл `zod` + `shared/insights.md`):
- Все ключи входа — `z.unknown().optional()`, вся валидация в **одном** `.transform((raw, ctx) => …)`
  с явными `path`: zod 4 пропускает object-level `.check`, как только упало любое поле, а AC-15
  требует «все ошибки сразу».
- Вход: `name, cityPlaceId, address, mapsUrl, checkInDate, checkInTime, checkOutDate, checkOutTime,
  guests, parking, breakfast, breakfastDays, costAmount (string), costCurrency, bookingRef, notes`.
- Выход `HotelFormValue`: `{ name, city: CityRecord, timeZone: city.timeZone, address | null,
  mapsUrl | null, checkInAt: Date, checkOutAt: Date, guests, parking, breakfast,
  breakfastDays | null, cost: { amount: string; currency: CurrencyCode } | null,
  bookingRef | null, notes | null }`. `source` в выходе нет — он литерал в write-маппере (шаг 5).
- **Нормализация текста:** однострочные `name`, `bookingRef` — trim + схлопывание пробелов;
  многострочные `address`, `notes` — trim + `\r\n`→`\n`, внутренние переводы строк **сохраняются**
  (не использовать `normalizeText` из segments). Пусто после trim → `null` (AC-17). Длины — в code
  points; превышение — ошибка, не обрезка (Edge cases).
- **Город:** `findCityById(cityPlaceId)`; пусто → `city.required`; не город/не найден →
  `city.notInDirectory` (AC-12). Таймзона берётся ИЗ ЗАПИСИ, во входе её нет.
- **Моменты:** `zonedDateTimeToInstant(date, time, city.timeZone)` из `../segments/time` (AC-30);
  выезд ≤ заезда (по UTC) → `checkOut.notAfterCheckIn` (AC-16); `nightsBetweenDates > 365` →
  `checkOut.stayTooLong` (AC-18). Смена города пересобирает моменты сама — форма хранит местные
  дату и время, а не моменты (Edge case).
- **Завтраки:** `breakfast !== "partial"` → `breakfastDays: null` независимо от входа (AC-22);
  `partial` → целое в `breakfastDaysRange(nights)`, где `nights` — `nightsBetweenDates`, если обе
  даты валидны, иначе `null`.
- **Диапазон дней завтрака:** `min = 1`; `max = nights === null ? 30 : Math.max(1, nights - 1)`
  (AC-22: day-use и 1 ночь дают 1…1).
- **Стоимость:** пустая сумма И пустая валюта → `cost: null`; только сумма → `cost.currencyMissing`
  на `costCurrency`; только валюта → `cost.amountMissing` на `costAmount`; сумма не парсится →
  `cost.amountFormat`; валюта не из `CURRENCIES` (после trim + upper) → `cost.currencyUnknown`
  (AC-19). Валюта по умолчанию не подставляется нигде в `shared`.
- **Ссылка:** пусто → `null`; иначе `parseMapsUrl`, её ошибка кладётся на `mapsUrl`.
- `guests` — целое 1…9, отсутствует → 1. `parking`/`breakfast` отсутствуют → `"none"`.

**`parseMapsUrl` — алгоритм (без `URL`!).** `URL` в Hermes/RN — неполный полифилл
(`hostname` исторически «not implemented», IDNA не поддерживается), в Node/Deno — полный WHATWG:
одна и та же строка разберётся по-разному на разных клиентах, а спек требует одну функцию на всех.
Поэтому разбор — ручной, по ASCII:
1. Не строка → `notGoogleMaps`. `trim()` (пробелы, `\t`, `\r`, `\n` по краям — Edge case).
2. Любой пробельный или управляющий символ (`\u0000-\u001F`, `\u007F`, пробел) внутри → отказ.
3. Префикс схемы без учёта регистра ровно `https://` → иначе отказ (`http:`, `javascript:`,
   `HTTPS:/x`, `//host`).
4. Authority = всё до первого `/`, `?` или `#`. В нём: только `[A-Za-z0-9.-]` (так отсекаются
   userinfo `@`, порт `:`, обратный слэш, процент-кодирование и **любые не-ASCII** — юникод-двойники
   хостов); lower-case.
5. Хост по **точному равенству**: `www.google.com` / `google.com` → путь обязан быть `/maps` или
   начинаться с `/maps/`, `/maps?`, `/maps#` (так `/mapsevil` отвергнут); `maps.google.com`,
   `maps.app.goo.gl` → любой путь; `goo.gl` → путь начинается с `/maps/` или равен `/maps`.
   `google.com.evil.tld`, `evilgoogle.com`, `google.com.`, `google.pl` → отказ.
6. Результат = `https://` + хост в нижнем регистре + остаток **без изменений**. Длина в code points
   > 2048 → `mapsUrl.tooLong`.
Таблица тестов (AC-24): допустимые (все 5 хостов, верхний регистр схемы/хоста, хвостовые `\n`,
`?q=`, `#`); недопустимые (`http`, `javascript:`, `data:`, `https://user@www.google.com/maps`,
`https://www.google.com:443/maps`, `https://www.google.com.evil.tld/maps`, `https://evil.tld/www.google.com/maps`,
`https://gооgle.com/maps` с кириллическими «о», `https://www.google.com/mapsevil`, `https://goo.gl/abc`,
`https://maps.google.com\@evil`, пробел внутри, пустая строка после trim, 2049 символов). Кириллица
в тесте допустима — `purity.test.ts` не сканирует `__tests__`; в исходнике `mapsUrl.ts` двойники
описываются только словами.

### 1.3 `mobile/src/lib/i18n` — namespace `hotel` (шаг 3)

Урок PLAN-04 (корневой `insights.md`, 2026-09-23): namespace, созданный одним шагом, обязан сразу
содержать **все** строки, которые понадобятся последующим шагам. Поэтому полное дерево ключей
зафиксировано здесь и является контрактом шагов 6, 7, 8; последующие шаги ключи **не добавляют**
(если ключа не хватает — это дефект плана: в single-agent режиме дописать в оба языка и отметить
в отчёте шага; в multi-agent — остановиться и сообщить).

```
hotel.form.title                        «Отель»  (НЕ bookingForm:titles.hotel — он удаляется, AC-48)
hotel.form.save / saving                «Сохранить» / a11y-текст занятости
hotel.form.field.{name, city, cityPlaceholder, address, mapsUrl, mapsUrlPlaceholder, checkIn,
  checkOut, date, time, guests, parking, breakfast, breakfastDays, cost, costAmountPlaceholder,
  currency, currencyPlaceholder, bookingRef, notes}
hotel.form.nights_{one,few,many,other}  «{{count}} ночь — считается из дат» (en: _one/_other)
hotel.form.parking.{none, free, paid}   «Нет / Бесплатно / Платно»
hotel.form.breakfast.{all, partial, none} «Все дни / Частично / Нет»
hotel.form.mapsLink.{added, source, open, remove, openFailed}
                                        «Ссылка добавлена» / «Google Maps» / «Открыть» /
                                        «Убрать ссылку» (a11y ×) / «Не удалось открыть ссылку»
hotel.form.a11y.{clear, decreaseGuests, increaseGuests, decreaseBreakfastDays, increaseBreakfastDays,
  parkingGroup, breakfastGroup, currencySuggestion}
hotel.form.unsaved.{title, message, discard}   «Закрыть без сохранения?» …
hotel.form.delete.{link, title, message, confirm}  «Удалить отель» …; message с {{name}}
hotel.form.validation.<каждый id из HOTEL_FIELD_ERROR>  — ключи 1:1 с id (`name.required` →
  validation.name.required), так что `t(\`form.validation.${id}\`)` не требует таблицы соответствий.
  city.notInDirectory = «Выберите город из списка», mapsUrl.notGoogleMaps = «Нужна ссылка Google Maps»
hotel.card.{checkIn, checkOut, breakfastAll}; hotel.card.breakfastPartial_{…} «Завтраки: частично,
  {{count}} дн.» (плюральные формы в обеих локалях); hotel.card.a11y «{{name}}, заезд {{checkIn}},
  выезд {{checkOut}}»
hotel.notFound.{title, text, action}    «Отель не найден» …
```

Ошибки сохранения/загрузки — существующие `trips:errors.*` (AC-40), «Отмена» — `common:actions.cancel`,
«Повторить» — `common:actions.retry`/существующий ключ; дубликатов не заводить.
Файлы: `locales/{ru,en}/hotel.ts` (новые), `locales/{ru,en}/index.ts` (+ регистрация). Тест
паритета (`parity.test.ts`) уже сверяет плюральные категории каждой локали — отдельного теста не нужно,
но он обязан быть зелёным.

### 1.4 `mobile/src/components` и `src/platform` — примитивы формы (шаг 4)

```
src/components/TextField.tsx     + multiline?: boolean (minHeight из токена layout, textAlignVertical
                                   "top"); + mono?: boolean (typography.mono — «билетные» данные:
                                   номер брони, сумма, код валюты); + пресеты variant: "url"
                                   (keyboardType url, autoCapitalize none, autoCorrect false,
                                   textContentType URL), "decimal" (keyboardType decimal-pad),
                                   "currency" (autoCapitalize characters, autoCorrect false, maxLength 3).
                                   Обратно совместимо: существующие вызовы не меняются
src/components/Stepper.tsx       + min?/max?: number → кнопка на границе disabled + accessibilityState.
                                   Значение Stepper'а сейчас рисуется моно — для «Гостей» это
                                   запрещено (AC-14, «число пассажиров не моно»): + mono?: boolean,
                                   по умолчанию true (обратная совместимость), форма отеля передаёт false
src/components/SegmentedControl.tsx НОВЫЙ: generic <T extends string> { label (a11y группы), options:
                                   readonly { value: T; label: string }[], value: T, onChange,
                                   testID }. Контейнер accessibilityRole="radiogroup" НЕ accessible
                                   (иначе VoiceOver проглотит радио — mobile/insights.md 2026-09-19),
                                   опции — Pressable role="radio" + accessibilityState.checked,
                                   ≥ layout.minTouch, выбранная — фон accent + текст onAccent (AC-44)
src/components/index.ts          + экспорты
src/components/__tests__/        TextField.test.tsx (+ multiline/mono/пресеты), primitives.test.tsx
                                   или новый SegmentedControl.test.tsx, Stepper-границы
src/platform/datePicker.tsx      TimePicker: + startTime?: TimeOfDay (по умолчанию прежние "12:00") —
                                   время, на котором открывается пустой пикер (iOS: value нативного
                                   контрола; Android: value в DateTimePickerAndroid.open). AC-13
src/platform/__tests__/timePicker.test.tsx  + кейс: пустой пикер с startTime "15:00" → onChange("15:00")
```

Токены: сегмент-контрол и многострочное поле используют существующие `accent`, `onAccent`, `surface`,
`surfaceBorder`, `radius.field`, `layout.minTouch`. Если понадобится размер, которого нет (например,
минимальная высота многострочного поля) — сначала `design/tokens.md`, затем `lib/theme/metrics.ts`
и снапшот `tokens.test.ts`; эти три файла тогда входят в список шага 4 (другие шаги их не трогают).

### 1.5 `shared/` — строка БД и write-маппер (шаг 5)

```
shared/src/hotels/rows.ts        hotelRowSchema (z.object из unknown: все колонки, source enum,
                                 time_zone через isValidTimeZone, city_place_id → findCityById
                                 обязан найти ГОРОД (иначе ошибка разбора → ошибка загрузки, как
                                 неизвестный код аэропорта у сегментов), cost_amount: number | string |
                                 null → каноническая строка через toFixed(2)/parseMoneyAmount,
                                 check_in_at/out ISO-моменты); Hotel = HotelFormValue & { id, tripId,
                                 source }; toHotel(row); hotelFromRowSchema = hotelRowSchema.transform(toHotel);
                                 HotelWrite (snake_case, source: "manual" литералом — AC-34);
                                 toHotelWrite(value, tripId): cost_amount = Number(amount) (JSON-число
                                 ≤12 значащих цифр сериализуется точно; клиент supabase не
                                 типизирован Database, но HotelWrite обязан быть присваиваем
                                 TablesInsert<"trip_hotels"> — проверяется типовым тестом)
shared/src/hotels/index.ts       публичная поверхность hotels (всё из шага 2 + rows)
shared/src/index.ts              + export * from "./hotels" / "./money"
shared/src/hotels/__tests__/row.test.ts  goodRow: Tables<"trip_hotels">; повреждённые строки
                                 (неизвестный city id, битая зона, breakfast "some", numeric строкой
                                 "12.5" → "12.50"); round-trip toHotelWrite → строка → toHotel;
                                 source всегда "manual" на записи
```

### 1.6 `mobile/src/features/hotels` — данные и блок S7 (шаг 6)

```
api/hotelsApi.ts        ЕДИНСТВЕННЫЙ модуль, обращающийся к trip_hotels (через @/lib/supabase).
                        listHotels(tripId) — один запрос на поездку, .order("check_in_at");
                        getHotel(tripId, hotelId) — hotelId и tripId проверяются как UUID ДО
                        запроса (не UUID → { ok:false, kind:"notFound" } без сети, AC-33, «Untrusted
                        inputs»), .eq("id").eq("trip_id").maybeSingle(); createHotel(tripId, form);
                        updateHotel(tripId, hotelId, form); deleteHotel(tripId, hotelId) — ноль
                        затронутых строк → notFound. Явный список колонок. Каждая строка —
                        hotelFromRowSchema; не разобралась → вся операция "unknown" (не частичные
                        данные). Лог: console.warn("[hotels]", operation, "failed", errorCode) —
                        только эти идентификаторы (guardrail no-credentials-in-logs; AC-28): ни id,
                        ни maps_url, ни адреса, ни номера брони
api/index.ts            поверхность api + unwrapHotel(result) → throw TripApiError(kind);
                        mapTripError/TripApiError/TripErrorKind — из @/features/trips (не копировать)
hooks/queryKeys.ts      hotelKeys = { all: ["hotels"], ofTrip: (tripId) => ["hotels", tripId],
                        one: (tripId, id) => ["hotels", tripId, id] }
hooks/useHotelsQuery.ts useHotelsQuery(tripId) → { hotels, isError, error, refetch, … }; queryFn
                        бросает (иначе retry lib/query не сработает, mobile/insights.md 2026-09-22)
hooks/useHotelQuery.ts  useHotelQuery(tripId, hotelId)
hooks/useHotelMutations.ts useCreateHotel / useUpdateHotel / useDeleteHotel / useHotelMutations;
                        без оптимизма; onSuccess инвалидирует hotelKeys.ofTrip(tripId) (одного ключа
                        хватает: one — его префикс, но инвалидировать явно оба, как transport);
                        сессия не signedIn → TripApiError("denied")
types.ts                toHotelCardData(hotel, locale) → { id, name, checkInText, checkOutText,
                        breakfastChip: { kind: "all" } | { kind: "partial"; days } | null,
                        a11yLabel }. Время — formatSegmentDateTime(locale, instant, hotel.timeZone):
                        зона ВСЕГДА явная (дефолт форматтеров — UTC, mobile/insights.md). Никакой
                        календарной арифметики
components/HotelCard.tsx  стеклянная карточка (surface, radius.card, spacing.lg): название
                        (Manrope, не моно) + Icon chevron; строка «Заезд <моно>» / «Выезд <моно>»;
                        чип завтраков на фоне divider (при «Нет» — нет чипа). Одна accessible
                        Pressable, role="button", label = a11yLabel, ≥44pt. Адреса, заметок, номера
                        брони и стоимости в карточке НЕТ (AC-38)
components/HotelBlock.tsx  список HotelCard по check_in_at ↑ (при равенстве — по id, детерминированно),
                        onHotelPress(id). Решение «пусто/не пусто» принимает S7, не блок
index.ts                публичная поверхность: HotelBlock, HotelCard (тип пропсов), hotelKeys, хуки,
                        unwrapHotel не экспортировать наружу (внутренний шов)
__tests__/ + api/__tests__/ + hooks/__tests__/  по образцу transport (мок @/lib/supabase как в
                        segmentsApi.test.ts; мутации — через реальные хуки с замоканным api
                        и залогиненной сессией; уничтожать мутации перед QueryClient.clear())
```

### 1.7 `mobile/src/features/hotel-form` — S14 / S14b (шаг 7)

Размер: `segment-form/SegmentFormScreen.tsx` вырос до 580 строк — здесь экран режется заранее
(правило скилла `mobile-architecture`: >150 строк или 2+ ответственности → отдельный компонент).

```
HotelFormScreen.tsx         ≤ ~120 строк: HotelFormScreen({ tripId, hotelId? }) → CreateHotelLoader |
                            EditHotelLoader; состояния загрузки/ошибки/«Отель не найден»
components/HotelFormBody.tsx      шапка ModalHeader (cancelAsIcon, hideDone, title hotel:form.title,
                            AC-9) + прокручиваемое тело (Screen: automaticallyAdjustKeyboardInsets,
                            AC-46) + нижняя панель «Сохранить» + оверлеи. Только композиция
components/CityField.tsx          текст + подсказки searchCities (≤4, ≥44pt); значение — ВЫБРАННАЯ
                            запись; ввод текста сбрасывает выбор (приём trip-form PlaceField, КОПИЕЙ
                            паттерна — внутренности trip-form не импортируются); ошибка
                            city.notInDirectory при непустом тексте без выбора (AC-12)
components/StayDateTimeRow.tsx    одна строка «дата + время» (заезд или выезд): DatePicker
                            (minimumDate/startDate для выезда = дата заезда, AC-13) + TimePicker
                            (startTime 15:00 / 11:00 параметром), значения моно (AC-14), крестик
                            «Очистить» у заполненного поля (Icon close, a11y hotel:form.a11y.clear),
                            ошибки под полем
components/NightsLine.tsx         «N ночей — считается из дат»: получает ЧИСЛО из хука, сам не считает
                            (AC-20/21); скрыт при null или 0
components/BreakfastBlock.tsx     SegmentedControl (Все дни / Частично / Нет) + Stepper «Дней с
                            завтраком» (min/max из breakfastDaysRange, только при partial, AC-22)
components/CostField.tsx          сумма (TextField variant decimal, mono) + валюта (variant currency,
                            mono) с подсказками searchCurrencies (≤4 чипа-кнопки ≥44pt); ошибки
                            обоих полей (AC-19)
components/MapsLinkField.tsx      пусто → TextField variant url; ссылка валидна и принята →
                            строка «Ссылка добавлена / Google Maps» + кнопка «Открыть» + IconButton
                            close (a11y «Убрать ссылку», ≥44pt) (AC-26); ошибка открытия — текстом
                            в поле (AC-27). Сама ссылка на экране НЕ печатается целиком (не нужна
                            и может быть длинной)
components/ConfirmOverlay.tsx     локальная копия паттерна SheetOverlay (absolute view + scrim-фон
                            Pressable + нижняя панель) для «Закрыть без сохранения?» и «Удалить
                            отель?»; остальной экран за ним — accessibilityElementsHidden /
                            importantForAccessibility="no-hide-descendants" (e2e/insights.md
                            2026-09-23: у segment-form этого не было)
components/HotelFormStates.tsx    Loading / LoadError(+Повторить) / HotelNotFound (одно состояние для
                            неизвестного, чужого, не-UUID, удалённого с другого устройства, AC-33)
hooks/formState.ts          HotelFormState (местные строки/выборы: name, cityText, city: CityRecord |
                            null, address, mapsUrlText, mapsUrl: string | null, checkInDate/Time,
                            checkOutDate/Time, guests, parking, breakfast, breakfastDays, costAmount,
                            costCurrency, bookingRef, notes); EMPTY_HOTEL_FORM;
                            hotelFormFromTrip(trip, lang) (AC-10/11: город, если trip.place.kind ===
                            "city" и findCityById нашёл запись; даты start/end; ВРЕМЕНА null);
                            hotelFormFromHotel(hotel, lang) (instantToZonedParts в зоне ОТЕЛЯ, AC-31);
                            withDates(state, …) → вызывает clampBreakfastDays из shared (AC-23);
                            hotelFormEquals (dirty); toHotelFormInput(state) → вход parseHotelForm.
                            Чистые функции, тестируются без рендера
hooks/useHotelForm.ts       state + touched-поля (ошибка поля видна после ухода из поля или первой
                            попытки сохранить, AC-15); nights = nightsBetweenDates (shared) или null;
                            submit: parseHotelForm → ошибки всех полей сразу | мутация create/update;
                            кнопка занята на время запроса, повторное нажатие игнорируется (AC-40);
                            ошибка мутации → trips:errors.<kind> в форме, ввод сохранён; успех →
                            router.back() (инвалидация делает карточку видимой, AC-29); удаление с
                            подтверждением (AC-32) и notFound при удалении → состояние «Отель не
                            найден» (Edge case); beforeRemove-перехват свайпа при dirty + leaving-ref
                            (приём useSegmentForm, AC-41); openMapsLink: parseMapsUrl(state.mapsUrl)
                            → Linking.openURL(url) в try/catch → ошибка openFailed в форме (AC-27).
                            Никакого Alert
index.ts                    export { HotelFormScreen } + тип пропсов
__tests__/                  formState.test.ts, HotelFormScreen.test.tsx (разрезать на 2–3 файла по
                            темам: create/prefill, edit/delete/notFound, validation/maps/breakfast —
                            так быстрее и не упираться в act-предупреждения), компонентные тесты
                            SegmentedControl-использования не дублировать
app/trips/[tripId]/hotels/new.tsx        → <HotelFormScreen tripId={tripId} /> (≤15 строк)
app/trips/[tripId]/hotels/[hotelId].tsx  НОВЫЙ → <HotelFormScreen tripId hotelId />; оба параметра
                            «сырые», используются только как ключи
app/_layout.tsx             + <Stack.Screen name="trips/[tripId]/hotels/[hotelId]" options={{ presentation:
                            "modal" }} /> ВНУТРИ Stack.Protected (иначе маршрут незащищён,
                            mobile/insights.md 2026-09-21)
__tests__/routes.contract.test.ts  + "/trips/[tripId]/hotels/[hotelId]"
__tests__/navigation.test.tsx       + недостижимость без сессии; real-route: S7 → карточка → S14b с
                            hotelId в params (AC-37 — эту часть добавляет шаг 8, см. ниже)
```

Порядок полей и роли шрифтов — ровно AC-8 и AC-14: моно — значения дат, времени, номер брони, сумма,
код валюты; не моно — название, город, адрес, гости, заметки, подписи. Иконки: `pin` (город/ссылка),
`calendar`, `close`, `plus`, `minus`; эмодзи и текстовые символы нет (AC-42).

Тест-гочи (из `mobile/insights.md`): `renderWithProviders` асинхронный; `userEvent.type` дописывает
к непустому значению — дефолтная фикстура поездки **без** города, опционально с датами, а тесты
предзаполнения явно берут поездку-город; устройство и отель в разных зонах имитируются обёрткой
`Intl.DateTimeFormat` (не `process.env.TZ`); нажатие пустого замоканного пикера даёт его `value`,
т. е. `startDate`/`startTime`; мокать `@/features/hotels/api` и `@/features/trips/api` с
залогиненной сессией; `jest.spyOn(Linking, "openURL")` c `mockResolvedValueOnce`/`mockRejectedValueOnce`.

### 1.8 `mobile/src/features/trip-detail` — блок «Отель» на S7 (шаг 8)

`TripDetailContent.tsx`: `useHotelsQuery(trip.id)`; `hasHotels` → `HotelBlock` (onHotelPress →
`router.push({ pathname: "/trips/[tripId]/hotels/[hotelId]", params: { tripId, hotelId } })`, сырой
id, без ручного кодирования), `hideAdd={!hasHotels}` (AC-36: «+» в шапке при наличии отелей, пустое
состояние — прежнее `EmptyBookingSection`); ошибка/загрузка списка отелей не ломают экран (блок
остаётся пустым состоянием; ошибка загрузки поездки — своя). Блоки «Транспорт» и «Аренда авто» не
трогать. Тесты: `TripDetailScreen.test.tsx` (+ состав карточки, сортировка, чип, переход,
инвалидация после мутации — AC-35…AC-38). Real-route тест перехода S7 → S14b (AC-37) — в
`trip-detail/__tests__/` через `renderRouter("./app")` (работает из `src/`, `mobile/insights.md`),
а не в `navigation.test.tsx` (он принадлежит шагу 7).

### 1.9 Демонтаж заглушки и guardrails (шаг 9)

- `booking-form/fields.ts`: `BookingVariant = "car"`, удалить `BOOKING_FORMS.hotel`, члены
  `"hotel.*"` у `BookingFieldLabelKey`, `"titles.hotel"` у `BookingFormTitleKey`;
  `BookingFormScreen.test.tsx` — только `car`.
- `locales/{ru,en}/bookingForm.ts`: удалить `hotel: {…}` и `titles.hotel`; **оставить**
  `titles.flight`, `titles.car`, `a11y.*Passengers` (их читает segment-form, `mobile/insights.md`
  2026-09-23). Перед удалением: `grep -rn 'useTranslation("bookingForm")\|bookingForm:' mobile/src mobile/app`.
- `locales/{ru,en}/tripDetail.ts`: удалить мёртвые `hotel.{checkIn,checkOut,breakfast_*}` после grep
  `"hotel\.` по `mobile/src` (живые `sections.hotel`, `a11y.addHotel`, `empty.hotel` оставить).
- `__tests__/guardrails.test.ts`, два новых правила, иглы собирать из частей (любое `mobile-all`
  правило сканирует и сам файл):
  1. `no-maps-allowlist-outside-shared`: литералы `goo.gl` / `google.com` (как хост) в
     `mobile/app/**`, `mobile/src/**` запрещены — белый список живёт только в
     `shared/src/hotels/mapsUrl.ts` (AC-24). Локали говорят «Google Maps» словами — не срабатывает.
  2. `no-nights-arithmetic-in-hotel-features`: в `src/features/hotels/**` и
     `src/features/hotel-form/**` запрещены `daysBetween(`, `24 * 60 * 60`, `86400000`, `864e5`
     (AC-20: клиент не считает ночи сам). Узкая область — существующие `RangeCalendar.tsx`,
     `lib/i18n/format.ts`, `TripStatusPill.tsx` законно это используют.
  Плюс самотест каждого правила (флагует нарочный пример, не флагует реальное дерево).

---

## 2. Изменения зависимостей

| Что | Решение |
|---|---|
| npm-пакеты | **Ни одного.** Ни библиотеки URL (ручной ASCII-разбор надёжнее неполного полифилла Hermes), ни tz-библиотеки (есть `segments/time.ts`), ни money-библиотеки (сумма — каноническая строка, арифметики нет) |
| Нативные модули | **Ни одного** → dev-клиент не пересобирается. `Linking` — ядро RN; для `https` не нужен `LSApplicationQueriesSchemes` и не вызывается `canOpenURL`. Появление нативной зависимости = изменение объёма: остановиться и сообщить |
| Миграции | Одна: `supabase/migrations/<ts>_trip_hotels.sql` — таблица, 19 ограничений, индекс, триггер, RLS, 4 политики в одном файле; pgTAP в том же шаге; сразу регенерация `shared/src/db/database.types.ts`. Применённые миграции не редактировать. Только локальный стенд |
| Env | Ни одной новой переменной; `service_role` в клиенте не появляется |
| Разрешения / privacy manifest | Без изменений: ни разрешений, ни `NS*UsageDescription`, ни новых ключей в `src/lib/storage/keys.ts`. Отели не пишутся на устройство вне кэша TanStack Query (в памяти) |
| Контракт `@tripplanner/shared` | Расширяется: `hotels/*`, `money/*`, `searchCities`/`findCityById`, тип строки `trip_hotels`. Потребитель один (`mobile/`); Edge Functions/`web` план не вводит |
| App Store | Приложение начинает хранить адреса, номера броней и заметки проживания — пункт ручного чек-листа M12 (перепроверка декларации сбора данных) |

---

## 3. Порядок выполнения

### 3.0 Режим, тиры, правило непересечения

11 шагов, 7 тиров. Списки файлов шагов **не пересекаются** нигде.

| Тир | Шаги | Зависит от |
|---|---|---|
| 1 | 1 (supabase), 2 (shared-логика), 3 (i18n), 4 (примитивы) — взаимно независимы | — |
| 2 | 5 (shared: строка/запись) | 1, 2 |
| 3 | 6 (фича `hotels`) | 3, 4, 5 |
| 4 | 7 (фича `hotel-form` + маршруты) | 2, 3, 4, 5, 6 |
| 5 | 8 (S7) | 6, 7 |
| 6 | 9 (демонтаж + guardrails) → 10 (e2e, откладываемый) | 7, 8 |
| 7 | 11 (документы, статусы, insights) | 1–10 |

Правила порядка:
1. **Миграция раньше строки.** `rows.ts` тестируется против `Tables<"trip_hotels">`; шаг 5 без шага 1
   не компилируется.
2. **Id ошибок и ключи i18n — один контракт** (§1.2 таблица ↔ §1.3 `validation.*`). Шаги 2 и 3 идут
   параллельно, поэтому оба сверяются с таблицей в плане, а не друг с другом.
3. **Файл маршрута и его объявление — один шаг** (шаг 7): `hotels/[hotelId].tsx`, `app/_layout.tsx`,
   `routes.contract.test.ts`, `navigation.test.tsx`.
4. **Заглушка умирает последней** (шаг 9), когда `hotels/new` уже ведёт на новую форму (шаг 7).
5. **После шага 7 в основном checkout'е:** `.expo/types/router.d.ts` протухает и `pnpm typecheck`
   краснеет на корректных href. Лечение — один `npx expo start` (или удалить gitignored-файл), затем
   `git checkout -- mobile/.gitignore mobile/expo-env.d.ts` (`mobile/insights.md` 2026-09-22).
6. **Worktree-гоча** (корневой `insights.md`): worktree implementer'а режется от `main`, не от
   интеграционной ветки — первым делом `git merge <integration-branch>` + `pnpm install`;
   `supabase db reset` из worktree бьёт по ОБЩЕМУ локальному стенду.

---

### Шаг 1 — `supabase/`: миграция `trip_hotels`, RLS, pgTAP, типы *(Тир 1)*

**Зависит от:** ничего (Supabase CLI + Docker). **Блокирует:** 5.
**Владеет файлами:** `supabase/migrations/<timestamp>_trip_hotels.sql`,
`supabase/tests/trip_hotels_rls.test.sql`, `supabase/tests/trip_hotels_constraints.test.sql`,
`shared/src/db/database.types.ts`.
**Что делать:** §1.1.
```bash
supabase start -x vector
supabase migration new trip_hotels
supabase db reset          # ЛОКАЛЬНО; стирает локальные аккаунты — только с согласия владельца
supabase test db
supabase gen types typescript --local > shared/src/db/database.types.ts
```
**НЕ делать:** `user_id` на отеле; колонку ночей/названия города; закрытый список валют в CHECK;
правку существующих миграций, `config.toml`, существующих pgTAP-файлов; ничего против хостингового
проекта.
**Критерии готовности:** `supabase db reset` применяет 4 миграции (AC-1); `supabase test db`
зелёный целиком, включая новые файлы, **и на непустой локальной БД** (новый RLS-файл считает только
свои фикстуры) (AC-2…AC-6); по тесту на каждое ограничение DDL; повторная генерация типов без диффа;
`pnpm -r typecheck` зелёный (AC-7).

### Шаг 2 — `shared/`: логика отеля, деньги, поиск городов *(Тир 1)*

**Зависит от:** ничего. **Блокирует:** 5, 7.
**Владеет файлами:** `shared/src/hotels/{errorCodes,nights,breakfast,mapsUrl,schemas}.ts`,
`shared/src/hotels/__tests__/{nights,breakfast,mapsUrl,form}.test.ts`, `shared/src/money/**`,
`shared/src/places/search.ts`, `shared/src/places/index.ts`,
`shared/src/places/__tests__/citySearch.test.ts`, `shared/src/trips/__tests__/purity.test.ts`.
**Что делать:** §1.2.
**НЕ делать:** ни одной пользовательской строки (только id); `URL`/`URLSearchParams`; `Intl`
напрямую в `hotels/`/`money/`; `normalizeText` из segments для многострочных полей; литерал `"from"`;
чтение часов; `hotels/index.ts` и `shared/src/index.ts` (шаг 5); правку `segments/**`, `trips/**`
кроме `purity.test.ts`.
**Критерии готовности (`pnpm --filter @tripplanner/shared test` + `typecheck`):**
- Ночи: одинаковые даты → 0; через переход на летнее и зимнее время в `Europe/Warsaw` и
  `America/New_York` (23- и 25-часовые сутки) — календарная разность, не деление мс; заезд 23:30 /
  выезд 00:30 следующего дня в зоне отеля → 1 ночь, хотя прошёл час; одна и та же пара моментов в
  двух зонах даёт разные ночи; 365 ок, 366 → `checkOut.stayTooLong` (AC-18, AC-20).
- Диапазон завтраков: `null` → 1…30; 0 и 1 ночь → 1…1; 5 ночей → 1…4; clamp вниз/вверх (AC-22, AC-23).
- `parseMapsUrl`: вся таблица §1.2 (AC-24, AC-25).
- Сумма: `12`, `12.5`→`12.50`, `12,05`→`12.05`, `0`→`0.00` ок; `-1`, `1e3`, `12.345`, `1 000`, `,5`,
  `12.`, 11 целых цифр — ошибка (AC-19). Валюты: `isCurrencyCode("eur")` → false до upper (upper
  делает схема), неизвестный `XXX` → `cost.currencyUnknown`.
- Схема: пустой вход → ровно 6 ошибок обязательных полей одновременно (`name`, `city`, 4 даты/время)
  (AC-15); пары стоимости в обе стороны; `partial` без дней → `breakfastDays.range`, `all` с днями →
  `breakfastDays: null`; длины на границе и +1 в code points (эмодзи считается одним); многострочный
  адрес сохраняет `\n`; пусто после trim → `null` (AC-17); смена города с той же местной датой/временем
  даёт другой UTC-момент (Edge case); список id зафиксирован литеральным массивом в тесте.
- `searchCities("Пор")` возвращает Порту, но не Португалию; лимит 4; детерминированный порядок.
- `purity.test.ts` сканирует `hotels/` и `money/` и зелёный.

### Шаг 3 — `mobile/`: namespace `hotel` ru/en *(Тир 1)*

**Зависит от:** ничего. **Блокирует:** 6, 7.
**Владеет файлами:** `mobile/src/lib/i18n/locales/{ru,en}/hotel.ts`,
`mobile/src/lib/i18n/locales/{ru,en}/index.ts`.
**Что делать:** §1.3 — полное дерево ключей, включая `validation.*` для **каждого** id из таблицы §1.2.
**НЕ делать:** трогать `bookingForm.ts`/`tripDetail.ts` (шаг 9); заводить ключи-дубликаты
существующих `common:*`/`trips:errors.*`.
**Критерии готовности:** `parity.test.ts` зелёный (ключи и плюральные категории: ru
`_one/_few/_many/_other`, en `_one/_other`); `pnpm --filter @tripplanner/mobile typecheck` зелёный;
для каждого id §1.2 существует `hotel:form.validation.<id>` в обеих локалях (проверить разворотом
списка в тесте шага 7 либо здесь простым unit-тестом рядом с `parity.test.ts` — если так, этот
тест-файл входит в список шага 3: `mobile/src/lib/i18n/__tests__/hotelKeys.test.ts`).

### Шаг 4 — `mobile/`: примитивы формы и время по умолчанию *(Тир 1)*

**Зависит от:** ничего. **Блокирует:** 6, 7.
**Владеет файлами:** `mobile/src/components/{TextField,Stepper,SegmentedControl,index}.tsx|ts`,
`mobile/src/components/__tests__/{TextField,SegmentedControl,Stepper}.test.tsx`,
`mobile/src/platform/datePicker.tsx`, `mobile/src/platform/__tests__/timePicker.test.tsx`;
условно (только если нужен новый токен) `design/tokens.md`, `mobile/src/lib/theme/metrics.ts`,
`mobile/src/lib/theme/__tests__/tokens.test.ts`.
**Что делать:** §1.4.
**НЕ делать:** менять поведение существующих вызовов (все новые пропсы необязательные, дефолты =
текущее поведение); `Platform.OS` вне `src/platform/`; hex/магические числа.
**Критерии готовности:** все существующие тесты `mobile` зелёные без правок (обратная
совместимость); новые: многострочное и моно-поле, пресеты; Stepper блокирует кнопку на `min`/`max`
и отдаёт `accessibilityState.disabled`, `mono={false}` рисует тело не моно; SegmentedControl —
группа находится `getByLabelText`, опции `getByRole("radio", { name, checked })`, зона ≥44pt;
TimePicker с `startTime="15:00"` в пустом состоянии отдаёт `"15:00"`, без пропа — прежние `"12:00"`.

### Шаг 5 — `shared/`: строка БД и запись *(Тир 2)*

**Зависит от:** 1, 2. **Блокирует:** 6, 7.
**Владеет файлами:** `shared/src/hotels/rows.ts`, `shared/src/hotels/index.ts`, `shared/src/index.ts`,
`shared/src/hotels/__tests__/row.test.ts`.
**Что делать:** §1.5.
**Критерии готовности:** `toHotelWrite` всегда `source: "manual"` (AC-34); `HotelWrite` присваиваем
`TablesInsert<"trip_hotels">` (типовая проверка в тесте); валидная строка → `Hotel`; каждая из
повреждённых строк → ошибка разбора; numeric числом и строкой → каноническая строка; весь
`@tripplanner/shared` зелёный (`typecheck` + `test`).

### Шаг 6 — `mobile/`: фича `hotels` (api, хуки, карточка, блок) *(Тир 3)*

**Зависит от:** 3, 4, 5. **Блокирует:** 7, 8.
**Владеет файлами:** `mobile/src/features/hotels/**`.
**Что делать:** §1.6. Этот шаг владеет **всеми** хуками фичи, включая нужные только шагу 7
(`useHotelQuery`, мутации) — урок PLAN-04.
**НЕ делать:** `supabase-js` напрямую; копию классификатора ошибок; оптимистичные обновления;
логирование чего-либо кроме `operation`/`errorCode`; адрес/заметки/номер брони/стоимость в карточке;
календарную арифметику.
**Критерии готовности:** пять операций api покрыты; не-UUID `hotelId` → `notFound` **без вызова**
клиента; ноль затронутых строк → `notFound`; повреждённая строка → ошибка, не частичные данные;
тело insert содержит `source:"manual"` (AC-34); каждая мутация инвалидирует `hotelKeys.ofTrip`;
queryFn бросает `TripApiError` с `kind` (AC-39); карточка: состав, моно только у дат/времени,
время в зоне отеля при устройстве в третьей зоне, чип «все дни / частично, N дн.», при «Нет» чипа
нет (AC-35, AC-38); сортировка по `check_in_at`; guardrails `backend-only-behind-the-boundary` и
`no-credentials-in-logs` зелёные.

### Шаг 7 — `mobile/`: форма отеля S14/S14b и маршруты *(Тир 4)*

**Зависит от:** 2, 3, 4, 5, 6. **Блокирует:** 8, 9.
**Владеет файлами:** `mobile/src/features/hotel-form/**`,
`mobile/app/trips/[tripId]/hotels/new.tsx`, `mobile/app/trips/[tripId]/hotels/[hotelId].tsx`,
`mobile/app/_layout.tsx`, `mobile/__tests__/routes.contract.test.ts`,
`mobile/__tests__/navigation.test.tsx`.
**Что делать:** §1.7. После шага — процедура регенерации типов роутера (§3.0 п. 5).
**НЕ делать:** «Готово» в шапке и «Сохранить и добавить следующий» (AC-9); системный `Alert`;
подсчёт ночей/диапазона завтраков/проверку ссылки в `mobile` (только функции `shared`); сетевой
вызов ради ссылки (раскрытие, превью); `canOpenURL`; поле таймзоны; валюту по умолчанию;
выставление `source`; импорт внутренностей `trip-form`/`segment-form`/`trip-detail`; тесты внутри `app/`.
**Критерии готовности:** порядок полей AC-8; шапка AC-9; предзаполнение (город-поездка → город и
даты, времена пусты; страна/свободный текст → город пуст; без дат → даты пусты, строки ночей нет)
AC-10/11; город только из подсказок, ошибка «Выберите город из списка» AC-12; пикеры: один тап,
крестик, 15:00/11:00, минимум даты выезда = дата заезда AC-13; моно-роли AC-14; все ошибки сразу
после первой попытки сохранить, `danger` под полем AC-15/16; строка ночей появляется/обновляется/
скрывается (0 и неполные даты) AC-21; степпер завтраков: появление при «Частично», дефолт 1,
границы, приведение к границе при сужении дат AC-22/23; ссылка: принятие, строка «Ссылка
добавлена», «Открыть» → `Linking.openURL` с нормализованной ссылкой, отказ/ошибка открытия → текст
в форме, «×» очищает AC-24…AC-27; успешное сохранение закрывает форму AC-29; правка показывает
значения в зоне отеля, «Сохранить» активна AC-31; удаление через экранное подтверждение AC-32;
«Отель не найден» для неизвестного/чужого/не-UUID/удалённого AC-33; ошибка мутации — в форме, ввод
на месте, двойное нажатие = один вызов AC-40; «Закрыть без сохранения?» только при изменениях,
в т.ч. на свайп (`beforeRemove`) AC-41; сегмент-контролы AC-44; маршрут `hotels/[hotelId]` объявлен
в `Stack.Protected`, недостижим без сессии, контрактный тест зелёный; `typecheck` зелёный в основном
checkout'е после регенерации `.expo/types`.

### Шаг 8 — `mobile/`: блок «Отель» на S7 *(Тир 5)*

**Зависит от:** 6, 7.
**Владеет файлами:** `mobile/src/features/trip-detail/**`.
**Что делать:** §1.8.
**НЕ делать:** трогать блоки «Транспорт»/«Аренда авто»; считать что-либо на месте; менять
`EmptyBookingSection`.
**Критерии готовности:** 0 отелей → прежнее пустое состояние и скрытый «+» (AC-36); 2 отеля →
2 карточки по `check_in_at`, «+» в шапке виден (AC-35, AC-36, US-3); тап по карточке → маршрут
`trips/[tripId]/hotels/[hotelId]` с `hotelId` в `params` (real-route тест, AC-37); после
создания/удаления в форме S7 обновляется без ручного обновления (AC-29, AC-32).

### Шаг 9 — `mobile/`: демонтаж варианта `hotel` и guardrails *(Тир 6, первый)*

**Зависит от:** 7, 8.
**Владеет файлами:** `mobile/src/features/booking-form/**`,
`mobile/src/lib/i18n/locales/{ru,en}/bookingForm.ts`,
`mobile/src/lib/i18n/locales/{ru,en}/tripDetail.ts`, `mobile/__tests__/guardrails.test.ts`.
**Что делать:** §1.9.
**НЕ делать:** трогать вариант `car` по существу; удалять `titles.flight`/`a11y.*Passengers`;
ослаблять существующие правила «чтобы прошло»; удалять `PlaceholderField`.
**Критерии готовности:** `grep -rn "hotel" mobile/src/features/booking-form` пусто; `parity.test.ts`
зелёный; оба новых правила ловят нарочный пример и проходят на реальном дереве (AC-20, AC-24,
AC-48); `pnpm --filter @tripplanner/mobile test` и `typecheck` зелёные целиком (AC-47, AC-49).

### Шаг 10 — `e2e/`: поток «добавить отель → карточка на S7» *(Тир 6, второй; можно отложить)*

**Зависит от:** 8 (не зависит от 9).
**Владеет файлами:** `e2e/flows/hotel-stay.yaml`, `scripts/e2e.sh`, `e2e/insights.md`.
**Что делать:** вход (новый аккаунт) → создать поездку-**город из справочника с датами** → «Добавить
отель» → название → времена → «Сохранить» → карточка с названием на S7 → открыть → удалить →
пустое состояние. Все строки — `KEY=VALUE` в `scripts/e2e.sh`, в потоке литералов нет. Maestro не
установлен → авторится вслепую; **выбор времени** в пустом `TimePicker` теперь открывает нативный
контрол (коммит 640437d), а не ставит фолбэк — если он не поддаётся Maestro, шаги со временем уходят
в ручной чек-лист (M3), допущения — в `e2e/insights.md`.
**Критерии готовности:** поток без литералов UI; запускается `./scripts/e2e.sh hotel-stay`, **когда**
Maestro и симулятор доступны; иначе — явная запись «не запускался» в `e2e/insights.md`.

### Шаг 11 — документы дизайна, статусы, insights *(Тир 7)*

**Зависит от:** 1–10.
**Владеет файлами:** `design/screens/add-hotel.md`, `design/screens/trip-detail.md`,
`design/screens/navigation.md`, `mobile/AGENTS.md`, `shared/AGENTS.md`, `supabase/AGENTS.md`
(строки Status), `mobile/insights.md`, `shared/insights.md`, `supabase/insights.md`, `insights.md`.
**Что делать:** `add-hotel.md` — поля и порядок под AC-8, «Ссылка на карты» (белый список),
«Гостей», «Парковка», порядок вариантов завтрака, шапка без «Готово», степпер «Дней с завтраком»,
удаление, «Чего здесь нет» → «превью карты и раскрытие коротких ссылок»; `trip-detail.md` — карточка
отеля (AC-35), «Что есть сейчас»; `navigation.md` — маршрут `hotels/[hotelId]` реализован (строка 55
сейчас говорит «в коде ещё нет»). Статусы пакетов. По протоколу `engineering-insights` — только
существенное и неочевидное, после чтения и дедупликации; в multi-agent режиме implementer'ы
возвращают находки в отчёте, пишет их этот шаг.
**НЕ делать:** менять продуктовые требования в `design/`; переписывать `SPEC-05`.
**Критерии готовности:** ни одного пункта раздела спека «Документы дизайна, которые нужно обновить»
не осталось; статусы отражают таблицу `trip_hotels` и фичи `hotels`/`hotel-form`.

---

## 4. Definition of Done

**Автоматика (из корня, одной серией):**
```bash
pnpm install
pnpm -r typecheck
pnpm -r test
supabase start -x vector && supabase test db          # db reset — только с согласия владельца
supabase gen types typescript --local | diff - shared/src/db/database.types.ts   # пусто
cd mobile && npx expo config --type public
./scripts/e2e.sh hotel-stay                           # когда Maestro и симулятор доступны
```
Без `@ts-ignore` / `@ts-expect-error` / `eslint-disable` (guardrail).

**Ручной чек-лист (iOS, существующий dev-клиент — пересборка не нужна):**

| # | Проверка | AC |
|---|---|---|
| M1 | Сверка формы со скриншотом владельца: порядок полей, шапка без «Готово», одна кнопка «Сохранить» | AC-8, AC-9 |
| M2 | Авиарежим: форма целиком заполняется (подсказки города и валюты, ночи, завтраки, ссылка); сохранение — ошибка в форме, ввод на месте | Goal 3, AC-40 |
| M3 | Нативные пикеры: пустое время открывается на 15:00 / 11:00; календарь выезда не даёт день раньше заезда | AC-13 |
| M4 | Ссылка `maps.app.goo.gl/…` из Google Maps «Поделиться» → «Открыть» открывает Google Maps/Safari; `https://google.com.evil.tld/maps` → «Нужна ссылка Google Maps» | AC-24…AC-27 |
| M5 | Устройство в `Europe/Warsaw`, отель в `America/New_York`: карточка и правка показывают время отеля | AC-31, AC-35 |
| M6 | Два отеля в разных городах: две карточки по заезду | US-3, AC-35 |
| M7 | Светлая и тёмная тема: сегмент-контролы, ошибки `danger`, контраст ≥4.5:1 | AC-42, AC-43 |
| M8 | VoiceOver: радиогруппы парковки/завтраков произносят выбранное; «×» — «Убрать ссылку»; карточка — одной подписью | AC-43, AC-44 |
| M9 | Клавиатура не закрывает активное поле (заметки внизу формы) | AC-46 |
| M10 | Свайп вниз с правками → «Закрыть без сохранения?» внизу экрана | AC-41 |
| M11 | Второй аккаунт: чужой `hotelId` → «Отель не найден»; удаление поездки с отелями → отелей нет | AC-3, AC-5, AC-33 |
| M12 | Декларация сбора данных App Store Connect покрывает адреса/номера броней/заметки | §2 |
| M13 | Логи dev-клиента при ошибке: только операция и код, без ссылки, адреса, номера брони, id | AC-28 |
| M14 | ru и en: непереведённых ключей нет, «N ночей», «частично, N дн.» склоняются | AC-21, AC-45 |

### 4a. Трассируемость AC → шаг

| AC | Шаг(и) | AC | Шаг(и) | AC | Шаг(и) |
|---|---|---|---|---|---|
| 1 | 1 | 18 | 2 | 35 | 6, 8 |
| 2 | 1 | 19 | 2, 7 | 36 | 8 |
| 3 | 1 (+M11) | 20 | 2, 9 | 37 | 8 |
| 4 | 1 | 21 | 3, 7 | 38 | 6 |
| 5 | 1 | 22 | 2, 4, 7 | 39 | 6 |
| 6 | 1 | 23 | 2, 7 | 40 | 7 |
| 7 | 1, 5 | 24 | 2, 1, 9 | 41 | 7 |
| 8 | 7 | 25 | 2, 6, 7 | 42 | 4, 6, 7 |
| 9 | 7 | 26 | 7 | 43 | 4, 7 (+M7, M8) |
| 10 | 7 | 27 | 7 | 44 | 4, 7 |
| 11 | 7 | 28 | 6, 7 (+M13) | 45 | 3 |
| 12 | 2, 7 | 29 | 6, 7, 8 | 46 | 7 (+M9) |
| 13 | 4, 7 | 30 | 2 | 47 | 9 (guardrail) |
| 14 | 4, 6, 7 | 31 | 7 | 48 | 9 |
| 15 | 2, 7 | 32 | 6, 7, 8 | 49 | все (§4) |
| 16 | 2, 7 | 33 | 6, 7 | | |
| 17 | 2, 1 | 34 | 5, 6 | | |

### 4b. Стоп-лист implementer'а

1. Никаких таблиц, кроме `trip_hotels`; никакого `user_id` на ней; никаких правок применённых миграций.
2. Ничего против хостингового Supabase; `db reset` локально — только с согласия владельца.
3. `with check` на insert **и** update обязателен; каждая политика покрыта pgTAP.
4. `service_role`/секреты в `mobile/` — нигде.
5. `supabase-js` — только `src/lib/supabase/client.ts`; `trip_hotels` — только `features/hotels/api/`.
6. Ночи, диапазон завтраков, clamp, проверка ссылки, разбор суммы, UTC-сборка — только `shared`.
7. `new URL(...)` для проверки ссылки — нигде (ни в `shared`, ни в `mobile`).
8. Ни одного сетевого вызова ради ссылки; ни `canOpenURL`, ни превью, ни раскрытия коротких ссылок.
9. Ссылка, адрес, номер брони, заметки, id — не в логах и не в текстах ошибок.
10. Никакого системного `Alert`; подтверждения — in-tree overlay.
11. Никакого `Platform.OS`/`.ios.*`/`.android.*` вне `src/platform/**`.
12. Никаких строк UI вне `locales/**`; никаких hex/магических чисел/имён шрифтов вне `lib/theme`.
13. Моно — только даты, время, номер брони, сумма, код валюты. Гости, название, город, адрес — не моно.
14. Никакой конвертации валют, итогов, валюты по умолчанию или из профиля.
15. `source` из клиента — только `'manual'`.
16. Никаких проверок «отель вне дат поездки», нахлёстов, конфликтов с рейсами.
17. Никаких `@ts-ignore`/`@ts-expect-error`/`eslint-disable`; не ослаблять существующие guardrails.
18. Никаких новых нативных зависимостей, разрешений, ключей хранилища.
19. Не трогать вариант `car` у `booking-form` и блок «Аренда авто» по существу.
20. Тесты — вне `app/`.

---

## 5. Риски, допущения, расхождения, вопросы

**Допущения (если неверны — остановиться и спросить):**
- A-1. Только локальный Supabase; хостинговый проект не трогается.
- A-2. Приёмка на iOS; код кросс-платформенный, Android не проверяется.
- A-3. Строка отеля с `city_place_id`, которого нет в текущем справочнике, — **ошибка загрузки**
  (как неизвестный код аэропорта у сегментов): справочник только растёт, такой id означает
  повреждённую строку. Альтернатива «грузить по сохранённой `time_zone`, город пуст» сложнее и
  спеком не требуется.
- A-4. Деньги в домене — каноническая строка `"1234.50"`; арифметики над ними в этой фазе нет.

**Риски:**
- **R-1 (безопасность, средний).** Белый список хостов — точное равенство по ASCII; любая
  «удобная» ослабка (`endsWith("google.com")`, `includes`) открывает `evilgoogle.com`. Таблица
  тестов §1.2 — обязательная часть шага 2, а не пожелание. Регэксп БД — вторая линия.
- **R-2 (продуктовый).** Белый список спека не пускает национальные домены Google
  (`google.pl/maps`, `google.de/maps`), которые браузер отдаёт пользователю в Польше/Германии —
  такая вставка получит «Нужна ссылка Google Maps». Короткие ссылки из приложения Google Maps
  (`maps.app.goo.gl`) проходят. Расширение списка — решение владельца (правка `shared` + новая
  миграция для CHECK).
- **R-3 (технический).** Первое использование `Linking.openURL`: на симуляторе без Google Maps
  ссылка откроется в Safari — это ожидаемо. Отказ (`reject`) обрабатывается текстом в форме (M4).
- **R-4 (тестовый).** Форма большая и асинхронная: `renderWithProviders` async, фейковые таймеры у
  `renderRouter`, уничтожение мутаций перед `QueryClient.clear()`, FlatList/таймеры — см.
  `mobile/insights.md`. Тесты формы разрезаны на 2–3 файла (§1.7).
- **R-5 (данные).** Справочник мест содержит 100 городов — отель в городе вне справочника сохранить
  нельзя (Q5 спека, принято). Ожидаемый источник жалоб; расширение справочника — отдельная задача.
- **R-6 (инструментальный).** Maestro не установлен; шаг 10 авторится вслепую, ввод времени через
  нативный контрол может не поддаться (шаг 10 откладываемый, ручной M3 покрывает).

**Расхождения спека, дизайна и кода (не чиним молча):**
- **N-1.** AC-42 называет `bed` из Ionicons «для пустого состояния», а AC-36 требует «существующее
  пустое состояние», которое по `design/screens/trip-detail.md` рисует **иконку плюса** (так и в коде
  `EmptyBookingSection`). План следует AC-36 и дизайну: пустое состояние не меняется, `bed` не
  используется. См. Q-C.
- **N-2.** AC-25 ссылается на guardrail `no-backend-or-network` — он переименован в
  `backend-only-behind-the-boundary` (SPEC-02). Проверка та же.
- **N-3.** `design/screens/add-hotel.md` противоречит спеку (поля, «Готово», «карты») — документ
  правится шагом 11 под спек, как требует спек.
- **N-4.** `bookingForm:titles.hotel` удаляется (AC-48), поэтому заголовок формы берётся из нового
  `hotel:form.title`, а не из `bookingForm` (иначе шаг 9 сломает шаг 7).
- **N-5.** `tripDetail.hotel.*` в локалях — мёртвые ключи эпохи моков с другим форматом чипа
  («Завтрак: N из M дня»); AC-35 задаёт иной текст. Удаляются шагом 9, новые живут в `hotel:card.*`.
- **N-6.** `TimePicker` сейчас всегда открывается на 12:00 (константа `EMPTY_START`) — AC-13
  невыполним без нового пропа `startTime` (шаг 4).
- **N-7.** `Stepper` рисует значение моно-шрифтом; для «Гостей» это нарушает AC-14 → проп `mono`
  (шаг 4).

**Вопросы владельцу (все с вариантом по умолчанию; ни один не блокирует тир 1):**
- **Q-A. Режим выполнения.** *По умолчанию:* single-agent, по порядку. Тир 1 (шаги 1, 2, 3, 4)
  файл-непересекающийся и может идти четырьмя параллельными implementer'ами; шаги 9 и 10 тоже
  независимы между собой. Подтвердить.
- **Q-B. Как вводится валюта.** Спек не описывает контрол. *По умолчанию:* моно-поле на 3 буквы
  рядом с суммой + до 4 подсказок-кнопок из `CURRENCIES` по префиксу (как подсказки аэропортов);
  код вне списка — ошибка поля. Альтернатива — шторка со списком всех валют.
- **Q-C. Иконка `bed`** (N-1). *По умолчанию:* не используется, пустое состояние остаётся с плюсом.
- **Q-D. Состав `CURRENCIES`** — 40 кодов из §1.2. Подтвердить или дать свой список.

## Amendment 2026-09-24

Решения владельца после ручной проверки (см. «Поправка 2026-09-24» в SPEC-05, AC-50…AC-58); план выше НЕ переписан,
шаги 1-10 остаются исторической записью.
- **Схема/`shared`:** `check_in_at`/`check_out_at` заменены на `check_in_date`/`check_out_date` (`date`, обязательные) и
  `check_in_time`/`check_out_time` (`time`, необязательные); миграция `20260924100000_trip_hotels_date_time_split.sql`
  (19 ограничений), `countNights` удалён, остаётся `nightsBetweenDates`; ошибки `*.timeRequired` удалены.
- **Mobile (шаг 6 переделан):** одно поле-диапазон «Даты» + два необязательных поля времени вместо `StayDateTimeRow`;
  карточка S7 без зон; Q-B решён иначе: валюта — кнопка + нижняя шторка с поиском (не 3-буквенное поле с чипами).
- Q3 спека («время обязательно») развёрнут: время необязательно. Новый код: `StayDatesField`, `StayRangeCalendar`,
  `StayTimeField`, `CurrencySheet` в `mobile/src/features/hotel-form/components/`.
