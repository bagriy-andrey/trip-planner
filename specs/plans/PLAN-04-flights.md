# Implementation Plan: Транспорт — сегменты маршрута, мультигород и предупреждения (SPEC-04)

**Spec:** `specs/SPEC-04-flights.md` (Status: draft, 2026-09-22) — источник истины для WHAT.
Этот документ — только HOW: файлы, модули, порядок, команды, критерии готовности.
**Status:** planning
**Scope:** `supabase/` (таблица `trip_segments`, RLS, pgTAP), `shared/` (справочники аэропортов
и авиакомпаний, схема формы сегмента, доменная логика маршрута, регенерированные типы БД),
`mobile/` (api + хуки транспорта, форма сегмента S9/S9b, экран «Маршрут» S13, блок «Транспорт»
на S7, время в `platform/`, токены, строки ru/en, guardrails), `e2e/`, `scripts/e2e.sh`,
`design/` (tokens + screens), статусные строки `*/AGENTS.md`, `*/insights.md`.
**Platforms:** ios+android. iOS-only поведений нет и появляться не должно (AC-97). Новых нативных
зависимостей нет (AC-96): время выбирается тем же модулем, что и дата, за границей
`mobile/src/platform/datePicker.tsx` → **новая сборка dev-клиента не требуется**.
**Execution mode:** по умолчанию **single-agent, строго по порядку**. Тир 1 (шаги 1, 2, 4, 5)
файл-непересекающийся и может быть роздан четырём параллельным implementer'ам — **решение
владельца, см. §3.0 и вопрос Q-B в §5**.
**Решения `[NEEDS CLARIFICATION]` Q1–Q14 спека приняты по умолчанию**, как написано в спеке
(аэропорт только из справочника; номер рейса необязателен; одно место и один номер билета
на сегмент; названия авиакомпаний не локализуются; ICAO-форма номера отвергается; удаление
сегмента одноступенчатое, внизу формы правки; порог 48 ч; ≥300 аэропортов; ≥400 авиакомпаний;
пауза без прилёта не рисуется; названия перевозчика в карточке цепочки нет; «ближайший» — по вылету;
только локальный стенд Supabase).

---

## 0. Что уже существует (проверено чтением репозитория 2026-09-22)

| Артефакт | Фактическое состояние | Вывод для плана |
|---|---|---|
| `supabase/migrations/` | Ровно одна миграция `20260921193935_trips.sql`: таблица `trips`, её check-ограничения, индексы, функция `public.set_updated_at()` + триггер, 4 политики RLS `to authenticated` | Шаг 1 добавляет **вторую** миграцию; функцию `set_updated_at()` **переиспользует**, не создаёт заново; применённую миграцию не трогает |
| `supabase/tests/` | `trips_rls.test.sql` (25) + `trips_constraints.test.sql` (33) | Образец приёмов: фикстуры `auth.users` только с `id` + `email`; смена личности через `set local role` + `request.jwt.claims`; `anon` без политики даёт 0 строк на select/update/delete и `42501` на insert (`supabase/insights.md`) |
| `supabase/insights.md` (2026-09-22) | Уже содержит запись, написанную **заранее под этот спек**: `trip_segments` — первая таблица с владением ЧЕРЕЗ родителя; `user_id` на ребёнке дублировать нельзя; `exists(...)` обязателен и в `using`, и в `with check` | Прямое указание к §1.1. Перечитать перед шагом 1 |
| `shared/src/places/` | `schema.ts` (`cityRecordSchema` с одним `airportCode`, `countryRecordSchema`, `placeRecordSchema` = union по `kind`), `directory.ts` (267 записей: 197 стран + 70 городов), `search.ts` (`searchPlaces`, префикс, лимит 4), `fold.ts` (явная таблица фолдинга, без NFD — Hermes), `timeZone.ts` (`isValidTimeZone`) | Шаг 2 добавляет **третий** набор записей рядом, НЕ вливая аэропорты в `PLACES` (см. Q-A) |
| `shared/insights.md` (2026-09-22) | Запись «города моделируют ровно ОДИН `airportCode`; SPEC-04 нужна модель аэропорт-на-город» + «id мест хранятся в `trips.place_id`, не перенумеровывать» | Прямое указание к §1.2 и к AC-15a |
| `shared/src/trips/` | `errorCodes.ts` (стабильные id ошибок), `schemas.ts` (`parseTripForm` — ВСЁ в одном `.transform` с явными `path`, потому что zod 4 пропускает object-level `.check` при ошибке поля), `calendarDate.ts`, `status.ts`, `destination.ts` (`isValidTimeZone`) | Схема формы сегмента пишется по тому же образцу (один `transform`, идентификаторы ошибок) |
| `shared/src/db/database.types.ts` | Только `public.trips` | Регенерируется шагом 1 |
| `mobile/src/features/booking-form/` | `fields.ts` (`BOOKING_FORMS.flight` — 8 статичных полей, `STATIC_PASSENGERS = 2`), `BookingFormScreen.tsx`, `components/{BaggageToggle,PassengerStepper}.tsx` (инертные заглушки) | Вариант `flight`, `STATIC_PASSENGERS` и обе заглушки-компонента удаляются шагом 11 — **после** того как S9/S9b переехали на новую фичу (шаг 9) |
| `mobile/app/trips/[tripId]/flights/{new,[flightId]}.tsx` | Тонкие экраны, рендерят `BookingFormScreen variant="flight"` | Шаг 9 перенаправляет их на `features/segment-form`; маршруты уже объявлены в `Stack.Protected` и в `routes.contract.test.ts` |
| `mobile/src/features/trip-detail/` | `TripDetailContent.tsx` рисует три `BookingSection` с `EmptyBookingSection` внутри; «…»-меню и подтверждение — `SheetOverlay` (не системный `Alert`) | Шаг 10 переписывает только блок рейса; `BookingSection`/`EmptyBookingSection` переиспользуются; блоки отеля и авто не трогаются |
| `mobile/src/features/trips/index.ts` | Публично экспортирует `TripApiError`, `mapTripError`, `TripErrorKind`, `tripKeys`, хуки | Транспортный api **переиспользует** классификатор ошибок через публичную поверхность фичи, а не копирует его (см. R-5) |
| `mobile/src/features/trips/api/errors.ts` | Пять видов ошибок `notFound/offline/timeout/denied/unknown`; postgrest-js 2.x **не бросает** на обрыве сети, а резолвит `{error:{message:"AbortError…",code:""},status:0}` — классификатор читает и сообщение, и статус | Транспортный api ничего не переизобретает; тайм-аут 15 с уже в `lib/supabase/client.ts` (AC-84) |
| `mobile/src/lib/clock/` | `useToday(): CalendarDate` + guardrail `no-direct-clock-outside-clock` (прямой `new Date()` вне `lib/clock` запрещён) | AC-61 нужен **момент**, а не календарная дата → шаг 5 добавляет `useNow()` в ту же границу |
| `mobile/src/platform/datePicker.tsx` | Единственный импорт `@react-native-community/datetimepicker`; наружу только `CalendarDate`; на Android императивный диалог, на iOS компактный контрол; в jest один глобальный мок | Шаг 5 добавляет режим **времени** в тот же модуль (та же библиотека, `mode="time"`) — новой нативной зависимости нет (AC-96) |
| `mobile/src/lib/theme/` | `warnBg`, `warnBorder`, `danger` определены и **не используются ни одним экраном**; `layout.minTouch=44`, `radius`, `spacing`, `iconSize`; `tokens.test.ts` снимает снапшот каждого значения | Этот план — первый потребитель `warn*`/`danger`; новые размеры (линия цепочки, узлы 8/10, пунктир) сначала в `design/tokens.md`, потом в `metrics.ts` + снапшот (AC-87) |
| `mobile/src/components/Icon.tsx` + `icons.ts` | Feather через общий компонент; `plane`/`bed`/`car` — Ionicons `-outline` (во Feather их нет); иконка декоративна и скрыта из a11y-дерева | Новым иконкам (часы, стрелка маршрута, предупреждение, шеврон) искать имена **в Feather**; отсутствующее — так же зафиксировать в `Icon.test.tsx` |
| `mobile/__tests__/guardrails.test.ts` | 14 правил, среди них `backend-only-behind-the-boundary` (идентификатор `supabase` легален в `features/*/api`), `no-hex-…`, `no-font-names-…`, `no-cyrillic-outside-locales`, `no-platform-os-outside-platform`, `no-credentials-in-logs`, `no-service-role`, `no-direct-clock-outside-clock` | `features/transport/api/` легален без послаблений. Шаг 11 добавляет **одно** правило (AC-62) |
| `mobile/__tests__/routes.contract.test.ts` | Жёсткий список маршрутов (в нём уже есть `flights/new` и `flights/[flightId]`), `MAX_ROUTE_LINES = 40` | Шаг 8 добавляет ровно один: `/trips/[tripId]/route` |
| `mobile/app/_layout.tsx` | `Stack.Protected`: **незаявленный** маршрут остаётся НЕзащищённым (`mobile/insights.md` 2026-09-21) | Файл маршрута S13, его объявление и оба теста — один шаг 8 |
| `mobile/src/lib/i18n/` | `format.ts` (`formatShortDate/Time/…`, дефолтная зона **UTC** — карточка, забывшая передать зону, покажет неверное время), локали ru/en с namespace-файлами, `parity.test.ts` | Шаг 4 добавляет namespace `transport` и форматирование длительностей; `bookingForm.ts` остаётся за шагом 11 |
| `e2e/flows/` | `skeleton-smoke.yaml` (открывает S9 как заглушку), `trip-crud.yaml`; Maestro **не установлен**, потоки авторятся вслепую | Шаг 12: новый поток цепочки + правка smoke; допущения — в `e2e/insights.md` |
| `design/screens/{add-flight,route,trip-detail,navigation}.md`, `design/tokens.md` | Расхождения перечислены в спеке, раздел «Документы дизайна» (6 пунктов) | Токены — шаг 5 (до кода), экранные документы — шаг 13 |

---

## 1. Разбивка по модулям

Порядок раздела — от схемы к клиенту: `supabase/` → `shared/` → `mobile/` → `e2e/`.
Направление зависимостей: **миграция → типы БД → схемы `shared/` → api `mobile/` → экраны**.
Справочники `shared/` (аэропорты, авиакомпании) от БД **не зависят** и могут делаться параллельно
с миграцией; схема строки `trip_segments` зависит от обоих.

### 1.1 `supabase/` — вторая таблица, владение через родителя

Файл создаётся командой `supabase migration new trip_segments` (имя с временной меткой даёт CLI).

**DDL (контракт плана; синтаксис проверяется применением, не глазами):**

```sql
create table public.trip_segments (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references public.trips (id) on delete cascade,
  mode              text not null,
  source            text not null default 'manual',
  flight_number     text,
  carrier_code      text,
  from_airport_code text not null,
  from_time_zone    text not null,
  to_airport_code   text not null,
  to_time_zone      text not null,
  departure_at      timestamptz not null,
  arrival_at        timestamptz,
  baggage_included  boolean not null default false,
  passengers        smallint not null default 1,
  seat              text,
  ticket_number     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint trip_segments_mode        check (mode in ('flight','train','car','bus')),
  constraint trip_segments_source      check (source in ('manual','imported_pending','imported_confirmed')),
  constraint trip_segments_from_fmt    check (from_airport_code ~ '^[A-Z]{3}$'),
  constraint trip_segments_to_fmt      check (to_airport_code ~ '^[A-Z]{3}$'),
  constraint trip_segments_airports    check (from_airport_code <> to_airport_code),
  constraint trip_segments_from_tz_fmt check (from_time_zone ~ '^[A-Za-z][A-Za-z0-9_+-]*(/[A-Za-z0-9_+-]+)+$'),
  constraint trip_segments_to_tz_fmt   check (to_time_zone   ~ '^[A-Za-z][A-Za-z0-9_+-]*(/[A-Za-z0-9_+-]+)+$'),
  constraint trip_segments_arrival     check (arrival_at is null or arrival_at > departure_at),
  constraint trip_segments_duration    check (arrival_at is null
                                              or arrival_at - departure_at <= interval '48 hours'),
  constraint trip_segments_passengers  check (passengers between 1 and 9),
  constraint trip_segments_flight_no   check (flight_number is null
                                              or (char_length(flight_number) between 1 and 10
                                                  and flight_number !~ '\s')),
  constraint trip_segments_carrier_fmt check (carrier_code is null or carrier_code ~ '^[A-Z0-9]{2}$'),
  constraint trip_segments_carrier_src check (carrier_code is null or flight_number is not null),
  constraint trip_segments_seat_len    check (seat is null
                                              or (char_length(seat) <= 16
                                                  and btrim(seat, E' \t\r\n') <> '')),
  constraint trip_segments_ticket_len  check (ticket_number is null
                                              or (char_length(ticket_number) <= 32
                                                  and btrim(ticket_number, E' \t\r\n') <> ''))
);

create index trip_segments_trip_id_departure_at_idx
  on public.trip_segments (trip_id, departure_at);

create trigger trip_segments_set_updated_at
  before update on public.trip_segments
  for each row execute function public.set_updated_at();
```

Замечания, каждое из которых иначе будет переоткрыто вслепую:

- **`btrim(x)` снимает только U+0020** (`supabase/insights.md`), поэтому «непустое после обрезки» —
  это `btrim(x, E' \t\r\n') <> ''`, иначе место из одного таба пройдёт.
- IANA-зона в Postgres проверяется **только по форме** `Область/Место` (с поддержкой двухуровневых
  `America/Argentina/Buenos_Aires`). Полная проверка — в `shared/` через `Intl` (спек, «Модель данных»).
- `passengers` — `smallint` (диапазон 1…9), не `int`.
- Никаких `user_id`, `order_index`, денежных полей и названия авиакомпании в таблице (спек,
  «Чего в `trip_segments` сознательно нет»).
- Функция `public.set_updated_at()` уже создана миграцией `trips` — **переиспользовать**,
  не создавать вторую.

**RLS в той же миграции**, владение выводится через `trips` (`supabase/insights.md` 2026-09-22):

```sql
alter table public.trip_segments enable row level security;

create policy trip_segments_select_own on public.trip_segments for select to authenticated
  using (exists (select 1 from public.trips t
                 where t.id = trip_segments.trip_id and t.user_id = (select auth.uid())));

create policy trip_segments_insert_own on public.trip_segments for insert to authenticated
  with check (exists (select 1 from public.trips t
                      where t.id = trip_segments.trip_id and t.user_id = (select auth.uid())));

create policy trip_segments_update_own on public.trip_segments for update to authenticated
  using      (exists (select 1 from public.trips t
                      where t.id = trip_segments.trip_id and t.user_id = (select auth.uid())))
  with check (exists (select 1 from public.trips t
                      where t.id = trip_segments.trip_id and t.user_id = (select auth.uid())));

create policy trip_segments_delete_own on public.trip_segments for delete to authenticated
  using (exists (select 1 from public.trips t
                 where t.id = trip_segments.trip_id and t.user_id = (select auth.uid())));
```

`using` на `update` закрывает «взять чужой сегмент», `with check` — «положить свой сегмент в чужую
поездку» (AC-4, AC-5). Обе половины обязательны: одна без другой оставляет дыру. Все политики —
`to authenticated`, поэтому `anon` не получает ничего (AC-6). `(select auth.uid())` в обёртке —
требование планировщика (`supabase-backend`, правило 1).

**pgTAP:**

| Файл | Что доказывает |
|---|---|
| `supabase/tests/trip_segments_rls.test.sql` | AC-2 (владелец: select/insert/update/delete своего сегмента), AC-3 (второй пользователь: 0 строк на select, 0 затронутых на update/delete, ни одного поля чужой строки в выдаче), AC-4 (insert с чужим и с несуществующим `trip_id`), AC-5 (update, переносящий сегмент в чужую поездку), AC-6 (`anon`: 0 строк на три операции + `42501` на insert), AC-7 (удаление поездки → 0 сегментов; `delete from auth.users` → 0 сегментов) |
| `supabase/tests/trip_segments_constraints.test.sql` | AC-8: по одной падающей вставке на **каждое** ограничение из DDL выше (14 штук) плюс срабатывание дефолтов `source='manual'`, `passengers=1`, `baggage_included=false` и триггера `updated_at` (приём: вставить со старым `updated_at`, обновить, сравнить с `now()` — `now()` заморожен на транзакцию) |

**Генерация типов в том же шаге:**
`supabase gen types typescript --local > shared/src/db/database.types.ts` (AC-9). Рукописных типов
строки `trip_segments` в проекте не появляется. Ничего не выполняется против хостингового проекта.

### 1.2 `shared/` — справочники (шаг 2)

```
shared/src/places/schema.ts        + airportRecordSchema:
                                     { id: "airport-<iata lower>", kind: "airport", iata,
                                       ru, en, cityId, countryCode, timeZone, isPrimary }
                                   Схема аэропорта живёт рядом с городом/страной, но
                                   placeRecordSchema (union city|country) НЕ расширяется — см. Q-A
shared/src/places/airports.ts      ДАННЫЕ: ≥300 записей (AC-11). Все коммерческие аэропорты
                                   каждого города существующего справочника + крупные хабы +
                                   «ловушки» GRO/HHN/BVA/BGY/TRF. `as const satisfies readonly
                                   AirportRecord[]`
shared/src/places/directory.ts     + НОВЫЕ города под «ловушки» (Жирона, Хан, Бове, Бергамо,
                                   Сандефьорд) с собственными id, названиями, страной и зоной
                                   (AC-15a). Ни один существующий id НЕ меняется
shared/src/places/airportSearch.ts searchAirports(query, limit = 4): синхронная чистая функция.
                                   Совпадение с НАЧАЛА названия аэропорта, с начала названия его
                                   города (ru/en, через существующий foldForSearch) ИЛИ точное
                                   совпадение IATA (AC-16). Порядок: точный код → основной аэропорт
                                   города → длина совпавшего названия → id (детерминированно, AC-17).
                                   findAirportByCode(iata), primaryAirportOfCity(cityId),
                                   cityOfAirport(iata) — все синхронные (AC-18)
shared/src/places/index.ts         + новые экспорты
shared/src/airlines/schema.ts      airlineRecordSchema: { iata: /^[A-Z0-9]{2}$/, name, countryCode }
shared/src/airlines/airlines.ts    ДАННЫЕ: ≥400 записей (AC-19), один перевозчик на код (AC-20)
shared/src/airlines/flightNumber.ts normalizeFlightNumber(input): верхний регистр, удаление пробелов
                                   и дефисов; FLIGHT_NUMBER_PATTERN = /^[A-Z0-9]{2}[0-9]{1,4}[A-Z]?$/;
                                   parseFlightNumber(input) → { normalized, designator | null,
                                   valid } ; findAirline(designator) (AC-21…AC-23).
                                   Допустима ЛЕНИВАЯ карта код → запись при первом обращении;
                                   работы при импорте модуля быть не должно (Non-functional)
shared/src/airlines/index.ts       публичная поверхность
shared/src/places/__tests__/airports.test.ts, airportSearch.test.ts
shared/src/airlines/__tests__/flightNumber.test.ts, airlines.test.ts
```

Тесты целостности — это и есть приёмка данных (данные курируются вручную, ошибочная запись — дефект
данных, а не кода): формат и уникальность `iata`; уникальность `id`; существование `cityId`
в `PLACES`; известный `countryCode`; `timeZone` принимается `Intl` (**не** сравнивать с канонической
формой — `Asia/Ho_Chi_Minh` резолвится в `Asia/Saigon`, `shared/insights.md`); ровно один `isPrimary`
на город; `city.airportCode === iata` основного аэропорта и «город без `airportCode` не имеет
аэропортов» (AC-14); в наборе есть хотя бы один мультиаэропортный город (AC-13); зафиксированный
список существующих id городов не изменился (AC-15a).

### 1.3 `shared/` — сегменты: схема формы, строка, логика маршрута (шаг 3)

```
shared/src/segments/errorCodes.ts  SEGMENT_FIELD_ERROR (стабильные ИДЕНТИФИКАТОРЫ, не тексты, AC-37):
                                   "flightNumber.format" | "from.required" | "from.notInDirectory" |
                                   "to.required" | "to.notInDirectory" | "to.sameAsFrom" |
                                   "departure.dateRequired" | "departure.timeRequired" |
                                   "arrival.incomplete" | "arrival.notAfterDeparture" |
                                   "arrival.tooLong" | "passengers.range" | "seat.tooLong" |
                                   "ticketNumber.tooLong"  (+ isSegmentFieldErrorId)
shared/src/segments/time.ts        zonedDateTimeToInstant(date: CalendarDate, time: "HH:MM",
                                   zone) → Date. Реализация без библиотек: offsetAt(zone, instant)
                                   через Intl.DateTimeFormat(..., { timeZone, hourCycle: "h23" })
                                   .formatToParts → собранный UTC-момент минус instant; две итерации
                                   (AC-29). Несуществующее местное время → смещение ДО перехода,
                                   то есть момент уезжает вперёд на длину «дыры»; дважды
                                   существующее → ПЕРВОЕ вхождение. Обе ветки закреплены таблицей
                                   тестов (AC-30). instantToZonedParts(instant, zone) → { date, time }
                                   для предзаполнения и локальных дат (AC-42, AC-53, AC-55)
shared/src/segments/schemas.ts     segmentFormSchema + parseSegmentForm(input) — ОДНА схема
                                   на создание и правку (AC-77). ВСЯ валидация в одном
                                   .transform((raw, ctx) => …) с явными path (zod 4 пропускает
                                   object-level .check при ошибке поля — shared/insights.md).
                                   Нормализация: trim + схлопывание пробелов, номер рейса
                                   в верхний регистр без пробелов и дефисов, длины в КОДОВЫХ
                                   ТОЧКАХ (AC-35). Результат: { from/to: AirportRecord,
                                   departureAt: Date, arrivalAt: Date | null, flightNumber |
                                   null, carrierCode | null, baggageIncluded, passengers,
                                   seat | null, ticketNumber | null }.
                                   segmentRowSchema (разбор строки БД, AC-85) + toSegment(row):
                                   Segment; toSegmentWrite(value, tripId): поля БД snake_case,
                                   всегда mode:'flight', source:'manual' (AC-39)
shared/src/segments/route.ts       buildRoute({ segments, trip, now }) → RouteView:
                                     chain: RouteNode[]  (сегменты по departureAt ↑, при равенстве
                                                          по id — AC-47)
                                     gaps:  RouteGap[]   (между соседями; kind: "layover" |
                                                          "stopover", durationMs, risky,
                                                          days?, cityId? — AC-48…AC-54)
                                     warnings: RouteWarning[] (стабильные id + данные, AC-59)
                                     summary: { codes: string[], segments: n, layovers: m } (AC-60)
                                     closed: boolean, openAt?: { cityId, airportCode } (AC-56, AC-57)
                                     nearestSegmentId (AC-61; now — ИНЖЕКТИРУЕМЫЙ момент)
                                   Пороги LAYOVER_MAX_MS = 8 ч и RISKY_LAYOVER_MS = 1 ч 30 мин
                                   существуют ТОЛЬКО здесь (AC-62)
shared/src/segments/warnings.ts    SEGMENT_WARNING: "layover.risky" | "airport.mismatch" |
                                   "segments.overlap" | "segment.outsideTripDates" |
                                   "route.notClosed" + типы их данных
shared/src/segments/prefill.ts     nextSegmentPrefill(route, justSaved) → { fromAirport,
                                   toAirport | null, departureDate | null } (AC-41…AC-43);
                                   firstSegmentPrefill(trip) (AC-38)
shared/src/segments/index.ts       публичная поверхность
shared/src/index.ts                + export * from "./airlines" / "./segments"
shared/src/segments/__tests__/     time.test.ts (DST, линия перемены даты, ± смещения),
                                   form.test.ts (параметризован режимом create/edit),
                                   route.test.ts (ТАБЛИЦА случаев по обе стороны каждой границы),
                                   row.test.ts, prefill.test.ts
```

Правила скилла `zod`, обязательные здесь: `safeParse` для пользовательского ввода, сообщение =
идентификатор, `z.infer` вместо ручных типов, `z.unknown()` на входе разбора строки БД, ключи
необязательных полей формы объявляются как `z.unknown().optional()` и нормализуются внутри
`transform` (в zod 4 `nullish().transform().pipe()` не даёт опциональности — `shared/insights.md`).
Пакет остаётся runtime-нейтральным: `Intl` разрешён (ECMAScript, есть и в Hermes, и в Deno),
`supabase-js` / `react-native` / Node-API — нет (AC-18).

**Сравнения, которые нельзя перепутать** (два правила сознательно смотрят на разное):
«тот же аэропорт» между соседями — **по коду** (AC-51, AC-52); «маршрут замкнут» — **по городу**
аэропорта (AC-56). Тест обязан содержать пару JFK→LHR / LHR→LGA (замкнут, но с предупреждением
о другом аэропорте) и пару BCN→VIE / VIE→GRO (**не** замкнут).

### 1.4 `mobile/src/lib` и `src/platform` — границы (шаг 5)

```
src/platform/datePicker.tsx   + режим времени: <TimePicker value: "HH:MM" | null, onChange,
                              accessibilityLabel, placeholder?, testID? />. Та же библиотека
                              (mode="time"), тот же приём: на Android императивный
                              DateTimePickerAndroid.open, на iOS компактный контрол.
                              Новой нативной зависимости НЕТ (AC-96) → dev-клиент не пересобирается
src/platform/__tests__/       тест изоляции: экраны видят только нейтральный контракт
jest.setup.ts не трогаем — существующий мок библиотеки покрывает оба режима (проверить; если нет,
                              мок правится в этом же шаге и файл входит в список владения)
src/lib/clock/useNow.ts       useNow(): Date — момент для «ближайшего сегмента» (AC-61).
                              Обновляется по AppState (возврат из фона) и по минутному интервалу,
                              не по кадру. ЕДИНСТВЕННЫЙ легальный источник момента в src/
                              (guardrail no-direct-clock-outside-clock)
src/lib/clock/index.ts        + экспорт
src/lib/theme/metrics.ts      + layout.chainLine (ширина линии), layout.chainNode = 8,
                              layout.chainGapNode = 10, layout.dashBorderWidth (пунктир карточки
                              предупреждения) — значения СНАЧАЛА в design/tokens.md (AC-87)
src/lib/theme/__tests__/      обновлённый снапшот токенов
design/tokens.md              новые размеры + перепроверка контраста warnBg/warnBorder/danger
                              в обеих темах (первое использование этих токенов; если < 4.5:1,
                              чинятся ЗДЕСЬ, а не в компоненте)
```

### 1.5 `mobile/src/lib/i18n` — строки и форматирование (шаг 4)

```
locales/{ru,en}/transport.ts  НОВЫЙ namespace: подписи полей формы, пояснения, тексты четырёх
                              предупреждений, «Пересадка …», «N дней в <городе>» (мн. формы обеих
                              локалей!), «Маршрут не замкнут», «Добавить рейс из <города>»,
                              «Сегмент не найден», «Удалить рейс», «авиакомпания не распознана»,
                              «из справочника, офлайн», a11y-подписи (AC-92)
locales/{ru,en}/index.ts      + регистрация namespace
lib/i18n/format.ts            + formatDuration(locale, ms) → «1 ч 05 мин»; formatStopoverDays
                              (locale, days, cityName); formatSegmentDateTime(locale, instant,
                              timeZone) — зона ВСЕГДА передаётся явно (дефолт форматтеров — UTC,
                              карточка без зоны покажет неверное время, mobile/insights.md) (AC-93)
lib/i18n/__tests__/           format.test.ts (обе локали, устройство в третьей зоне),
                              parity.test.ts (плюрали: ключи `_one/_few/_many/_other` различаются
                              между ru и en — тест сверяет каждую локаль с её pluralCategories)
```

Namespace `bookingForm` в этом шаге **не трогается** — он принадлежит шагу 11.

### 1.6 `mobile/src/features/transport` — данные, цепочка, экран «Маршрут» (шаги 6 и 7)

```
api/segmentsApi.ts      ЕДИНСТВЕННЫЙ модуль, обращающийся к trip_segments через lib/supabase.
                        listSegments(tripId), getSegment(tripId, segmentId), createSegment,
                        updateSegment, deleteSegment. Каждая строка разбирается segmentRowSchema
                        из @tripplanner/shared; не разобранная строка → ошибка загрузки, НЕ
                        частичные данные (AC-85, AC-86). Ноль затронутых строк на update/delete →
                        kind "notFound" (AC-81). Номера билетов и мест НЕ логируются (AC-90/
                        Наблюдаемость, guardrail no-credentials-in-logs)
api/index.ts            поверхность api; классификатор ошибок и TripApiError импортируются
                        из @/features/trips (публичный index) — не копируются (R-5)
hooks/queryKeys.ts      segmentKeys = { all: ["segments"], ofTrip: (tripId) => ["segments", tripId],
                        one: (tripId, id) => ["segments", tripId, id] }
hooks/useSegmentsQuery.ts   один запрос на поездку (Non-functional: экран не ходит за каждым
                            сегментом); unwrap → throw, иначе retry в lib/query не сработает
hooks/useSegmentQuery.ts
hooks/useSegmentMutations.ts  create/update/delete; КАЖДАЯ инвалидирует segmentKeys.ofTrip И
                            tripKeys.one(tripId) (производные значения на S7 — AC-75).
                            Оптимистичных обновлений нет (AC-82)
hooks/useRouteView.ts   useMemo над buildRoute(segments, trip, useNow()) — пересчёт по изменению
                        данных, не по кадру прокрутки (Non-functional)
types.ts                view-модели карточек (никаких порогов и сравнений кодов — AC-62)
components/SegmentCard.tsx      компактная карточка: коды моно + Icon(стрелка) + шеврон; дата/время
                                моно в зоне СВОЕГО аэропорта; номер рейса справа (AC-64, AC-88)
components/GapRow.tsx           три вида паузы: пересадка, рискованная (чип warnBg + слово
                                «рискованно»), остановка (AC-65)
components/WarningRow.tsx       предупреждение рядом со своим элементом (AC-66)
components/RouteChain.tsx       линия, узлы (8 заполненный / 10 полый), порядок (AC-63);
                                декоративные узлы и линия скрыты из a11y-дерева (AC-91)
components/NotClosedCard.tsx    карточка warnBg + пунктир + кнопка «Добавить рейс из <города>» (AC-67)
components/RouteStates.tsx      скелетоны, ошибка + «Повторить», пусто, «Поездка не найдена»
                                (AC-68…AC-70)
components/TransportBlock.tsx   блок для S7: карточка ближайшего сегмента + строка-сводка + плашка
                                «не замкнут» (AC-71…AC-73); ровно ОДНА карточка при любом числе
                                сегментов (AC-72)
RouteScreen.tsx                 S13, тонкий: состояние из хуков, отрисовка из RouteView
index.ts                        публичная поверхность фичи (её читают app/ и features/trip-detail)
```

Фича **не** содержит ни одного порога, ни одного сравнения кодов аэропортов и ни одной
календарной арифметики — всё это приходит готовым из `shared` (AC-62, проверяется новым
guardrail-правилом на шаге 11).

### 1.7 `mobile/src/features/segment-form` — S9 и S9b (шаг 9)

```
SegmentFormScreen.tsx        один экран на создание и правку (props: tripId, segmentId?), ~тонкий
components/FlightNumberField.tsx   моно-поле первым; под ним строка перевозчика («… — из
                                   справочника, офлайн») и граница accent при распознавании;
                                   нейтральная строка при нераспознанном коде (AC-23, AC-24)
components/AirportField.tsx        значение = выбранная запись справочника; свободный текст
                                   не считается заполненным (AC-33); сообщение «выберите аэропорт
                                   из списка, можно искать по коду» (AC-34)
components/AirportSuggestions.tsx  до 4 подсказок из searchAirports (AC-16, AC-17), зона нажатия
                                   ≥44pt, непустые подписи (AC-90)
components/DepartureBlock.tsx      дата + время вылета (обязательные)
components/ArrivalBlock.tsx        дата + время прилёта + пояснение «необязательно, нужно только
                                   для расчёта стыковок» (AC-27, AC-28)
components/BaggageToggle.tsx       собственный, рабочий (заглушка booking-form удаляется шагом 11)
components/PassengerStepper.tsx    1…9, старт 1, кнопки отключаются на границах (AC-36)
hooks/formState.ts                 чистая редукция состояния формы + «изменено ли» (AC-40)
hooks/useSegmentForm.ts            parseSegmentForm → мутация → навигация; «Готово» (AC-45),
                                   «Сохранить и добавить следующий» (AC-41…AC-44, AC-46),
                                   «Удалить рейс» с экранным подтверждением (SheetOverlay-образец,
                                   не системный Alert — AC-78, AC-79)
index.ts
app/trips/[tripId]/flights/new.tsx       → SegmentFormScreen (режим создания)
app/trips/[tripId]/flights/[flightId].tsx → SegmentFormScreen (режим правки) + «Сегмент не найден»
```

Порядок полей — ровно как в AC-25, и ни одного поля сверх `design/screens/add-flight.md`.
Ошибки сохранения показываются ВНУТРИ формы с сохранением ввода и повтором одним нажатием (AC-83).

### 1.8 `e2e/` (шаг 12)

Новый поток `e2e/flows/segment-chain.yaml` (AC-99) + пересмотр шагов `skeleton-smoke.yaml`,
которые «просто открывают и закрывают» S9. Все строки — через `scripts/e2e.sh` (в потоке
литералов интерфейса нет). Maestro не установлен → поток авторится вслепую, допущения
(особенно ввод **времени** через нативный контрол) фиксируются в `e2e/insights.md`; если ввод
времени окажется неуправляемым, шаги с временем уходят в ручной чек-лист (AC-100).

---

## 2. Изменения зависимостей

| Что | Куда | Решение |
|---|---|---|
| Новые npm-пакеты | — | **Ни одного.** Ни tz-библиотеки (`luxon`/`date-fns-tz`): смещение зоны считается через `Intl` в `shared/src/segments/time.ts`, а новая зависимость должна быть runtime-нейтральной и не тащить локали в Hermes. Ни `FlashList` (цепочка — десятки строк) |
| Нативные модули | — | **Ни одного** (AC-96). Время выбирается уже установленным `@react-native-community/datetimepicker` в режиме `time` → **новой сборки dev-клиента не требуется**. Если при реализации выяснится, что нужен новый нативный пакет — это **изменение объёма**: остановиться, сообщить владельцу (новая сборка + пересмотр `PrivacyInfo.xcprivacy`, спек, «Mobile considerations») |
| Миграции БД | `supabase/migrations/<ts>_trip_segments.sql` | Одна: таблица + ограничения + индекс + триггер + RLS + 4 политики, **всё в одном файле**; pgTAP в том же шаге; сразу после применения — регенерация `shared/src/db/database.types.ts`. Применённую миграцию не редактировать |
| Переменные окружения | — | Ни одной новой. `service_role` в клиенте не появляется (AC-10) |
| Разрешения / privacy manifest | — | Ни одного нового разрешения, ни одной `NS*UsageDescription`, манифест не пересматривается (нет новых нативных зависимостей). Появление любого — отклонение от спека |
| Локальное хранилище | — | Ни одного нового ключа в `src/lib/storage/keys.ts`; номера билетов и места на устройство не пишутся |
| Контракт `@tripplanner/shared` | расширяется | Аэропорты, авиакомпании, схемы сегмента, логика маршрута, тип строки `trip_segments`. Потребитель сегодня один — `mobile/`; Edge Functions и `web/` этот план не вводит, значит «обновить всех потребителей в том же плане» выполняется автоматически |
| App Store | декларация данных | Приложение начинает хранить более чувствительный контент (номера билетов, места). Перепроверка декларации сбора данных — обязанность релизного спека; здесь фиксируется как пункт ручного чек-листа (M14) |

---

## 3. Порядок выполнения

### 3.0 Режим выполнения и правило непересечения

13 шагов, 8 тиров. Списки файлов шагов **не пересекаются** ни в одном месте (единственная
намеренная тонкость: `mobile/src/lib/i18n/**` принадлежит шагу 4 **кроме**
`locales/{ru,en}/bookingForm.ts`, который принадлежит шагу 11).

| Тир | Шаги | Зависит от |
|---|---|---|
| 1 | 1, 2, 4, 5 (взаимно независимы) | — |
| 2 | 3 | 1 (типы БД), 2 (справочники) |
| 3 | 6 | 3 |
| 4 | 7 | 4, 5, 6 |
| 5 | 8 | 7 |
| 6 | 9 | 8 (маршруты объявлены), 3, 4, 5, 6 |
| 7 | 10 | 7, 9 |
| 8 | 11 → 12, 13 | 9, 10 |

**Четыре правила порядка (нарушить — получить красный CI между шагами):**

1. **Миграция раньше схем.** `shared/src/segments/schemas.ts` типизируется от сгенерированной
   строки `trip_segments`; шаг 3 без шага 1 не компилируется.
2. **Заглушка `booking-form` умирает последней.** `BOOKING_FORMS.flight` и `STATIC_PASSENGERS`
   удаляются только на шаге 11, когда оба маршрута `flights/*` уже ведут на новую фичу (шаг 9).
3. **Файл маршрута и его объявление — один шаг.** `app/trips/[tripId]/route.tsx` без строки
   в `Stack.Protected` остаётся НЕзащищённым (`mobile/insights.md` 2026-09-21), а
   `routes.contract.test.ts` краснеет на любом новом файле в `app/`. Поэтому файл маршрута,
   `app/_layout.tsx`, `navigation.test.tsx` и `routes.contract.test.ts` — **шаг 8**, целиком.
4. **Токены раньше экранов.** Новые размеры цепочки сначала в `design/tokens.md` и в теме (шаг 5),
   и только потом рисуются (шаг 7). Иначе появится «магическое число» и красный guardrail.

**После любого шага, добавляющего файл в `app/`** (шаг 8): в основном checkout'е сгенерированный
`.expo/types/router.d.ts` протухает и `pnpm typecheck` краснеет на корректных href. Лечение —
один запуск `npx expo start` (или удаление gitignored-файла), затем `git checkout --`
для `mobile/.gitignore` и `expo-env.d.ts` (`mobile/insights.md` 2026-09-22).

---

### Шаг 1 — `supabase/`: миграция `trip_segments`, RLS, pgTAP, типы БД *(Тир 1)*

**Зависит от:** ничего (нужны Supabase CLI + Docker). **Блокирует:** шаг 3.

**Владеет файлами:** `supabase/migrations/<timestamp>_trip_segments.sql`,
`supabase/tests/trip_segments_rls.test.sql`, `supabase/tests/trip_segments_constraints.test.sql`,
`shared/src/db/database.types.ts`.

**Что делать:** §1.1. Перед началом перечитать `supabase/insights.md` (запись 2026-09-22 про
владение через родителя написана заранее именно под этот шаг).

```bash
supabase start -x vector                 # -x vector обязателен на Rancher Desktop
supabase migration new trip_segments     # имя файла даёт CLI
# … DDL + индекс + триггер + RLS + 4 политики в созданный файл …
supabase db reset                        # ЛОКАЛЬНЫЙ стенд; из worktree бьёт по общему стенду!
supabase test db
supabase gen types typescript --local > shared/src/db/database.types.ts
```

**НЕ делать:** ни колонки `user_id` на сегменте; ни таблиц отеля/авто/документов; ни денежных полей
и валюты; ни поля порядка в цепочке; ни одного действия против **хостингового** проекта
(`db push`, дашборд); не редактировать миграцию `trips` и `config.toml`.

**Критерии готовности:**
- `supabase db reset` на чистом стенде применяет обе миграции без ошибок (AC-1).
- `supabase test db` зелёный: каждая из четырёх политик покрыта тремя личностями
  (владелец / другой пользователь / `anon`), плюс insert с чужим и несуществующим `trip_id`,
  плюс update-перенос в чужую поездку, плюс оба каскада (AC-2…AC-7).
- Отказ RLS виден как **ноль строк**, а не как ошибка (кроме insert под `anon` — там `42501`).
- По падающей вставке на каждое ограничение DDL; дефолты и триггер `updated_at` проверены (AC-8).
- Повторная `supabase gen types typescript --local` не даёт диффа; `pnpm -r typecheck` зелёный (AC-9).

---

### Шаг 2 — `shared/`: справочники аэропортов и авиакомпаний *(Тир 1)*

**Зависит от:** ничего. **Блокирует:** шаг 3.

**Владеет файлами:** `shared/src/places/schema.ts`, `shared/src/places/airports.ts`,
`shared/src/places/airportSearch.ts`, `shared/src/places/directory.ts`,
`shared/src/places/index.ts`, `shared/src/airlines/**`,
`shared/src/places/__tests__/{airports,airportSearch}.test.ts`.

**Что делать:** §1.2. Перед началом перечитать `shared/insights.md` (записи про `airportCode`,
про неизменяемость id мест и про `Intl` и таймзоны).

**НЕ делать:** не добавлять аэропорты в массив `PLACES` и не расширять `placeRecordSchema`
(см. Q-A: `searchPlaces` на S8 обязана продолжать возвращать только города и страны, а
`trips.place_kind` в БД допускает только `city|country|custom`); не перенумеровывать существующие
id городов; не трогать `shared/src/trips/**` и `shared/src/auth/**`; не вводить метро-коды
(LON/PAR/NYC/MOW/TYO/MIL) — спек запрещает их прямо; не локализовать названия авиакомпаний;
не звать ни одного внешнего источника (набор курируется вручную).

**Критерии готовности (`pnpm --filter @tripplanner/shared test` + `typecheck`):**
- Аэропортов ≥300; у каждого города справочника с `airportCode` есть минимум один аэропорт (AC-11).
- Схема записи, уникальность `id` и `iata`, `kind: "airport"` (AC-12).
- Ровно один `isPrimary` на город; в наборе есть минимум один мультиаэропортный город (AC-13).
- Перекрёстная сверка `city.airportCode` ↔ `iata` основного аэропорта; город без `airportCode`
  не имеет аэропортов (AC-14).
- Целостность: формат IATA, существование `cityId`, известный `countryCode`, `timeZone` принимается
  `Intl`, непустые ru/en (AC-15); GRO/HHN/BVA/BGY/TRF ссылаются на **новые собственные** города,
  список существующих id городов не изменился (AC-15a).
- Поиск: «Жир» → GRO; «Barcel» → BCN первым + остальные аэропорты Барселоны; «GRO» → GRO;
  «rcel» → пусто; не более 4; повторный вызов даёт тот же список (AC-16, AC-17).
- Авиакомпаний ≥400, у каждой три поля; designator уникален и соответствует `^[A-Z0-9]{2}$`
  (отдельный кейс на `9W`); названия не дублируются (AC-19, AC-20).
- Разбор номера: «lo 1234» / «LO-1234» / «LO1234» → `LO` + «LOT Polish Airlines»; валидны `LO1`,
  `LO1234`, `BA667A`, `9W123`, `U2101`; невалидны `LO`, `LO12345`, `LOT400`, `L`, `LO12AB`;
  пустая строка валидна (AC-21, AC-22).
- Функции синхронны, детерминированы, без запрещённых импортов; при импорте модуля работы
  не выполняется (AC-18).

---

### Шаг 3 — `shared/`: схема сегмента, время и логика маршрута *(Тир 2)*

**Зависит от:** шаги 1 (типы БД) и 2 (справочники).

**Владеет файлами:** `shared/src/segments/**`, `shared/src/index.ts`.

**Что делать:** §1.3.

**НЕ делать:** не писать в `shared` ни одной пользовательской строки (только идентификаторы);
не добавлять зависимость для работы с таймзонами; не вводить настройку порогов; не блокировать
сохранение из-за предупреждения (предупреждение — информация, а не валидация); не трогать
`shared/src/trips/**`.

**Критерии готовности:**
- Схема формы: по одному падающему случаю на каждое из четырёх обязательных значений (AC-26);
  сегмент без прилёта валиден (AC-27); оба неполных прилёта → `arrival.incomplete` (AC-28);
  прилёт = вылету и прилёт < вылета → `arrival.notAfterDeparture`, 48 ч ок / 48 ч 1 мин →
  `arrival.tooLong` (AC-31); одинаковые аэропорты → `to.sameAsFrom` (AC-32); текст без выбора
  из справочника → `*.notInDirectory` (AC-33); нормализация и длины 16/32 в кодовых точках,
  строка из пробелов = пусто (AC-35); счётчик 1…9 (AC-36); список идентификаторов ошибок
  зафиксирован литеральным списком в тесте (AC-37); тесты параметризованы режимом create/edit (AC-77).
- Время: пары «локальные дата+время+зона → UTC-момент» для зон с положительным и отрицательным
  смещением (AC-29); таблица DST — несуществующий и дважды существующий час (AC-30); рейс
  Токио → Лос-Анджелес (прилёт «раньше» по настенным часам) не ловится ограничением 48 ч.
- Маршрут: перемешанный вход → стабильная цепочка, два одинаковых `departureAt` → детерминированный
  порядок (AC-47); пауза считается по UTC-моментам между разными зонами, без прилёта — паузы
  нет (AC-48); границы 7 ч 59 / ровно 8 ч (AC-49) и 1 ч 29 / ровно 1 ч 30 (AC-50); JFK→LGA
  и BCN→GRO дают несовпадение аэропортов, а не пересадку (AC-51, AC-52) — в том числе когда
  прилёт неизвестен; 30 ч через полночь → «1 день», 11 ч внутри одних суток → часы (AC-53);
  отрицательная разность → предупреждение о пересечении и неотрицательная длительность (AC-54);
  границы дат поездки «ровно в день начала/конца» → без предупреждения, поездка без дат → никогда
  (AC-55); JFK→LHR/LHR→LGA замкнут, BCN→VIE/VIE→GRO не замкнут, BCN→VIE/VIE→BCN замкнут (AC-56);
  данные «не замкнут» несут город и основной аэропорт (AC-57); один сегмент и пустой маршрут
  (AC-58); список идентификаторов предупреждений и их порядок зафиксированы (AC-59); сводка
  `KRK · OPO · BCN · VIE` со склейкой дублей (AC-60); «ближайший» на трёх раскладках при
  инжектируемом `now` (AC-61).
- Разбор строки БД: `toSegment` на валидной строке; повреждённая строка (неизвестный `mode`,
  битая зона) → ошибка разбора (AC-85, AC-86).
- `toSegmentWrite` всегда пишет `mode:'flight'`, `source:'manual'` (AC-39).
- Предзаполнение: четыре случая первого сегмента (город с аэропортом, страна, свободный текст,
  поездка без дат — AC-38) и цепочка (AC-41…AC-43, включая прилёт после полуночи по местному).

---

### Шаг 4 — `mobile/`: строки ru/en и форматирование длительностей *(Тир 1)*

**Зависит от:** ничего.

**Владеет файлами:** `mobile/src/lib/i18n/locales/{ru,en}/transport.ts`,
`mobile/src/lib/i18n/locales/{ru,en}/index.ts`, `mobile/src/lib/i18n/format.ts`,
`mobile/src/lib/i18n/__tests__/**`. **Не владеет** `locales/{ru,en}/bookingForm.ts` (шаг 11).

**Что делать:** §1.5.

**НЕ делать:** не удалять ключи `bookingForm.*` (их ещё читает заглушка); не склеивать даты
и длительности вручную (всё через `Intl` и i18next); не оставлять ни одного ключа без пары
в другой локали.

**Критерии готовности:** `parity.test.ts` зелёный, включая плюральные формы обеих локалей
(ru: `_one/_few/_many/_other`, en: `_one/_other`) для «N дней в \<городе\>»; `format.test.ts`
проверяет «1 ч 05 мин» в обеих локалях и то, что сегмент, показанный на устройстве в третьей
зоне, сохраняет местное время своего аэропорта (приём подмены зоны устройства — обёртка
`Intl.DateTimeFormat`, `mobile/insights.md`) (AC-92, AC-93).

---

### Шаг 5 — `mobile/`: выбор времени, источник момента, токены цепочки *(Тир 1)*

**Зависит от:** ничего.

**Владеет файлами:** `mobile/src/platform/datePicker.tsx`, `mobile/src/platform/__tests__/**`,
`mobile/src/lib/clock/**`, `mobile/src/lib/theme/**`, `design/tokens.md`.

**Что делать:** §1.4.

**НЕ делать:** не устанавливать новую нативную зависимость (если выяснится, что она нужна —
остановиться и сообщить: это изменение объёма, §2); не писать `Platform.OS` вне `src/platform/`;
не добавлять цветовых литералов — недостающий токен сначала в `design/tokens.md`.

**Критерии готовности:** компонент выбора времени изолирован и подменяем одним моком (AC-96);
`useNow()` — единственный источник момента, guardrail `no-direct-clock-outside-clock` зелёный;
`design/tokens.md` содержит новые размеры и датированную запись о проверке контраста
`warnBg`/`warnBorder`/`danger`; снапшот токенов обновлён; `pnpm --filter @tripplanner/mobile test`
зелёный (AC-87).

---

### Шаг 6 — `mobile/`: api и хуки транспорта *(Тир 3)*

**Зависит от:** шаг 3.

**Владеет файлами:** `mobile/src/features/transport/api/**`, `mobile/src/features/transport/hooks/**`,
`mobile/src/features/transport/types.ts` и их `__tests__`.

**Что делать:** §1.6 (верхняя половина). Клиент Supabase в тестах мокается по образцу
`features/trips/api/__tests__/tripsApi.test.ts`.

**НЕ делать:** не импортировать `supabase-js` напрямую (только через `@/lib/supabase`);
не создавать `index.ts` фичи (он принадлежит шагу 7); не писать оптимистичных обновлений
и очередей; не логировать `ticket_number`, `seat`, коды аэропортов и идентификаторы.

**Критерии готовности:** пять операций покрыты тестами; тело запроса на создание содержит
`mode:'flight'`, `source:'manual'` и нормализованные значения (AC-39); повреждённая строка →
ошибка загрузки (AC-85, AC-86); ноль затронутых строк на update/delete → `notFound` (AC-81);
мок зависшего запроса упирается в тайм-аут 15 с клиента `lib/supabase` (AC-84); каждая мутация
инвалидирует `segmentKeys.ofTrip` и `tripKeys.one` (AC-75); при ошибке состояние не меняется
(AC-82); guardrail границы зелёный (AC-10).

---

### Шаг 7 — `mobile/`: цепочка, блок-компоненты и экран «Маршрут» (S13) *(Тир 4)*

**Зависит от:** шаги 4, 5, 6.

**Владеет файлами:** `mobile/src/features/transport/components/**`,
`mobile/src/features/transport/RouteScreen.tsx`, `mobile/src/features/transport/index.ts`,
`mobile/src/features/transport/__tests__/**`.

**Что делать:** §1.6 (нижняя половина).

**НЕ делать:** не писать в `mobile/` ни одного порога (8 ч, 1 ч 30 мин), ни одного сравнения кодов
аэропортов, ни вычисления замкнутости — всё приходит из `buildRoute`; не показывать всю цепочку
в `TransportBlock`; не рисовать паузу, когда у предыдущего сегмента нет прилёта (Q11);
не использовать текстовые символы вместо иконок; цвет не должен быть единственным носителем
смысла «рискованно».

**Критерии готовности:** порядок и состав элементов цепочки (AC-63); состав карточки сегмента,
типографические роли (моно только у билетных данных), переход по тапу (AC-64, AC-88); три вида
паузы, включая чип `warnBg` со словом «рискованно» и полый узел `warnBorder` (AC-65); каждое
из четырёх предупреждений рядом со своим элементом (AC-66); карточка «не замкнут» с переходом
в форму с предзаполненным «Откуда» (AC-67); пустое состояние без единого предупреждения (AC-68);
скелетоны при первой загрузке и ошибка с «Повторить» — разные экраны (AC-69); чужой и
несуществующий `tripId` → то же «Поездка не найдена», что и на S7 (AC-70); непустые подписи,
роли и зоны ≥44pt у всех новых интерактивных элементов, декоративные узлы скрыты (AC-89…AC-91).

---

### Шаг 8 — `mobile/`: маршрут `/trips/[tripId]/route`, гейтинг, контрактные тесты *(Тир 5)*

**Зависит от:** шаг 7.

**Владеет файлами:** `mobile/app/trips/[tripId]/route.tsx`, `mobile/app/_layout.tsx`,
`mobile/__tests__/routes.contract.test.ts`, `mobile/__tests__/navigation.test.tsx`.

**Что делать:** тонкий экран (`<RouteScreen />` + чтение `tripId` из параметров, ≤40 строк);
`<Stack.Screen name="trips/[tripId]/route" …>` **внутри** `Stack.Protected` (незаявленный маршрут
остаётся незащищённым); добавить путь в `SPEC_ROUTES`; переписать навигационные тесты. После шага —
процедура регенерации `.expo/types` из §3.0.

**НЕ делать:** не переименовывать существующие маршруты; не собирать href шаблонной строкой
(только `{ pathname, params }` — expo-router сам кодирует сегменты, предварительно кодировать
не нужно).

**Критерии готовности:** `routes.contract.test.ts` зелёный с ровно одним новым маршрутом;
`navigation.test.tsx` доказывает, что без сессии маршрут недостижим (AC-94) и что `tripId`
попадает в `params`, а не в путь (AC-95); `pnpm --filter @tripplanner/mobile typecheck` зелёный
в основном checkout'е (после регенерации типов роутера).

---

### Шаг 9 — `mobile/`: форма сегмента S9 и S9b *(Тир 6)*

**Зависит от:** шаги 3, 4, 5, 6, 8.

**Владеет файлами:** `mobile/src/features/segment-form/**`,
`mobile/app/trips/[tripId]/flights/new.tsx`, `mobile/app/trips/[tripId]/flights/[flightId].tsx`.

**Что делать:** §1.7.

**НЕ делать:** не добавлять чекбокс «туда-обратно» (спек запрещает прямо); не добавлять выбор вида
транспорта, валюты, цены, полей на каждого пассажира; не принимать свободный текст как аэропорт;
не блокировать сохранение из-за предупреждения; не использовать системный `Alert` ни для ошибок,
ни для подтверждения удаления; не звать сеть ради подсказки.

**Критерии готовности:** состав и порядок полей ровно как в AC-25; кнопка сохранения неактивна,
пока не заполнены четыре обязательных значения (AC-26); пояснение под прилётом (AC-27);
распознавание перевозчика с границей `accent` и пометкой «из справочника, офлайн», api не
вызывается (AC-24); нейтральная строка при нераспознанном коде (AC-23); сообщение «выберите
аэропорт из списка» и неактивное сохранение при «Козятин» (AC-34); счётчик 1…9 и **отсутствие**
константы статичного числа пассажиров в коде (AC-36); предзаполнение первого сегмента в четырёх
случаях (AC-38); «Сохранить и добавить следующий»: `from` = `to` предыдущего, дата из прилёта
(или вылета), `to` — аэропорт начала маршрута либо пусто, ошибка оставляет пользователя в форме
(AC-41…AC-44); «Готово» возвращает на экран, откуда пришли, с обновлённой цепочкой (AC-45);
двойное нажатие → ровно один вызов api (AC-46); правка предзаполняет всё, включая пустой прилёт
(AC-76); одна схема на оба режима (AC-77); удаление только после экранного подтверждения (AC-78),
после успеха — возврат с пересчитанной цепочкой (AC-79); «Сегмент не найден» на несуществующем,
чужом, из другой поездки и некорректном `flightId` (AC-80, AC-81); ошибка мутации показана
в форме с сохранённым вводом и повтором одним нажатием (AC-83); закрытие спрашивает подтверждение
только при изменениях (AC-40).

---

### Шаг 10 — `mobile/`: блок «Транспорт» на деталях поездки (S7) *(Тир 7)*

**Зависит от:** шаги 7 и 9.

**Владеет файлами:** `mobile/src/features/trip-detail/**`.

**Что делать:** заменить блок «Рейс» блоком «Транспорт» (`TransportBlock` из
`@/features/transport`), добавить переход на «Маршрут» и плашку «не замкнут». Блоки отеля и авто
**не трогать**: они остаются ровно такими же.

**НЕ делать:** не рисовать всю цепочку на S7; не считать ничего на месте (сводка, ближайший,
предупреждения приходят из `buildRoute`); не ломать пустое состояние с пунктирной рамкой.

**Критерии готовности:** состав блока при 1 и при 4 сегментах (AC-71); ровно одна карточка при
четырёх сегментах (AC-72); плашка «не замкнут» и переход по тапу (AC-73); при нуле сегментов —
прежнее пустое состояние (AC-74); после создания/правки/удаления блок и «Маршрут» обновляются
без ручного обновления (AC-75).

---

### Шаг 11 — `mobile/`: демонтаж заглушки рейса, ключи и guardrails *(Тир 8, первый)*

**Зависит от:** шаги 9 и 10.

**Владеет файлами:** `mobile/src/features/booking-form/**`,
`mobile/src/lib/i18n/locales/{ru,en}/bookingForm.ts`, `mobile/__tests__/guardrails.test.ts`.

**Что делать:** удалить вариант `flight` из `BOOKING_FORMS`, константу `STATIC_PASSENGERS`
и компоненты-заглушки `BaggageToggle`/`PassengerStepper` (у новой формы свои); оставить заглушки
`hotel` и `car` ровно в текущем виде; удалить ключи `bookingForm.flight.*`; переписать
`BookingFormScreen.test.tsx` под два оставшихся варианта; добавить **одно** новое guardrail-правило
(AC-62): в `mobile/app/**` и `mobile/src/**` нет литералов порогов 8 ч / 1 ч 30 мин в миллисекундах
или минутах и нет сравнений кодов аэропортов. Правило пишется с учётом того, что любое
`mobile-all`-правило сканирует и сам `guardrails.test.ts` — иглу собирать из частей.

**НЕ делать:** не ослаблять и не удалять ни одного существующего правила «чтобы прошло»;
не трогать формы отеля и авто по существу.

**Критерии готовности:** `pnpm --filter @tripplanner/mobile test` зелёный целиком, включая
`parity.test.ts` без ключей `bookingForm.flight.*`; новое правило падает на нарочно внесённом
литерале порога и проходит на реальном дереве (AC-62, AC-98).

---

### Шаг 12 — `e2e/`: поток цепочки и пересмотр smoke *(Тир 8, второй)*

**Зависит от:** шаги 9 и 10.

**Владеет файлами:** `e2e/flows/segment-chain.yaml`, `e2e/flows/skeleton-smoke.yaml`,
`scripts/e2e.sh`, `e2e/insights.md`.

**Что делать:** §1.8. Поток AC-99: вход → создать поездку → добавить рейс туда → «Сохранить
и добавить следующий» → сохранить обратный → «Маршрут» → два сегмента и **нет** карточки «не
замкнут» → открыть сегмент → удалить → карточка «не замкнут» появилась. Все строки — новые
`KEY=VALUE` в `scripts/e2e.sh`.

**Критерии готовности:** поток не содержит литералов интерфейса; `./scripts/e2e.sh segment-chain`
и `./scripts/e2e.sh skeleton-smoke` запускаются, **когда** Maestro и симулятор доступны; допущения
слепого авторинга (особенно ввод времени) записаны в `e2e/insights.md`; если ввод времени
не поддаётся — соответствующие проверки перенесены в ручной чек-лист §4 (AC-99, AC-100).

---

### Шаг 13 — Документы дизайна, статусы, insights *(Тир 8, третий)*

**Зависит от:** шаги 1–12.

**Владеет файлами:** `design/screens/{add-flight,route,trip-detail,navigation,add-hotel,add-car}.md`,
`mobile/AGENTS.md`, `supabase/AGENTS.md`, `shared/AGENTS.md` (только строки «Status»),
`mobile/insights.md`, `supabase/insights.md`, `shared/insights.md`, `insights.md` (корневой).

**Что делать:** закрыть шесть расхождений из раздела спека «Документы дизайна, которые нужно
обновить»; обновить статусные строки пакетов; по протоколу `engineering-insights` дописать
**только** существенные, неочевидные находки (сначала прочитать, дедуплицировать).
В multi-agent-режиме каждый implementer возвращает свои находки в отчёте, а пишет их сюда этот шаг.

**НЕ делать:** не менять продуктовые требования в `design/` (документы приводятся в соответствие
принятым в спеке решениям, а не наоборот); не переписывать `specs/SPEC-04-flights.md`.

**Критерии готовности:** ни одного расхождения из списка спека не осталось незакрытым; в каждом
затронутом `insights.md` максимум по одной-две новых датированных записи, и ни одна не дублирует
существующую.

---

## 4. Definition of Done (вся фича)

**Автоматика (зелёное одной серией из корня):**
```bash
pnpm install
pnpm -r typecheck                      # mobile + shared: tsc --noEmit
pnpm -r test                           # mobile: jest (вкл. новые guardrails); shared: vitest
supabase start -x vector && supabase db reset && supabase test db
supabase gen types typescript --local | diff - shared/src/db/database.types.ts   # пусто (AC-9)
cd mobile && npx expo config --type public
./scripts/e2e.sh segment-chain         # когда Maestro и симулятор доступны
./scripts/e2e.sh skeleton-smoke
```
Без единой подавляющей директивы (`@ts-ignore`, `@ts-expect-error`, `eslint-disable`) — AC-98.

**Ручной чек-лист владельца (iOS, на существующем dev-клиенте — пересборка не требуется).**

| # | Проверка | ACs |
|---|---|---|
| M1 | Авиарежим: «LO 1234» → «LOT Polish Airlines»; подсказки аэропортов работают; расчёт пауз и предупреждений на уже загруженной цепочке работает; загрузка и сохранение — нет | AC-18, AC-24, AC-82 |
| M2 | Нативный выбор **времени** на устройстве (первое использование режима time) | AC-96 |
| M3 | Мультигород в три касания: сохранить рейс туда → «Сохранить и добавить следующий» → «Откуда»/«Куда»/дата предзаполнены | AC-41…AC-43, US-2 |
| M4 | Короткая стыковка 55 мин: чип «рискованно» словом, а не только цветом | AC-50, AC-65 |
| M5 | Прилёт в BCN, вылет из GRO: предупреждение «другой аэропорт»; маршрут при этом **не** замкнут | AC-52, AC-56, US-5 |
| M6 | Контраст `warnBg` / `warnBorder` / `danger` ≥4.5:1 в светлой и тёмной теме (первое использование токенов; Accessibility Inspector) | AC-87, Non-functional |
| M7 | VoiceOver на «Маршруте»: паузы и предупреждения произносятся текстом, карточка — одной подписью, узлы и линия молчат | AC-91 |
| M8 | Dynamic Type: компактная карточка растёт, код аэропорта не обрезается | Non-functional, Edge cases |
| M9 | Читаемость кодов аэропортов и номера рейса моношрифтом; названия аэропортов и авиакомпании — **не** моно | AC-88 |
| M10 | Второй аккаунт: `/trips/<чужой id>/route` → «Поездка не найдена»; открытие чужого `flightId` → «Сегмент не найден» | AC-70, AC-80, US-11 |
| M11 | Удаление поездки с сегментами → сегментов не остаётся; открытая цепочка приводит к «Поездка не найдена» | AC-7, Edge case |
| M12 | Уход в фон во время мутации → по возвращении результат, а не вечный индикатор | Edge case |
| M13 | Логи dev-клиента при неуспешной операции: имя операции и код ошибки, **без** номера билета, места, кодов и id | Non-functional (A09) |
| M14 | Декларация сбора данных App Store Connect перепроверена: категория «пользовательский контент» покрывает номера билетов и места | Mobile considerations |
| M15 | Обход S7, S9, S9b, S13 на ru и en: непереведённых ключей нет, «N дней в городе» склоняется верно | AC-92 |

---

## 4a. Трассируемость AC → шаг → проверка

**Проверено при составлении плана: все 100 AC имеют минимум один шаг и минимум один критерий.**

| AC | Шаг(и) | Чем проверяется |
|---|---|---|
| AC-1 | 1 | `supabase db reset` на чистом стенде |
| AC-2 | 1 | `trip_segments_rls.test.sql` (владелец, 4 операции) |
| AC-3 | 1 | тот же файл (второй пользователь: 0 строк / 0 затронутых) |
| AC-4 | 1 | insert с чужим и несуществующим `trip_id` |
| AC-5 | 1 | update-перенос в чужую поездку |
| AC-6 | 1 | роль `anon`: 0 строк + `42501` на insert |
| AC-7 | 1 | каскад от `trips` и от `auth.users`; M11 |
| AC-8 | 1 | `trip_segments_constraints.test.sql` (по тесту на ограничение) |
| AC-9 | 1, 3 | повторная генерация без диффа; схемы `shared` импортируют тип строки |
| AC-10 | 6, 11 | guardrails `no-service-role` / `backend-only-behind-the-boundary`; M13 |
| AC-11 | 2 | тест размера набора и покрытия городов |
| AC-12 | 2 | Zod-схема записи, уникальность `id`/`iata` |
| AC-13 | 2 | ровно один `isPrimary` на город; мультиаэропортный город в наборе |
| AC-14 | 2 | перекрёстная сверка `city.airportCode` |
| AC-15 | 2 | тест целостности (формат, `cityId`, страна, `Intl`, ru/en) |
| AC-15a | 2 | новые города-«ловушки»; список существующих id не изменился |
| AC-16 | 2 | тесты поиска («Жир», «Barcel», «GRO», «rcel») |
| AC-17 | 2 | основной раньше неосновных; повторный вызов — тот же список |
| AC-18 | 2, 3 | синхронность, отсутствие запрещённых импортов, нет работы при импорте |
| AC-19 | 2 | размер набора авиакомпаний и полнота полей |
| AC-20 | 2 | целостность designator'ов, кейс `9W`, уникальность названий |
| AC-21 | 2 | нормализация «lo 1234» / «LO-1234» / «LO1234» |
| AC-22 | 2 | таблица валидных и невалидных номеров, включая `LOT400` (Q5) |
| AC-23 | 2, 9 | схема (номер сохранён, `carrier_code` пуст) + нейтральная строка в компоненте |
| AC-24 | 9 | строка перевозчика + граница `accent`, api не вызывается; M1 |
| AC-25 | 9 | тест состава и порядка полей; M15 |
| AC-26 | 3, 9 | схема (4 падающих случая) + состояние кнопки |
| AC-27 | 3, 9, 12 | схема + пояснение отрисовано + поток |
| AC-28 | 3 | оба неполных случая прилёта |
| AC-29 | 3 | пары «локальное время + зона → UTC» (±смещения) |
| AC-30 | 3 | таблица DST (несуществующий и дважды существующий час) |
| AC-31 | 3 | границы 48 ч и прилёт = вылету |
| AC-32 | 3, 1 | схема + ограничение БД |
| AC-33 | 3, 9 | схема (`notInDirectory`) + компонент поля |
| AC-34 | 9 | «Козятин» → сообщение, кнопка неактивна; M15 |
| AC-35 | 3 | тесты нормализации и длин в кодовых точках |
| AC-36 | 3, 9, 11 | границы счётчика + отсутствие `STATIC_PASSENGERS` в коде |
| AC-37 | 3 | литеральный список идентификаторов; в `shared` нет текстов |
| AC-38 | 3, 9, 12 | четыре случая предзаполнения + поток |
| AC-39 | 3, 6, 1 | `toSegmentWrite`, тело запроса, ограничения БД |
| AC-40 | 9, 12 | два случая закрытия формы |
| AC-41 | 3, 9, 12 | `from` = `to` предыдущего; поток; M3 |
| AC-42 | 3, 9 | дата из прилёта / из вылета, прилёт после полуночи |
| AC-43 | 3, 9 | не замкнут → «Куда» заполнено; замкнут → пусто |
| AC-44 | 9 | мок ошибки: форма на месте, перехода нет |
| AC-45 | 9, 12 | оба источника перехода |
| AC-46 | 9 | двойное нажатие → один вызов api |
| AC-47 | 3 | перемешанный вход и равные моменты вылета |
| AC-48 | 3 | пауза по UTC между зонами; без прилёта — нет паузы |
| AC-49 | 3 | границы 7 ч 59 мин / ровно 8 ч |
| AC-50 | 3 | границы 1 ч 29 мин / ровно 1 ч 30 мин; M4 |
| AC-51 | 3 | JFK→LGA и BCN→GRO |
| AC-52 | 3 | с прилётом и без; одинаковый город, разные коды; M5 |
| AC-53 | 3 | 30 ч через полночь → «1 день»; 11 ч → часы |
| AC-54 | 3 | отрицательная разность → предупреждение, длительность ≥ 0 |
| AC-55 | 3 | границы дат поездки; поездка без дат |
| AC-56 | 3 | три пары маршрутов (замкнут / не замкнут / замкнут); M5 |
| AC-57 | 3 | данные предупреждения содержат город последнего прилёта |
| AC-58 | 3 | один сегмент; пустой маршрут |
| AC-59 | 3 | список идентификаторов и детерминированный порядок |
| AC-60 | 3 | `KRK · OPO · BCN · VIE`, склейка дублей |
| AC-61 | 3 | три раскладки при инжектируемом `now` |
| AC-62 | 3, 11 | логика только в `shared` + новое guardrail-правило |
| AC-63 | 7 | порядок и состав элементов цепочки |
| AC-64 | 7, 12 | состав карточки, типографические роли, переход |
| AC-65 | 7 | три вида паузы; M4, M6 |
| AC-66 | 7 | по кейсу на каждое из четырёх предупреждений |
| AC-67 | 7, 12 | карточка «не замкнут» + переход с предзаполнением |
| AC-68 | 7, 12 | пустое состояние, ноль предупреждений |
| AC-69 | 7 | загрузка и ошибка — разные экраны |
| AC-70 | 7, 8, 12 | чужой и несуществующий id → «Поездка не найдена»; M10 |
| AC-71 | 10 | состав блока при 1 и 4 сегментах; M15 |
| AC-72 | 10 | при 4 сегментах карточка одна |
| AC-73 | 10, 12 | плашка и переход |
| AC-74 | 10, 12 | пустое состояние сохранено |
| AC-75 | 6, 10, 12 | инвалидация после каждой мутации |
| AC-76 | 9, 12 | предзаполнение всех полей, включая пустой прилёт |
| AC-77 | 3, 9 | один модуль схемы, тесты параметризованы режимом |
| AC-78 | 9, 12 | без подтверждения api не вызывается; не системный `Alert` |
| AC-79 | 1, 9, 12 | строки нет в БД; пересчёт цепочки после удаления |
| AC-80 | 9, 12 | четыре вида плохого `flightId` → одно состояние; M10 |
| AC-81 | 6, 9 | мок нуля затронутых строк |
| AC-82 | 6, 9 | при ошибке состояние не меняется; M1 |
| AC-83 | 9 | значения на месте, повтор вызывает api |
| AC-84 | 6 | мок зависшего запроса (тайм-аут 15 с `lib/supabase`) |
| AC-85 | 6 | guardrail границы + «повреждённая строка → ошибка» |
| AC-86 | 3, 6, 7 | три случая: неизвестный `mode`, неизвестный код, битая зона |
| AC-87 | 5, 7, 9, 10 | guardrails `no-hex-…`, `no-font-names-…`; M6 |
| AC-88 | 7, 9, 10 | типографические роли; M9 |
| AC-89 | 7, 9 | тест компонента `Icon` + guardrail на текстовые символы |
| AC-90 | 7, 9 | подписи, роли, зоны ≥44 pt; M7 |
| AC-91 | 7 | подписи элементов цепочки, скрытые узлы; M7 |
| AC-92 | 4, 11 | `parity.test.ts` + тест плюральных форм; M15 |
| AC-93 | 4, 7 | `format.test.ts` в обеих локалях и в третьей зоне устройства |
| AC-94 | 8 | `navigation.test.tsx`: маршрут недостижим без сессии |
| AC-95 | 8, 10 | имя маршрута и `params` в состоянии роутера |
| AC-96 | 5 | изолированный компонент выбора времени + мок; M2 |
| AC-97 | 5, 11 | guardrail `no-platform-os-outside-platform` |
| AC-98 | все | `pnpm -r typecheck`, `pnpm -r test`, `supabase test db` (§4) |
| AC-99 | 12 | `e2e/flows/segment-chain.yaml` |
| AC-100 | 12 | шаг потока либо ручные пункты M4 и M5 |

---

## 4b. Чего делать НЕЛЬЗЯ (стоп-лист implementer'а)

1. Никаких таблиц, кроме `trip_segments`: ни отеля, ни авто, ни страховки, ни документов.
2. Никакой колонки `user_id` на сегменте, никакого поля порядка в цепочке, никаких денежных полей
   и валюты, никакого названия авиакомпании в БД.
3. Никаких действий против **хостингового** Supabase (`db push`, `db reset`, дашборд). Только
   локальный стенд `supabase start -x vector`. Помнить: `db reset` из worktree бьёт по общему стенду.
4. Не редактировать применённую миграцию `trips` — только новая миграция.
5. Ни одной таблицы без RLS и без pgTAP-теста каждой политики; `with check` на `insert` **и** на
   `update` обязательны (иначе сегмент кладётся в чужую поездку).
6. `service_role` в `mobile/` — ни в коде, ни в `.env`, ни в примере.
7. Никакого `@supabase/supabase-js` вне `src/lib/supabase/client.ts`; обращения к `trip_segments` —
   только из `features/transport/api/`.
8. Никакого `Platform.OS` / `.ios.*` / `.android.*` вне `src/platform/**`.
9. Никакой правки `mobile/ios/**` и `mobile/android/**` руками (CNG).
10. Никаких `@ts-ignore` / `@ts-expect-error` / `eslint-disable`.
11. Никаких пользовательских строк вне `src/lib/i18n/locales/**`; никаких hex-цветов, «магических
    чисел» и имён шрифтов вне `src/lib/theme/**` (недостающий токен — сначала в `design/tokens.md`).
12. Ни одного порога (8 ч, 1 ч 30 мин), ни одного сравнения кодов аэропортов, ни вычисления
    замкнутости **в `mobile/`** — только `shared`.
13. Никакого свободного текста вместо аэропорта; никакого сохранения «непроверенной» точки маршрута.
14. Никакого чекбокса «туда-обратно», никакой ручной сортировки цепочки, никакого drag-and-drop.
15. Никакого выбора вида транспорта в интерфейсе (`mode` пишется константой `'flight'`), никакого
    `source` ≠ `manual` из клиента.
16. Никакой блокировки сохранения из-за предупреждения и никакого «автоисправления» стыковки.
17. Никаких внешних API, ключей, Edge Functions и сетевых вызовов ради данных рейса, названия
    авиакомпании или подсказки аэропорта.
18. Никакого системного `Alert` — ни для ошибок формы, ни для подтверждения удаления.
19. Никаких оптимистичных обновлений, очередей отложенных записей и офлайн-кэша сегментов.
20. Никаких новых нативных зависимостей, разрешений, `NS*UsageDescription` и ключей
    в `src/lib/storage/keys.ts`.
21. Не трогать формы отеля и авто по существу (кроме удаления варианта `flight` из набора полей)
    и не удалять `PlaceholderField`.
22. Не удалять и не ослаблять ни одного существующего guardrail-правила «чтобы прошло».
23. Не перенумеровывать существующие идентификаторы городов в справочнике мест.
24. Не логировать номера билетов, места, коды аэропортов и идентификаторы записей.

---

## 5. Риски, допущения, расхождения и вопросы

**Допущения (если неверны — остановиться и спросить):**
- A-1. Всё делается на **локальном** Supabase; хостинговый проект не трогается (Q14).
- A-2. Данные обоих справочников собираются вручную в рамках этого плана (детерминированно, без API
  и LLM); ошибочная запись — дефект данных, ловится тестами целостности и ручной сверкой (Q-C).
- A-3. Приёмка на iOS; код кросс-платформенный, Android не проверяется.
- A-4. Отель, авто, страховка и документы в этом плане не появляются даже «на будущее».

**Риски:**
- **R-1 (технический, высокий).** Сборка UTC-момента из локального времени + IANA-зоны **без
  библиотеки** — самый тонкий код плана. Алгоритм (смещение через `Intl.formatToParts`, две
  итерации, явные ветки для несуществующего и дважды существующего часа) обязан быть покрыт
  таблицей тестов ДО того, как им начнёт пользоваться форма. Фолбэк, если алгоритм не сойдётся:
  остановиться и обсудить добавление tz-библиотеки — это изменение зависимостей (§2), а не «мелкая
  деталь», и она обязана быть runtime-нейтральной.
- **R-2 (объём, высокий).** ≥300 аэропортов и ≥400 авиакомпаний — это ручная работа с данными,
  а не код, и она доминирует по времени в шаге 2. Разумно вести её списком городов существующего
  справочника, а не «по памяти»; тесты целостности ловят только формат, не факт.
- **R-3 (технический).** Режим `time` у `@react-native-community/datetimepicker` в этом проекте
  ни разу не использовался; на Android он открывается императивно, как и дата. Если глобальный
  jest-мок не покрывает режим времени, его правка входит в шаг 5 (и файл `jest.setup.ts`
  добавляется в список владения шага 5 — ни один другой шаг его не трогает).
- **R-4 (тестовый).** Тесты «Маршрута» и формы будут асинхронными (TanStack Query): помнить про
  `renderRouter` на фейковых таймерах, про `await act(async () => {})` вместо `setTimeout`, про
  уничтожение мутаций перед `QueryClient.clear()` и про то, что `renderApp` ждёт `-screen$`
  на ЗАГРУЗКЕ (`mobile/insights.md`).
- **R-5 (архитектурный, небольшой).** Транспортный api переиспользует `TripApiError` / `mapTripError`
  из публичной поверхности `features/trips` — легально (импорт через `index.ts`), но имя
  «trip-flavoured». Дублировать классификатор хуже (postgrest-js 2.x резолвит обрыв сети как
  `{status:0}`, и вторая копия разойдётся). Вынос классификатора в `lib/` — follow-up, не этот план.
- **R-6 (инструментальный).** Maestro не установлен; поток цепочки авторится вслепую и первый
  раз требует **ввода времени** через нативный контрол — вероятность, что он не поддастся, высокая
  (AC-100 прямо разрешает откат на ручной чек-лист).
- **R-7 (дизайн).** `warnBg` / `warnBorder` / `danger` впервые оказываются на экране. Если контраст
  не проходит 4.5:1, значения правятся в `design/tokens.md` и в теме (шаг 5), а не подкручиваются
  в компоненте (шаг 7) — иначе снапшот токенов и документ разойдутся.
- **R-8 (производительность).** Бюджет 5 мс на подсказку при линейном проходе по ≥300 аэропортам
  и ≥400 авиакомпаниям на устройстве не измерялся. Сначала измерить, и только потом вводить
  ленивую карту кодов; индекс при старте приложения спек запрещает.
- **R-9 (данные, продуктовый).** IATA переиспользует коды аэропортов (`BKK`, `IST`) и выдаёт
  «controlled duplicates» перевозчикам (`7Y`). Сохранённый в сегменте код — снимок смысла;
  обновление справочника **не** мигрирует историю пользователя. Название перевозчика сознательно
  не сохраняется в БД.

**Расхождения спека и кода, найденные при планировании (не чиним молча):**
- **N-1.** `design/screens/route.md` относит случай «аэропорты разные, пауза < 8 ч» к остановке,
  что дало бы бессмысленное «0 дней»; AC-52 + AC-53 решают иначе. Правится **документ** (шаг 13).
- **N-2.** `design/screens/trip-detail.md` называет сводку «кодами всех городов», а логика и пример —
  коды **аэропортов** (AC-60). Документ, шаг 13.
- **N-3.** `design/screens/navigation.md` не знает маршрута «Маршрут» и перечисляет `flights/new`
  без префикса поездки. Документ, шаг 13.
- **N-4.** `design/screens/add-flight.md` не описывает удаление сегмента, обязательность выбора
  аэропорта, правило «прилёт целиком или никак», границы счётчика и формат номера рейса.
  Документ, шаг 13.
- **N-5.** `mobile/src/features/booking-form/fields.ts` — единственное место с `STATIC_PASSENGERS`;
  AC-36 требует, чтобы такой константы не осталось. Удаляется шагом 11, не раньше.
- **N-6.** `mobile/src/lib/i18n/format.ts` по умолчанию форматирует в **UTC** — любая новая карточка,
  забывшая передать зону аэропорта, молча покажет неверное время. Поэтому шаг 4 вводит
  `formatSegmentDateTime`, у которой зона — обязательный аргумент.

**Вопросы владельцу (все с вариантом по умолчанию; ни один не блокирует старт шагов 1, 2, 4, 5):**
- **Q-A. Где живут аэропорты — в `PLACES` или рядом?** *По умолчанию:* **рядом**, отдельным набором
  `AIRPORTS` со схемой `kind: "airport"`, а `placeRecordSchema` и `searchPlaces` **не расширяются**.
  Причина: подсказки места на S8 обязаны остаться городами и странами (`trips.place_kind` в БД
  допускает только `city|country|custom`), а спек одновременно называет аэропорт «третьим видом
  записи справочника мест» (AC-12) — это описание модели, а не требование влить их в один массив.
  Если владелец хочет буквально один массив, это заметная правка S8 и ограничения БД.
- **Q-B. Режим выполнения.** *По умолчанию:* **single-agent, строго по порядку**. Тир 1 (шаги 1, 2,
  4, 5) файл-непересекающийся и может идти четырьмя параллельными implementer'ами. Подтвердить.
- **Q-C. Данные справочников.** ≥300 аэропортов и ≥400 авиакомпаний собираются implementer'ом
  вручную; корректность IATA/таймзон/названий проверяется тестами (формат) и ручной сверкой
  (содержание). Подтвердить готовность принять данные без внешнего источника — либо дать список
  (альтернатива OurAirports из Q9 спека переводит набор в категорию «данные извне» и требует
  отдельного решения).
- **Q-D. Именование фич в `mobile/`.** *По умолчанию:* `features/transport` (данные, цепочка, S13,
  блок S7) и `features/segment-form` (S9/S9b), по образцу пары `trips` / `trip-form`. Если владелец
  предпочитает другое имя («route», «flights»), сказать до шага 6 — после он стоит переименования
  импортов.
- **Q-E. Поведение при дважды существующем местном времени (переход назад).** Спек фиксирует
  поведение только для несуществующего часа (AC-30). *По умолчанию:* берётся **первое** вхождение
  (смещение до перехода), и это закрепляется тестом. Подтвердить или выбрать второе.
