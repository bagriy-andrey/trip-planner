# Implementation Plan: Поездки — реальные данные, CRUD, архив (SPEC-03)

**Spec:** `specs/SPEC-03-trips-crud.md` (Status: draft, 2026-09-21) — источник истины для WHAT.
Этот документ — только HOW: файлы, модули, порядок, команды, критерии.
**Status:** planning
**Scope:** `supabase/` (первая миграция, RLS, pgTAP), `shared/` (справочник мест, доменная логика,
сгенерированные типы БД), `mobile/` (api + хуки + S4/S5/S7/S8/S8b, выпиливание моков), `e2e/`,
`scripts/`, `design/` (закрытие расхождений), `docs/release/`, статусные строки `*/AGENTS.md`.
**Platforms:** ios+android. Весь код кросс-платформенный, приёмка — на iOS. iOS-only поведений нет
и появляться не должно (AC-78); единственная новая нативная зависимость (выбор даты) кросс-платформенна
и спрятана за `mobile/src/platform/datePicker.tsx`.
**Execution mode:** по умолчанию **single-agent, строго по порядку**. Тир 1 (шаги 2, 3, 6) и тир 4
(шаги 8, 9) файл-непересекающиеся и могут быть розданы параллельно — **решение владельца, см. §3.0
и вопрос Q-B в §5**.
**Решения `[NEEDS CLARIFICATION]` Q1–Q12 спека приняты по умолчанию**, как написано в спеке
(отдельный маршрут правки, цвет обложки по id поездки, название места из справочника по языку UI,
лимиты 80/80, ~200 записей справочника, без транслитерации, без статуса «в процессе», экранное
подтверждение удаления, без действий на карточке, TanStack Query сейчас, архивные без дат — по моменту
архивации, только локальный стенд).

---

## 0. Что уже существует (проверено чтением репозитория 2026-09-21)

| Артефакт | Фактическое состояние | Вывод для плана |
|---|---|---|
| `supabase/migrations/`, `supabase/tests/` | Папки **пустые**. Ни одной таблицы, политики, pgTAP-теста | Шаг 3 создаёт первую миграцию и первые pgTAP-тесты — образец для всех следующих |
| `supabase/config.toml`, `templates/recovery.html` | Настроены SPEC-02, auth работает | **Не трогать** |
| Локальный стенд | Rancher Desktop: `supabase start -x vector` (без `-x vector` падает на mount'е `vector`), Mailpit на 54324, `supabase status -o env` под агентом (`supabase/insights.md`) | Команды шага 3 пишутся именно так |
| `shared/src/` | Только `auth/` (схемы, `errorCodes.ts`, `parseAuthForm`) + `index.ts`. **Нет** `src/db/`, нет доменной логики | Шаги 3 и 4 добавляют `db/`, `places/`, `trips/`, `forms/` рядом, `auth/` не трогают |
| `shared/package.json` | Экспортирует TS-исходник, zod 4, vitest 5. `z.flattenError` (не `.flatten()`) — zod 4 (`shared/insights.md`) | Новые схемы пишутся по тому же контракту: **идентификаторы ошибок, не тексты** |
| `shared/insights.md` | Уже содержит запись про `deriveTripStatus` и «upcoming — свойство списка, а не функции» | Это прямое указание к §1.2; перечитать перед шагом 4 |
| `mobile/src/mocks/` | `trips.ts` (7 поездок, `MOCK_NOW = 2026-09-20`, `findTrip`, `nightsBetween`, `MockFlight`/`MockHotel`), `user.ts` (`connectedAccount`, `currency`) | Удаляется целиком на шаге 12, **после** того как все потребители переписаны |
| Потребители моков | `TripsScreen`, `HistoryScreen`, `TripDetailScreen`, `FlightCard`, `HotelCard`, `ProfileScreen`, тесты S4/S5/профиля | Ровно семь мест; шаги 8, 10, 12 |
| `mobile/src/features/new-trip/NewTripScreen.tsx` | Заглушка: 2 × `PlaceholderField`, `ModalHeader` с «Готово», `PrimaryButton` «Сохранить» → `router.back()` | Заменяется новой фичей `features/trip-form/` (шаг 9); `PlaceholderField` **остаётся** — её использует S9 (`booking-form`) |
| `mobile/src/features/trips/` | `TripsScreen`, `types.ts` (`TripStatusKind`, `TripCardData`), `TripCard`, `TripStatusPill`, `TripCoverPlaceholder`, `FloatingAddButton` | Карточка и чип переписываются под доменную модель; `FloatingAddButton` — без изменений |
| `TripCoverPlaceholder` | Рисует **не** `coverColors`, а `tokens.accent` с четырьмя уровнями непрозрачности; `muted` = `opacity: 0.55` на всей обложке | AC-38 требует `coverColors` по id поездки; `opacity` на карточке прямо запрещена `design/screens/history.md` → чинится на шаге 8 (см. §5 N-2) |
| `TripsScreen` / `HistoryScreen` | `ScrollView` + `.map`, `router.push(\`/trips/${id}\`)` — **шаблонная строка**, не объектный href | AC-76 + `mobile/insights.md` 2026-09-19: переводится на `{ pathname, params }`; список — на `FlatList` внутри `Screen scroll={false}` |
| `TripDetailScreen` | `findTrip(tripId)` с фолбэком на ближайшую поездку, карточки рейса/отеля из моков, «…» = `SoonBadge` без действия | Переписывается целиком (шаг 10); `FlightCard`/`HotelCard`/`CarEmptySection` удаляются |
| `mobile/src/components/` | Есть `Screen` (`scroll` проп!), `ModalHeader`, `TextField`, `PrimaryButton`, `Pill`, `Icon` (Feather + 3 Ionicons), `EmptyState`, `GlassSurface`, `PressableRow` | Новый примитив нужен ровно один — чекбокс. `Screen scroll={false}` снимает проблему «FlatList внутри ScrollView» |
| `mobile/src/lib/supabase/` | `client.ts` — единственный импорт `supabase-js`, `fetch` с тайм-аутом **15 с** уже есть (SPEC-02) | AC-59 закрывается существующим клиентом; новый код тайм-аут не изобретает |
| `mobile/src/lib/session/` | `useSession()` → `status: restoring/signedIn/signedOut`, `holdGating()` | AC-62: хуки запросов включаются только при `signedIn` |
| `mobile/__tests__/guardrails.test.ts` | Правила `no-cyrillic-outside-locales`, `no-platform-os-outside-platform`, `backend-only-behind-the-boundary` (supabase-js только в `lib/supabase/client.ts`; идентификатор `supabase` — в `lib/supabase`, `lib/session`, **`features/*/api`** через `isFeatureApi`), `no-hex-…`, `no-font-names-…`, `no-async-storage-…`, `no-storage-writes-…`, `no-secure-store-…`, `no-credentials-in-logs`, `no-service-role`, `no-secret-env` | `features/trips/api/` **уже легален** — ослаблять ничего не нужно. Добавляются два правила (шаг 12) |
| `mobile/__tests__/routes.contract.test.ts` | `SPEC_ROUTES` — жёсткий список 16 маршрутов, `MAX_ROUTE_LINES = 40` | Шаг 11 добавляет ровно один: `/trips/[tripId]/edit` |
| `mobile/__tests__/navigation.test.tsx` | Жмёт `trip-card-trip-rome`, открывает `/trips/x` и ждёт рабочий S7 (фолбэк `findTrip`) | Переписывается на шаге 11: `/trips/x` → «Поездка не найдена» |
| `mobile/app/_layout.tsx` | `Stack.Protected` с 7 объявленными защищёнными маршрутами. **Незаявленный маршрут остаётся незащищённым** (`mobile/insights.md` 2026-09-21) | Шаг 11 добавляет `trips/[tripId]/edit` и провайдер запросов |
| `mobile/package.json` | **Нет** `@tanstack/react-query`, нет выбора даты | Шаг 1 |
| `mobile/src/lib/i18n/` | `format.ts` (`formatDateRange/ShortDate/Time/Nights/RelativeDays`, все над `Date` в UTC), локали ru/en, `parity.test.ts`, ключи `trips.cities.*` | Шаг 6 добавляет форматирование **календарных** дат; ключи `cities.*` удаляются на шаге 12 |
| `mobile/src/lib/theme` | `coverColors` (5 цветов) **определены и не используются ни одним экраном**; `divider`, `surfaceBorder`, `textTertiary`, `layout.minTouch = 44` есть | Новых **цветовых** токенов не требуется: пунктирная рамка = `surfaceBorder` + `layout.borderWidth`, скелетон = `divider` |
| `e2e/flows/skeleton-smoke.yaml` | Открывает S7 тапом по карточке `${CITY_LISBON}` и проверяет `${NEW_TRIP_CITY_LABEL}` («Город») | После выпиливания моков у свежего аккаунта список **пуст** → поток ломается; шаг 13 (см. §5 Q-C) |
| `e2e/`, Maestro | Не установлен, потоки авторены вслепую (`e2e/AGENTS.md`) | Новый поток тоже авторуется вслепую; допущения — в `e2e/insights.md` |
| `design/tokens.md` | «Цвета обложек… выбираются детерминированно **по названию города**» | Прямое расхождение с AC-38 → правится на шаге 14 (решение Q2 спека) |

---

## 1. Разбивка по модулям

Порядок раздела — от схемы к клиенту: `supabase/` → `shared/` → `mobile/` → `e2e/`.

### 1.1 `supabase/` — первая таблица, RLS и pgTAP

Файл миграции создаётся командой `supabase migration new trips` (имя файла — с временной меткой CLI,
**не** писать руками). Применённую миграцию потом не править: любое изменение — новая миграция.

**DDL (контракт этого плана; синтаксис проверить применением, не глазами):**

```sql
create table public.trips (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  destination   text not null,
  place_kind    text not null,
  place_id      text,
  country_code  text,
  iana_timezone text,
  airport_code  text,
  title         text,
  start_date    date,
  end_date      date,
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint trips_destination_len   check (char_length(destination) between 1 and 80
                                            and btrim(destination) <> ''),
  constraint trips_title_len         check (title is null or char_length(title) between 1 and 80),
  constraint trips_place_kind        check (place_kind in ('city','country','custom')),
  constraint trips_country_code_fmt  check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint trips_airport_code_fmt  check (airport_code is null or airport_code ~ '^[A-Z]{3}$'),
  constraint trips_dates_both_or_none check ((start_date is null) = (end_date is null)),
  constraint trips_dates_order        check (end_date is null or end_date >= start_date),
  constraint trips_dates_max_span     check (end_date is null or end_date - start_date <= 365),
  constraint trips_custom_place_clean check (place_kind <> 'custom'
                                             or (place_id is null and country_code is null
                                                 and iana_timezone is null and airport_code is null)),
  constraint trips_country_no_airport check (place_kind <> 'country' or airport_code is null)
);
```

- Типы по `postgresql-table-design`: `text` + `check` вместо `varchar(n)`, `date` для календарных дат
  (спек §«Почему даты календарные»), `timestamptz` для моментов. `uuid` (а не identity) выбран
  сознательно: идентификатор поездки уходит в URL маршрута и должен быть непрозрачным.
- **FK индексируется руками** (Postgres не делает этого сам):
  `create index trips_user_id_start_date_idx on public.trips (user_id, start_date);`
  плюс `create index trips_user_id_archived_at_idx on public.trips (user_id, archived_at);`
- `updated_at`: функция `public.set_updated_at()` (`language plpgsql`, `set search_path = ''`) +
  триггер `before update on public.trips for each row`. Обе — в той же миграции.
- **RLS в той же миграции** (`supabase-backend` правило 1), четыре политики, все `to authenticated`,
  так что анонимная роль не получает ничего (AC-4):

```sql
alter table public.trips enable row level security;

create policy trips_select_own on public.trips for select to authenticated
  using (user_id = (select auth.uid()));
create policy trips_insert_own on public.trips for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy trips_update_own on public.trips for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy trips_delete_own on public.trips for delete to authenticated
  using (user_id = (select auth.uid()));
```

`(select auth.uid())` — обёртка обязательна (планировщик вычисляет один раз, `supabase-backend`).
`with check` на update закрывает «переписать `user_id` на чужой» так же, как и на insert (AC-5).

**pgTAP:**

| Файл | Что доказывает |
|---|---|
| `supabase/tests/trips_rls.test.sql` | AC-2 (владелец делает select/insert/update/delete своей строки), AC-3 (второй пользователь получает 0 строк на select и 0 затронутых на update/delete — **не** ошибку), AC-4 (роль `anon`: 0 строк, insert отклонён), AC-5 (insert с чужим `user_id` отклонён), AC-6 (`delete from auth.users` → 0 строк поездок) |
| `supabase/tests/trips_constraints.test.sql` | AC-7: по одной падающей вставке на каждое ограничение — одна дата из двух, `end < start`, 366 дней, `place_kind='custom'` с заполненной таймзоной, `place_kind='country'` с аэропортом, пустой/пробельный `destination`, 81 символ |

Приёмы (зафиксировать в тесте комментарием, иначе следующая таблица будет писаться наугад):
пользователи создаются `insert into auth.users`; смена личности — `set local role authenticated;`
+ `set local "request.jwt.claims" = '{"sub":"<uuid>","role":"authenticated"}';`; анонимная роль —
`set local role anon;`. Каждый файл — `begin; select plan(n); … select * from finish(); rollback;`.
Расширение pgTAP включается **внутри** транзакции теста
(`create extension if not exists pgtap with schema extensions;`), чтобы не тащить его в прод-схему;
если установленная CLI так не умеет — §5 R-3.

**Генерация типов (в этом же шаге, иначе `shared` не с чем сверять):**
`supabase gen types typescript --local > shared/src/db/database.types.ts`. Файл — **только типы**,
рукописных типов строки `trips` в проекте не появляется (AC-8).

Ничего из этого не выполняется против хостингового проекта: ни `db push`, ни `db reset`, ни дашборда.

### 1.2 `shared/` — справочник мест, доменная логика, схемы формы

Пакет остаётся runtime-нейтральным: ни `supabase-js`, ни `react-native`, ни Node/DOM API.
`Intl` использовать можно (это ECMAScript, есть и в Hermes, и в Deno) — но только для **проверки**
валидности IANA-идентификатора, не для форматирования (форматирование — забота клиента).

```
shared/src/db/database.types.ts     сгенерирован шагом 3; ре-экспорт типа строки из src/index.ts
shared/src/forms/parse.ts           parseForm(schema, input, isErrorId) — обобщение parseAuthForm
                                    (safeParse + z.flattenError, НИКОГДА не бросает). `auth/parse.ts`
                                    этим планом НЕ трогается; его схождение с этим модулем — follow-up
shared/src/places/schema.ts         PlaceRecord = дискриминированное объединение по `kind`:
                                      city    { id, kind:"city",    ru, en, countryCode, timeZone, airportCode? }
                                      country { id, kind:"country", ru, en, region }
                                    (object-discriminated-unions; z.infer, не ручные типы)
shared/src/places/directory.ts      ДАННЫЕ: ~195 стран + ~60 городов (итого в диапазоне 150–300, AC-10).
                                    Курируются вручную, `as const satisfies readonly PlaceRecord[]`
shared/src/places/fold.ts           foldForSearch(s): нижний регистр + снятие диакритики.
                                    Реализация по умолчанию — normalize("NFD") + удаление
                                    combining marks; фолбэк без Unicode-escape'ов — §5 R-4
shared/src/places/search.ts         searchPlaces(query, limit = 4): СИНХРОННАЯ чистая функция.
                                    Совпадение ТОЛЬКО с начала ru- и en-названия (AC-12), линейный
                                    проход по массиву (бюджет 5 мс, индекс при старте запрещён —
                                    Non-functional). Детерминированный порядок: сначала более
                                    короткое совпавшее название, при равенстве — по `id`
shared/src/trips/errorCodes.ts      TRIP_FIELD_ERROR: "destination.empty" | "destination.tooLong" |
                                    "title.tooLong" | "dates.incomplete" | "dates.endBeforeStart" |
                                    "dates.tooLong" (+ isTripFieldErrorId). ИДЕНТИФИКАТОРЫ, не тексты (AC-27)
shared/src/trips/calendarDate.ts    CalendarDate = строка "YYYY-MM-DD" (схема отвергает значение
                                    со временем — AC-16), toCalendarDate(date) по ЛОКАЛЬНЫМ полям Date
                                    (сегодня берётся из пояса устройства — Edge case), addDays,
                                    daysBetween, compare. Ни одного обращения к часам внутри
shared/src/trips/schemas.ts         tripFormSchema (нормализация + проверки, AC-17…AC-19, AC-26, AC-49),
                                    tripPlaceSchema (дискриминированное объединение custom/city/country),
                                    tripRowSchema (разбор строки БД, AC-61) + toTrip(row): Trip
                                    (camelCase доменный объект), toTripWrite(formValue): поля БД
                                    (snake_case), ОДИН источник для create и update (AC-15, AC-51)
shared/src/trips/status.ts          deriveTripStatus(trip, today) → "archived"|"draft"|"completed"|"planned"
                                    (AC-22, граница «конец = сегодня» → НЕ completed);
                                    pickUpcomingTripId(trips) — свойство СПИСКА, не функции (AC-23);
                                    selectActiveTrips / selectHistoryTrips + их сортировки (AC-35, AC-36,
                                    Q11: архивные без дат — по archived_at); nightsBetween(start,end) (AC-25)
shared/src/trips/cover.ts           coverIndexOf(tripId, paletteLength) — детерминированно по
                                    НЕИЗМЕНЯЕМОМУ id (AC-38). Распределение покрывает всю палитру
shared/src/trips/destination.ts     resolveDestinationName(trip, lang): place_id известен → название
                                    из справочника на языке UI; иначе сохранённый destination как есть
                                    (Q3). Неизвестный place_id — НЕ ошибка. isValidTimeZone(id) —
                                    проверка перед любым использованием таймзоны из БД
shared/src/{places,trips}/index.ts  публичные поверхности
shared/src/index.ts                 + export * from "./places" / "./trips" / типы строки из ./db
```

Правила скилла `zod`, обязательные здесь: `safeParse` для пользовательского ввода
(`parse-use-safeparse`), сообщение = идентификатор ошибки (`error-custom-messages` + `error-i18n`),
`z.infer` вместо ручных типов (`type-use-z-infer`), экспорт схемы **и** типа, нормализация через
`transform`/`pipe` (а не в экране), дискриминированные объединения для места
(`object-discriminated-unions`), `z.unknown()` вместо `any` на входе разбора строки БД.
Счёт длины — в кодовых точках (`[...s].length`), как в `shared/src/auth` (`shared/insights.md`).

### 1.3 `mobile/src/lib/` — две новые сквозные границы

```
src/lib/clock/
  ClockProvider.tsx   Контекст источника времени. Значение по умолчанию — настоящие часы;
                      в тестах подменяется фиксированной календарной датой (AC-24, AC-64).
  useToday.ts         useToday(): CalendarDate — ЕДИНСТВЕННЫЙ способ узнать «сегодня» в src/.
                      Пересчёт при возврате приложения из фона (AppState) — чтобы вчерашняя
                      поездка уехала в «Историю» при следующем обновлении (Edge case), без
                      таймера на каждую миллисекунду.
  index.ts
src/lib/query/
  queryClient.ts      createQueryClient(): retry — по классификации ошибки api (не по умолчанию
                      TanStack), никаких оптимистичных обновлений (спек, контракт 3).
  QueryProvider.tsx   Провайдер поверх дерева (подключается в app/_layout.tsx на шаге 11).
  index.ts
src/platform/
  datePicker.tsx      Единственное место, импортирующее модуль нативного выбора даты (AC-77, AC-78).
                      Наружу — нейтральный проп-контракт (value: CalendarDate | null, onChange,
                      min/max, accessibilityLabel). В jest подменяется одним моком.
```

`src/lib/clock/` лежит в `lib/`, а не в фиче: её потребители — три разные фичи и корневой layout;
`lib/` не импортирует `features/` (правило 2 `mobile-architecture`).

### 1.4 `mobile/src/features/trips/` — данные и список (S4)

```
api/tripsApi.ts     listTrips / getTrip / createTrip / updateTrip / archiveTrip / unarchiveTrip /
                    deleteTrip. Каждая возвращает { ok: true, data } | { ok: false, kind } —
                    сырые ошибки бэкенда наружу не проходят (AC-60). Каждая строка разбирается
                    tripRowSchema из @tripplanner/shared; непрошедшая разбор строка = ошибка
                    загрузки (AC-61), логируется ОТДЕЛЬНО от сетевой (Наблюдаемость).
                    В логи — только имя операции и код ошибки: ни destination, ни title,
                    ни user_id (правило no-credentials-in-logs распространяется сюда).
                    Мутации делают .select().single(); НОЛЬ затронутых строк → kind "notFound"
                    (AC-56, Edge case «удаление поездки, открытой в шторке правки»).
api/errors.ts       TripErrorKind = "notFound" | "offline" | "timeout" | "denied" | "unknown";
                    mapTripError(unknown): TripErrorKind
api/index.ts
hooks/queryKeys.ts  tripKeys.all = ["trips"], tripKeys.one(id) = ["trips", id]
hooks/useTripsQuery.ts    ОДИН запрос списка на экран поездок и историю (Non-functional:
                    «первая загрузка укладывается в один запрос»); разбиение на активные и
                    историю — чистыми функциями shared по useToday(). enabled только при
                    session.status === "signedIn" (AC-62)
hooks/useTripQuery.ts     одна поездка по id
hooks/useTripMutations.ts create/update/archive/unarchive/delete; КАЖДАЯ инвалидирует
                    tripKeys.all и tripKeys.one(id) (AC-42). Оптимистичных обновлений нет
TripsScreen.tsx     S4: FlatList внутри <Screen scroll={false}> (ScrollView + .map запрещён
                    `expo-react-native`; вложенный FlatList в ScrollView — тем более).
                    Шапка — ListHeaderComponent, состояния — ListEmptyComponent
types.ts            TripStatusKind расширяется до "archived"; TripCardData строится из Trip
components/TripCard.tsx, TripStatusPill.tsx (чип «архив» на фоне divider цветом textSecondary —
                    AC-37), TripCoverPlaceholder.tsx (coverColors по coverIndexOf(id) — AC-38),
                    TripCardSkeleton.tsx (та же высота, что карточка — AC-39),
                    TripListStates.tsx (пусто / ошибка + «Повторить», AC-40, AC-41),
                    FloatingAddButton.tsx (без изменений)
index.ts            публичная поверхность: экран, карточка, хуки, типы api (их читают
                    features/trip-form и features/trip-detail — только через этот файл)
```

### 1.5 `mobile/src/features/trip-form/` — S8 и S8b (новая фича, заменяет `new-trip`)

Одна фича на оба режима: спек требует одну форму и одну схему (AC-49). Отдельная от `features/trips`
фича — чтобы владение файлами шагов 8 и 9 не пересекалось и чтобы `features/trips/index.ts`
оставался единственной точкой их связи.

```
TripFormScreen.tsx        props { mode: "create" } | { mode: "edit"; tripId }. Шапка ModalHeader
                          («Отмена» слева, заголовок по режиму; «Готово» исчезает — AC-33);
                          нижняя кнопка «Создать поездку»/«Сохранить». Экран тонкий: вся логика
                          в useTripForm
hooks/useTripForm.ts      состояние формы, разбор tripFormSchema (до запроса), вызов мутации,
                          единственный запрос при двойном нажатии (AC-32), сохранение введённого
                          при ошибке и повтор одним нажатием (AC-58)
components/PlaceField.tsx        поле «Куда»: autoFocus (AC-28), иконка метки, крестик очистки,
                          акцентная граница, когда место выбрано из справочника; дописывание
                          текста после выбора сбрасывает место в custom (AC-51, Edge case)
components/PlaceSuggestions.tsx  до 4 строк + строка «ничего не нашли» (AC-14). Типографика строки
                          подсказки: название обычным шрифтом, «Город · Португалия» — textTertiary,
                          код аэропорта МОНО и только у города (AC-34, AC-68)
components/DatesBlock.tsx        две кнопки дат + чекбокс «Пока без дат» (скрывает кнопки — AC-21),
                          сообщение об ошибке у блока, а не у кнопок (AC-17…AC-19)
index.ts
```

Выбор даты вызывается только через `src/platform/datePicker` — в коде фичи нет ни импорта
нативного модуля, ни `Platform.OS` (AC-77, AC-78).

### 1.6 `mobile/src/features/trip-detail/` — S7

```
TripDetailScreen.tsx              запрос одной поездки; состояния: загрузка, ошибка + «Повторить»,
                                  «Поездка не найдена» (AC-44, AC-56), успех
components/TripHero.tsx           место (resolveDestinationName), чип статуса, диапазон дат + число
                                  ночей МОНО (AC-43, AC-68); «…» перестаёт быть SoonBadge
components/TripActionsMenu.tsx    экранное меню (НЕ системный Alert, Q8): «Изменить» + «Отправить
                                  в архив» / «Вернуть из архива» + «Удалить навсегда» только
                                  для архивной (AC-46, AC-47)
components/ConfirmDeleteSheet.tsx подтверждение, прямо называющее необратимость (AC-54)
components/EmptyBookingSection.tsx пунктирная рамка surfaceBorder + иконка плюса + «Добавить …»
                                  цветом textSecondary (AC-45)
components/BookingSection.tsx     остаётся (заголовок блока + «+»)
УДАЛЯЮТСЯ: FlightCard.tsx, HotelCard.tsx, CarEmptySection.tsx (их данные — моки; блоки
                                  становятся пустыми состояниями. Вернутся в Follow-up 1)
```

### 1.7 `e2e/`

`e2e/flows/trip-crud.yaml` (AC-80): вход → «+» → ввести место → «Создать поездку» → детали →
назад → карточка в списке → детали → «…» → «Отправить в архив» → вкладка «История» → карточка
с чипом «архив» → детали → «…» → «Удалить навсегда» → подтвердить → её нет ни в одном списке.
Без литералов интерфейса: строки приходят из таблицы `scripts/e2e.sh`.
`e2e/flows/skeleton-smoke.yaml` — обязан быть обновлён: у свежего аккаунта список поездок теперь
**пуст**, а он открывает S7 тапом по карточке Лиссабона (см. §5 Q-C).

---

## 2. Изменения зависимостей

| Пакет | Куда | Зачем | Нативный? |
|---|---|---|---|
| `@tanstack/react-query` | `mobile` | серверное состояние списков и одной поездки, инвалидация (AC-42; правило `mobile/AGENTS.md`, решение Q10) | нет (чистый JS) |
| `@react-native-community/datetimepicker` | `mobile` | системный выбор даты (AC-77) | **да → новая сборка dev-клиента** |

```bash
cd mobile
npx expo install @react-native-community/datetimepicker   # версию пинит Expo SDK, руками не указываем
pnpm add @tanstack/react-query
npx expo install --check
npx expo run:ios                                          # ОДИН раз, после установки
```

**Чего НЕ добавляем:** `expo-sqlite` и любой offline-sync (Non-goal), `date-fns`/`dayjs`
(календарная арифметика — шесть строк в `shared`, новая зависимость её не стоит и тянет локали),
`react-native-calendars` (спек требует системный выбор даты), `FlashList` (десятки карточек,
`FlatList` достаточно), любой геокодер/Places API (прямой Non-goal).

**Изменения БД:** одна миграция (`supabase migration new trips`) — таблица + ограничения + индексы +
RLS + четыре политики + триггер `updated_at`, **всё в одном файле**; pgTAP-тесты политик и ограничений
в том же шаге; сразу после применения — регенерация `shared/src/db/database.types.ts`.
Применённую миграцию не редактировать.

**Переменные окружения:** ни одной новой. `EXPO_PUBLIC_SUPABASE_URL` и `_ANON_KEY` уже есть;
`service_role` в клиенте не появляется и этому спеку не нужен (AC-9).

**Разрешения:** ни одного нового. Ни `NS*UsageDescription`, ни запроса геолокации/календаря/
уведомлений/камеры. Появление любого — отклонение от спека, остановиться и спросить.

**Privacy manifest (шаг 2):** `@react-native-community/datetimepicker` — прямая нативная зависимость,
значит по `mobile/AGENTS.md` нужно посмотреть её фактический `PrivacyInfo.xcprivacy` и продублировать
найденные причины в `ios.privacyManifests`. Процедура — из `docs/release/privacy-manifest-audit.md`
(обход `node_modules/.pnpm` по реальным путям с дедупликацией, список слинкованных подов через
`npx expo-modules-autolinking resolve --platform apple --json`). Отдельной строкой фиксируется:
**с этого спека приложение хранит пользовательский контент** (места и названия поездок, привязанные
к аккаунту) → в декларацию сбора данных App Store Connect добавляется категория пользовательского
контента (обязанность спека релиза).

**Контракт `@tripplanner/shared`:** расширяется (справочник мест, доменная логика, типы строки `trips`).
Потребитель сегодня один — `mobile/`; Edge Functions и `web/` этим спеком не вводятся, так что
«обновить всех потребителей в том же плане» выполняется автоматически.

---

## 3. Порядок выполнения

### 3.0 Режим выполнения и правило непересечения

14 шагов, 8 тиров. Списки файлов шагов **не пересекаются** ни в одном месте.

| Тир | Шаги | Зависит от |
|---|---|---|
| 0 | 1 | — |
| 1 | 2, 3, 6 (независимы друг от друга) | 1 (шаг 3 — ни от чего, кроме CLI) |
| 2 | 4 | 3 |
| 3 | 5, 7 | 5 ← 1; 7 ← 4, 5 |
| 4 | 8, 9 (независимы друг от друга) | 4, 5, 6, 7 |
| 5 | 10 | 8 |
| 6 | 11 → 12 (**строго последовательно**) | 9, 10 |
| 7 | 13, 14 | 11, 12 |

**Три главных правила порядка (нарушить — получить красный CI между шагами):**

1. **Моки удаляются последними.** `src/mocks/` читают семь мест; каталог сносится только на шаге 12,
   когда ни один из них на него не ссылается. Шаги 8, 10 и 12 обязаны идти в этом порядке.
2. **Ключи локализации добавляются заранее, удаляются в конце.** Шаг 6 добавляет все новые ru/en
   строки и **сохраняет** `trips.cities.*` (их ещё читают экраны). Удаление `cities.*` и правка
   `parity.test.ts` — шаг 12, вместе с выпиливанием моков.
3. **Маршрут правки и его объявление — один шаг.** Файл `app/trips/[tripId]/edit.tsx` без строки
   в `Stack.Protected` остаётся незащищённым (`mobile/insights.md` 2026-09-21), а `routes.contract.test.ts`
   краснеет на любом новом файле в `app/`. Поэтому файл маршрута, `app/_layout.tsx`,
   `navigation.test.tsx` и `routes.contract.test.ts` принадлежат **одному** шагу 11.

---

### Шаг 1 — Зависимости, jest-обвязка, сборка dev-клиента

**Зависит от:** ничего. **Блокирует:** мобильные шаги.

**Владеет файлами:** `mobile/package.json`, `mobile/jest.setup.ts`, `mobile/jest.config.js`,
`pnpm-lock.yaml`, `pnpm-workspace.yaml` (только если `minimumReleaseAgeExclude` потребует новой записи).

**Что делать:**
1. Установить зависимости по §2 (нативную — только `npx expo install`).
2. `jest.setup.ts`: мок `@react-native-community/datetimepicker` (компонент, который просто отдаёт
   переданное значение через `onChange` по нажатию) — чтобы тесты формы не зависели от нативного модуля.
3. Проверить, не требует ли `@tanstack/react-query` записи в `transformIgnorePatterns` (временным тестом).
4. Один раз собрать dev-клиент: `npx expo run:ios`. После сборки `git checkout --` для `mobile/.gitignore`
   и `expo-env.d.ts`, которые переписывает Metro (`mobile/insights.md` 2026-09-19).

**НЕ делать:** не писать код провайдера запросов (шаг 5), не трогать `app/**`.

**Критерии готовности:** `pnpm install` проходит; `pnpm -r typecheck` и `pnpm -r test` зелёные;
`npx expo run:ios` ставит пересобранный dev-клиент и приложение запускается (iOS 27 — проверить,
что плагин `withIosSceneLifecycle` по-прежнему спасает старт).

---

### Шаг 2 — Privacy manifest и декларация сбора данных *(Тир 1)*

**Зависит от:** Шаг 1.

**Владеет файлами:** `mobile/app.privacy.ts`, `docs/release/privacy-manifest-audit.md`.

**Что делать:** повторить процедуру аудита для `@react-native-community/datetimepicker`; скопировать
**фактические** `NSPrivacyAccessedAPITypes` и коды причин, не предполагаемые. Зависимость, трогающая
required-reason API без собственного манифеста, — стоп-сигнал: зафиксировать и сообщить владельцу.
Добавить датированную запись про хранение пользовательского контента (см. §2).

**Критерии готовности:** `npx expo config --type public` печатает `ios.privacyManifests` со всеми
фактически найденными категориями; `ios.infoPlist` по-прежнему без единой `NS*UsageDescription`;
в документе аудита новая датированная запись с версией модуля.

---

### Шаг 3 — `supabase/`: миграция `trips`, RLS, pgTAP, типы БД *(Тир 1)*

**Зависит от:** ничего (нужны Supabase CLI и Docker). **Блокирует:** шаг 4.

**Владеет файлами:** `supabase/migrations/<timestamp>_trips.sql`, `supabase/tests/trips_rls.test.sql`,
`supabase/tests/trips_constraints.test.sql`, `shared/src/db/database.types.ts`.

**Что делать:** §1.1. Команды:
```bash
supabase start -x vector          # -x vector обязателен на Rancher Desktop (supabase/insights.md)
supabase migration new trips      # имя файла даёт CLI
# … написать DDL + RLS + политики + триггер в созданный файл …
supabase db reset                 # ЛОКАЛЬНЫЙ стенд: применяет миграции с нуля
supabase test db
supabase gen types typescript --local > shared/src/db/database.types.ts
```

**НЕ делать:** ни одной второй таблицы (рейсы, отели, авто — Follow-up 1); ни поля `source`,
ни `status`, ни `cover_index`, ни валюты в `trips`; ни одного действия против **хостингового**
проекта (`db push`, `db reset` на хостинге, дашборд); не редактировать `config.toml`.

**Критерии готовности:**
- `supabase db reset` на чистом стенде применяет миграцию без ошибок (AC-1).
- `supabase test db` зелёный: оба файла, каждая политика покрыта тремя случаями
  (владелец / другой пользователь / anon), плюс подмена `user_id`, каскад от `auth.users`
  и по падающей вставке на каждое ограничение (AC-2…AC-7).
- Отказ RLS виден как **ноль строк**, а не как ошибка (Наблюдаемость) — зафиксировать утверждением.
- `supabase gen types typescript --local` второй раз не даёт диффа (AC-8).
- В `shared/src/db/database.types.ts` есть строка `trips` со всеми 14 полями; `pnpm -r typecheck` зелёный.

---

### Шаг 4 — `shared/`: справочник мест и доменная логика поездок *(Тир 2)*

**Зависит от:** Шаг 3 (типы БД).

**Владеет файлами:** `shared/src/forms/parse.ts`, `shared/src/places/**`, `shared/src/trips/**`,
`shared/src/index.ts`, тесты в `shared/src/{places,trips}/__tests__/**`.

**Что делать:** §1.2. Перед началом перечитать `shared/insights.md` (запись про `deriveTripStatus`
и про «upcoming — свойство списка»: она написана заранее именно под этот шаг) и `shared/AGENTS.md`.

**НЕ делать:** не трогать `shared/src/auth/**` (в том числе не «заодно» переводить его на новый
`parseForm`); не писать в `shared` ни одной пользовательской строки; не импортировать
`supabase-js`/`react-native`/`node:*`.

**Критерии готовности (`pnpm --filter @tripplanner/shared test` + `typecheck`):**
- Справочник: размер в диапазоне 150–300; у каждой записи непустые ru и en; идентификаторы уникальны;
  каждый IATA — ровно три **заглавные латинские буквы** (тест ловит `0P0` вместо `OPO` автоматически);
  каждая таймзона принимается `Intl.DateTimeFormat` (AC-10, AC-11).
- Поиск: «Пор» → Португалия + Порту; «por» → те же; «Пор» **не** даёт совпадений в середине слова;
  не более 4 результатов; «1» → пусто; функция синхронная и детерминированная; «Porto» не находится
  по «Порту» (Q6) (AC-12, AC-13).
- Схема формы: `"  Порту  "` → `"Порту"`; двойные пробелы внутри схлопываются; строка из пробелов →
  `destination.empty`; 80 ок / 81 → `destination.tooLong` (счёт в кодовых точках, эмодзи = 1);
  одна дата из двух → `dates.incomplete`; конец раньше начала → `dates.endBeforeStart`;
  365 ок / 366 → `dates.tooLong`; значение со временем в поле даты отвергается (AC-16…AC-19, AC-26).
- Набор идентификаторов ошибок зафиксирован литеральным списком в тесте (это контракт клиента, AC-27).
- `toTripWrite`: выбор из справочника → заполнены `place_id`, `country_code`, `iana_timezone`,
  `airport_code`; свободный текст → `place_kind: "custom"` и **все четыре поля null**; переход
  в обе стороны не оставляет «прилипших» значений (AC-15, AC-51).
- `deriveTripStatus`: таблица случаев, включая `archived_at` поверх любых дат, пустые даты → `draft`,
  «конец = сегодня» → **не** `completed`, «конец = вчера» → `completed` (AC-22).
- `pickUpcomingTripId`: из нескольких будущих — ровно один; при отсутствии дат — никто; при равных
  датах начала выбор детерминирован (AC-23).
- Сортировки: активный список — по дате начала по возрастанию, поездки без дат в конце; история —
  свежие сверху, архивные без дат по `archived_at` (AC-35, AC-36, Q11).
- `nightsBetween`: 0 ночей при `start = end`, переход через смену месяца, через 29 февраля (AC-25).
- `coverIndexOf`: одна и та же поездка → один и тот же индекс до и после правки; на наборе
  идентификаторов задействованы все 5 цветов (AC-38).
- `tripRowSchema`: корректная строка → доменный объект; строка с битым полем → неуспех (AC-61).
- В `shared/src/**` нет импортов `react-native`, `supabase`, `node:*`.

---

### Шаг 5 — `mobile/`: источник времени, клиент запросов, граница выбора даты, чекбокс *(Тир 3)*

**Зависит от:** Шаг 1.

**Владеет файлами:** `mobile/src/lib/clock/**`, `mobile/src/lib/query/**`,
`mobile/src/platform/datePicker.tsx`, `mobile/src/components/Checkbox.tsx`,
`mobile/src/components/index.ts`, `mobile/src/components/__tests__/Checkbox.test.tsx`,
`mobile/src/test-utils/renderWithProviders.tsx`.

**Что делать:** §1.3. `renderWithProviders` получает две новые опции: `today` (фиксированная
календарная дата) и собственный `QueryClient` на каждый рендер (`retry: false`) — чтобы тесты
шагов 8–10 не собирали провайдеры руками. Обёртка остаётся async (`ThemeProvider` читает хранилище
асинхронно — `mobile/insights.md`).

**НЕ делать:** не подключать `QueryProvider` в `app/_layout.tsx` (шаг 11); не писать ни одного
`Platform.OS`; не добавлять в `src/lib/storage/keys.ts` ни одного ключа — данные поездок на устройство
не пишутся, реестр остаётся на трёх ключах (спек, «Локальное хранение»).

**Критерии готовности:**
- `useToday()` с подменённым источником отдаёт фиксированную дату; при реальных часах — календарную
  дату **пояса устройства**; возврат из фона пересчитывает её (AC-24, AC-64).
- Граница выбора даты подменяется одним моком, и ни один файл вне `src/platform/` не импортирует
  нативный модуль (AC-77, AC-78).
- Чекбокс: роль `checkbox`, состояние `checked` читается RNTL, зона нажатия ≥ 44×44 pt,
  непустая подпись (AC-70); ни одной строки интерфейса внутри примитива.
- `pnpm --filter @tripplanner/mobile typecheck` и `test` зелёные.

---

### Шаг 6 — `mobile/`: строки ru/en и форматирование календарных дат *(Тир 1)*

**Зависит от:** ничего.

**Владеет файлами:** `mobile/src/lib/i18n/format.ts`, `mobile/src/lib/i18n/index.ts`,
`mobile/src/lib/i18n/locales/{ru,en}/{trips,history,tripDetail,common,profile}.ts`,
`mobile/src/lib/i18n/__tests__/format.test.ts`.

**Что делать:**
1. `format.ts`: добавить форматирование **календарных** дат — `formatCalendarDate`,
   `formatCalendarRange`, `formatTripDateLine` (диапазон + число ночей). Внутри `"YYYY-MM-DD"`
   превращается в `Date.UTC(...)` и форматируется с `timeZone: "UTC"` — иначе дата «съезжает»
   на день в отрицательных поясах. Склеенных вручную строк не появляется (AC-74).
   Не забыть: вывод `formatRange` содержит тонкие пробелы — сравнение в тестах через
   `.replace(/\s/g, " ")` (`mobile/insights.md`).
2. Полные ru/en строки для всего нового: форма (подписи, плейсхолдеры, «Пока без дат», «Создать
   поездку», «Сохранить», сообщения валидации по идентификаторам `TRIP_FIELD_ERROR`, «Ничего не
   нашли — оставим как есть, это тоже подойдёт», «Город · …», «Страна · …»), состояния списков
   (пусто S4, пусто S5, ошибка + «Повторить»), меню «…» (четыре пункта), подтверждение удаления,
   чип «архив», «Поездка не найдена», «дата не выбрана», подписи пустых блоков S7, общий текст
   неизвестной ошибки (AC-60), a11y-подписи и объявления смены состояния (AC-71).
3. **Ключи `trips.cities.*` пока НЕ трогать** (их ещё читают экраны; удаление — шаг 12).

**Критерии готовности:** `parity.test.ts` зелёный (ключи ru и en совпадают, пустых значений нет);
`format.test.ts` покрывает обе локали, 0 ночей, переход через месяц и 29 февраля, и доказывает,
что календарная дата не съезжает на день (AC-72, AC-74).

---

### Шаг 7 — `mobile/`: api-модуль поездок и хуки запросов *(Тир 3)*

**Зависит от:** Шаги 4, 5.

**Владеет файлами:** `mobile/src/features/trips/api/{tripsApi.ts,errors.ts,index.ts}`,
`mobile/src/features/trips/api/__tests__/{tripsApi.test.ts,errors.test.ts}`,
`mobile/src/features/trips/hooks/**` + их тесты.

**Что делать:** §1.4 (часть `api/` и `hooks/`). Guardrail уже допускает `supabase` в
`src/features/*/api/**` (`isFeatureApi`) — **ослаблять правило не нужно**, проверить, что новый
путь под него подпадает. Тайм-аут 15 с обеспечивает существующий `lib/supabase/client.ts` —
не изобретать второй.

**НЕ делать:** не писать экранов; не вводить оптимистичных обновлений и очереди отложенных операций
(Non-goal); не использовать `service_role`; не логировать названия мест, названия поездок и
идентификаторы пользователя.

**Критерии готовности (клиент Supabase замокан):**
- `createTrip` отправляет ровно то тело, что даёт `toTripWrite`: без `title`, когда название пустое
  (AC-31); с полями справочника при выборе подсказки и без них при свободном тексте (AC-15).
- `updateTrip`/`archiveTrip`/`unarchiveTrip`/`deleteTrip` при нуле затронутых строк → `notFound`
  (AC-55, AC-56).
- Ошибки: сетевая → `offline`, тайм-аут → `timeout`, отказ прав → `denied`, неизвестный код →
  `unknown`, **и исходной строки сервера в результате нет** (AC-60).
- Строка, не прошедшая `tripRowSchema`, даёт ошибку загрузки, а не частичные данные, и логируется
  отдельно от сетевой (AC-61).
- Каждая мутация инвалидирует `["trips"]` и `["trips", id]` (AC-42).
- При `session.status !== "signedIn"` ни один запрос не уходит (AC-62).
- Ни один тест не находит `destination`, `title` или `user_id` в аргументах `console.*`.

---

### Шаг 8 — `mobile/`: списки S4 и S5 на реальных данных *(Тир 4)*

**Зависит от:** Шаги 4, 5, 6, 7.

**Владеет файлами:** `mobile/src/features/trips/{TripsScreen.tsx,types.ts,index.ts}`,
`mobile/src/features/trips/components/{TripCard.tsx,TripStatusPill.tsx,TripCoverPlaceholder.tsx,
TripCardSkeleton.tsx,TripListStates.tsx}`, `mobile/src/features/trips/__tests__/**`,
`mobile/src/features/history/**`.

**Что делать:** §1.4 (экранная часть). `FlatList` внутри `<Screen scroll={false}>`; шапка —
`ListHeaderComponent`. Навигация — **объектными href** (`{ pathname: "/trips/[tripId]", params: { tripId } }`):
expo-router сам кодирует параметр, предварительно кодировать нельзя (`mobile/insights.md` 2026-09-19).
Обложка — `coverColors[coverIndexOf(trip.id)]`. Приглушение в «Истории» применяется **только к
подложке обложки**, не к карточке целиком (`design/screens/history.md`, см. §5 N-2).

**НЕ делать:** не удалять `src/mocks/` (шаг 12); не трогать `app/**`; не править guardrails.

**Критерии готовности:**
- Порядок S4 на наборе из будущих, черновых, прошедших и архивных: только неархивные с концом
  не раньше сегодня или без дат, по возрастанию даты начала, без дат — в конце (AC-35).
- S5: завершённые **и** архивные, свежие сверху, плавающей кнопки создания нет (AC-36).
- Архивный чип: текст «архив» (отличный от «завершено»), фон `divider`, цвет `textSecondary` (AC-37).
- Акцентный чип ровно у одной поездки списка; при отсутствии дат — ни у кого (AC-23).
- Загрузка → скелетоны карточек той же высоты, спиннера по центру нет (AC-39).
- Пусто на S4 → короткий текст + подсказка на «+», без иллюстрации; пусто на S5 → одна строка
  и никакой кнопки создания; два состояния независимы (AC-40).
- Ошибка → сообщение + «Повторить», повтор вызывает api снова, пустое состояние **не** показывается (AC-41).
- Цвет обложки не меняется после правки названия и смены языка (AC-38).
- Смена состояния списка объявляется вспомогательным технологиям (AC-71).
- Даты на карточке — моно, название места — не моно (AC-68).
- Список из 200 сгенерированных поездок рендерится без деградации (Non-functional).

---

### Шаг 9 — `mobile/`: шторка создания и правки (S8, S8b) *(Тир 4, параллелен шагу 8)*

**Зависит от:** Шаги 4, 5, 6, 7.

**Владеет файлами:** `mobile/src/features/trip-form/**` (+ тесты), `mobile/app/trips/new.tsx`,
**удаляет** `mobile/src/features/new-trip/**`.

**Что делать:** §1.5. Одна схема и одна форма на оба режима; тесты параметризованы режимом (AC-49).
Клавиатурная безопасность уже обеспечена `Screen` (`automaticallyAdjustKeyboardInsets`) — **не**
вводить `KeyboardAvoidingView` и тем более `Platform.OS`.

**НЕ делать:** не создавать `app/trips/[tripId]/edit.tsx` и не трогать `app/_layout.tsx` (шаг 11 —
иначе маршрут окажется незащищённым, а контрактный тест красным); не удалять `PlaceholderField`
(её использует S9); не придумывать название поездки за пользователя.

**Критерии готовности:**
- Поле «Куда» получает `autoFocus` (AC-28); пока оно пусто после нормализации, кнопка неактивна
  и нарисована фоном `divider` с текстом `textTertiary` — **без** `opacity` (AC-29).
- Ввод «1» → строка «ничего не нашли», кнопка **активна** (AC-14).
- Выбор подсказки → сохраняются поля справочника; дописывание текста после выбора → `custom`
  и очистка полей, акцентная граница гаснет (AC-51, Edge cases).
- Ввод, совпадающий с записью справочника буква в букву **без** выбора подсказки, остаётся `custom`.
- Строка подсказки: название не моно, «Город · Португалия» цветом `textTertiary`, код аэропорта
  моно и только у города (AC-34, AC-68).
- Чекбокс «Пока без дат» скрывает обе кнопки дат, тело запроса уходит без дат (AC-21).
- Ошибки дат показываются у блока «Даты», запрос не уходит (AC-17…AC-19).
- Успешное создание вызывает **замену** (`router.replace`), а не `push` (AC-30).
- Двойное/тройное нажатие → ровно один вызов api (AC-32); то же для «Сохранить».
- «Отмена» закрывает без сохранения и без диалога про черновик (AC-33).
- Режим правки: предзаполнение всех четырёх состояний (место справочное / свободное, даты есть /
  чекбокс установлен), заголовок и кнопка по режиму, после сохранения — возврат на детали (AC-48, AC-50).
- Ошибка мутации: сообщение **внутри шторки** (не системный алерт), все введённые значения на месте,
  повтор одним нажатием (AC-58); при ошибке состояние не меняется (AC-57).
- Каждый новый интерактивный элемент (подсказка, крестик, кнопки дат, чекбокс) — непустая подпись,
  верная роль, зона ≥ 44×44 pt (AC-70).

---

### Шаг 10 — `mobile/`: детали S7, меню «…», архив и удаление *(Тир 5)*

**Зависит от:** Шаг 8 (публичная поверхность `features/trips`), Шаги 6, 7.

**Владеет файлами:** `mobile/src/features/trip-detail/**` (включая удаление `FlightCard.tsx`,
`HotelCard.tsx`, `CarEmptySection.tsx`) + тесты.

**Что делать:** §1.6.

**НЕ делать:** не показывать «Удалить навсегда» у неархивной поездки ни при каких условиях (AC-47);
не использовать системный `Alert` для подтверждения (Q8); не добавлять блоки страховки и документов
(их сейчас нет и в этом спеке не появляется); не трогать `app/**`.

**Критерии готовности:**
- Шапка: место, чип статуса, диапазон дат + число ночей моно; у поездки без дат — «дата не выбрана»
  (AC-43, AC-68).
- Несуществующий id, `../../etc`, id чужой поездки, удалённая поездка → одно и то же состояние
  «Поездка не найдена» с возвратом к списку; никакой другой поездки на экране (AC-44, AC-56).
- Три блока — пустые состояния с пунктирной рамкой `surfaceBorder`, иконкой плюса и подписью
  `textSecondary`; ноль карточек рейсов и отелей (AC-45).
- Меню неархивной поездки: «Изменить», «Отправить в архив» — и **ничего больше**; архивной:
  «Изменить», «Вернуть из архива», «Удалить навсегда» (AC-46, AC-47).
- Архивация оставляет экран деталей открытым и рабочим (AC-52); возврат из архива определяет
  место поездки по её датам, а не по тому, где она лежала (AC-53).
- Без подтверждения `deleteTrip` не вызывается; после подтверждения — возврат в список,
  из которого пришли (AC-54, AC-55).
- Результат действия меню объявляется вспомогательным технологиям (AC-71).
- Двойное нажатие «Отправить в архив»/«Удалить навсегда» → ровно один вызов (Edge case).
- Иконки — Feather через общий `Icon`; ни `…`, ни `×`, ни `+` текстом (AC-69).

---

### Шаг 11 — Маршруты, гейтинг и навигационные тесты *(Тир 6, первый)*

**Зависит от:** Шаги 9, 10. **Блокирует:** шаг 12.

**Владеет файлами:** `mobile/app/_layout.tsx`, `mobile/app/trips/[tripId]/edit.tsx`,
`mobile/app/trips/[tripId]/index.tsx`, `mobile/__tests__/navigation.test.tsx`,
`mobile/__tests__/routes.contract.test.ts`.

**Что делать:**
1. `app/_layout.tsx`: подключить `QueryProvider` (внутри `SessionProvider`, снаружи `Stack`) и
   добавить `<Stack.Screen name="trips/[tripId]/edit" options={{ presentation: "modal" }} />`
   **внутрь** `Stack.Protected` защищённой группы (AC-75).
2. `app/trips/[tripId]/edit.tsx` — тонкий маршрут (≤ 40 строк, `MAX_ROUTE_LINES`): читает `tripId`
   из параметров и рендерит `TripFormScreen` в режиме правки.
3. `routes.contract.test.ts`: добавить `/trips/[tripId]/edit` в `SPEC_ROUTES`.
4. **Переписать `navigation.test.tsx`:** кейсы `/trips/x` и «hostile trip id» теперь ожидают
   состояние «Поездка не найдена» (фолбэк `findTrip` отменён); тап по карточке — из списка,
   отданного замоканным api, а не из моков; добавить кейс «`/trips/<id>/edit` без сессии →
   `/onboarding`».

**Критерии готовности:**
- `routes.contract.test.ts`: множество маршрутов = карта SPEC-01 + `/reset-password` +
  `/trips/[tripId]/edit`; в `app/` нет ни одного не-маршрутного файла.
- `navigation.test.tsx`: маршрут правки недостижим без сессии (AC-75); `tripId` попадает в состояние
  роутера как `params.tripId`, а имя маршрута остаётся `trips/[tripId]/…` даже для `../../etc` (AC-76);
  создание поездки **заменяет** шторку деталями, и «назад» с деталей ведёт в список, а не в шторку (AC-30).
- `pnpm --filter @tripplanner/mobile test` зелёный.

---

### Шаг 12 — Выпиливание моков, профиль, guardrails *(Тир 6, второй)*

**Зависит от:** Шаг 11 (и, значит, 8, 9, 10).

**Владеет файлами:** **удаляет** `mobile/src/mocks/**`; `mobile/src/features/profile/ProfileScreen.tsx`
и `mobile/src/features/profile/__tests__/ProfileScreen.test.tsx`;
`mobile/src/lib/i18n/locales/{ru,en}/trips.ts` (удаление блока `cities`);
`mobile/src/lib/i18n/__tests__/parity.test.ts`; `mobile/__tests__/guardrails.test.ts`.

> Файл `locales/{ru,en}/trips.ts` принадлежит шагу 6 на добавление ключей и шагу 12 на удаление
> `cities.*`. Это **единственное** осознанное пересечение владения во всём плане: удалить ключи
> раньше нельзя (их читают экраны), а добавлять их в шаге 12 значило бы заблокировать шаги 8–10.
> При параллельной раздаче шаг 12 обязан идти строго после слияния шагов 6, 8, 9, 10.

**Что делать:**
1. Удалить каталог `src/mocks/` целиком; убедиться, что ни один файл в `app/` и `src/` не содержит
   `@/mocks` (AC-63).
2. `ProfileScreen`: строки «Подключённые аккаунты» и «Валюта» теряют значения и несут только пометку
   «скоро», как «Уведомления» (AC-65). Тест профиля, пинивший ключи `MOCK_USER`, переписывается.
3. Удалить блок `cities` из обеих локалей; `parity.test.ts` — утверждение, что ключей `cities.*`
   нет ни в одной локали (AC-66).
4. **Добавить два guardrail-правила** (существующие — не ослаблять):
   - `no-mocks-directory`: каталога `src/mocks` не существует и строка `@/mocks` не встречается
     ни в продуктовом коде, ни в тестах (AC-63);
   - `no-direct-clock-outside-clock`: `new Date()` без аргументов и `Date.now(` допустимы **только**
     в `src/lib/clock/**`; идентификаторы вида `MOCK_NOW`/`FIXED_NOW` запрещены везде (AC-64).
   Негативная часть self-теста обязательна: правило должно ловить нарушение в подставном
   фича-файле, иначе оно ничего не проверяет.

**Критерии готовности:** `pnpm -r test` и `pnpm -r typecheck` зелёные; `git status` показывает
`src/mocks/` удалённым; guardrail-набор содержит все прежние правила **плюс** два новых, и его
self-test по-прежнему ловит нарушения (AC-63, AC-64, AC-67, AC-78).

---

### Шаг 13 — Maestro: поток CRUD поездки и обновлённый smoke *(Тир 7)*

**Зависит от:** Шаги 11, 12. **Запустить сейчас нельзя** (Maestro не установлен) — поток авторуется
вслепую, допущения фиксируются в `e2e/insights.md`.

**Владеет файлами:** `e2e/flows/trip-crud.yaml`, `e2e/flows/skeleton-smoke.yaml`, `scripts/e2e.sh`,
`e2e/insights.md`. (Проверить `theme-persistence.yaml` на ссылки на карточки поездок; если есть —
он тоже принадлежит этому шагу.)

**Что делать:** §1.7. Новые строки-селекторы добавить в таблицу локалей `scripts/e2e.sh` вручную
(она зеркалит `locales/*`). Ни одного `id:`/testID-селектора, ни одного литерала интерфейса в YAML.

**Критерии готовности (когда Maestro и рабочий симулятор появятся):** `./scripts/e2e.sh trip-crud`
и `./scripts/e2e.sh skeleton-smoke` зелёные в обеих локалях (AC-80). До этого: `bash -n scripts/e2e.sh`
и сверка — каждая `${VAR}` в YAML имеет строку в таблице скрипта.

---

### Шаг 14 — Документация дизайна, статусы, insights *(Тир 7)*

**Зависит от:** Шаги 1–13.

**Владеет файлами:** `design/screens/{new-trip,trips,history,trip-detail,navigation,account}.md`,
`design/tokens.md`, `mobile/AGENTS.md` (Status), `shared/AGENTS.md` (Status), `supabase/AGENTS.md`
(Status), `e2e/AGENTS.md` (Status), `specs/SPEC-03-trips-crud.md` (только строка
`Implementation Plan:`), `mobile/insights.md`, `shared/insights.md`, `supabase/insights.md`,
`e2e/insights.md`.

**Что делать:** закрыть семь расхождений из раздела спека «Документы дизайна, которые нужно обновить»
(режим правки на S8, чип «архив» и действия из архива на S5, состав меню «…» и «Поездка не найдена»
на S7, состояние ошибки загрузки на S4, «цвет обложки — по идентификатору поездки» в `design/tokens.md`
вместо «по названию города», строки профиля без значений, маршрут правки в `navigation.md`).
Статусы пакетов: у `supabase/` больше не «нет миграций и таблиц», у `shared/` — не «нет типов БД
и доменной логики».

**Критерии готовности:** ни одна строка Status не противоречит коду; `design/tokens.md` не расходится
с AC-38; строка `Implementation Plan:` спека указывает на этот файл; в `insights.md` дописано только
существенное и неочевидное (прочитать и дедуплицировать перед записью).

---

## 4. Definition of Done (вся фича)

**Автоматика (зелёное одной серией из корня):**
```bash
pnpm install
pnpm -r typecheck                      # mobile + shared: tsc --noEmit
pnpm -r test                           # mobile: jest (вкл. переписанные guardrails); shared: vitest
supabase start -x vector && supabase db reset && supabase test db
supabase gen types typescript --local | diff - shared/src/db/database.types.ts   # пусто (AC-8)
cd mobile && npx expo config --type public
./scripts/e2e.sh trip-crud             # когда Maestro и симулятор доступны
./scripts/e2e.sh skeleton-smoke
```
Без единой подавляющей директивы (`@ts-ignore`, `@ts-expect-error`, `eslint-disable`) — AC-79.

**Ручной чек-лист владельца (iOS, на НОВОЙ сборке dev-клиента).**

| # | Проверка | ACs |
|---|---|---|
| M1 | Новый аккаунт: S4 и S5 показывают собственные пустые состояния, чужих поездок нет | AC-40, US-1 |
| M2 | Создание поездки: «+» → «Порту» → «Создать поездку» → сразу детали; «назад» ведёт в список | AC-30 |
| M3 | Выбор дат **системным** выбором даты на устройстве (на старом dev-клиенте экран упал бы) | AC-77 |
| M4 | Авиарежим: список даёт ошибку + «Повторить»; создание даёт сообщение в шторке с сохранённым вводом | AC-41, AC-57, AC-58 |
| M5 | Уход в фон во время мутации → по возвращении результат, а не вечный индикатор | Edge case |
| M6 | Второй аккаунт: открыть `/trips/<id чужой поездки>` по ссылке → «Поездка не найдена» | AC-44, US-9 |
| M7 | Архив → «История» с чипом «архив» → «Вернуть из архива» → поездка встаёт по своим датам | AC-52, AC-53 |
| M8 | «Удалить навсегда» только из архива, с подтверждением; после — нет ни в одном списке | AC-47, AC-54, AC-55 |
| M9 | Обход S4, S5, S7, S8, S8b в светлой и тёмной теме с измерением контраста (особенно подсказки `textTertiary` на стекле) | AC-73 |
| M10 | VoiceOver: подсказки мест, чекбокс, меню «…», «Повторить»; смена состояния списка и результат действия произносятся | AC-70, AC-71 |
| M11 | Dynamic Type: шторка и карточки не ломаются; очень длинное название усекается многоточием | Edge cases |
| M12 | Читаемость кода аэропорта моношрифтом: `OPO` у Порту — буквы, и `O`/`0` различимы в Plex Mono | Edge case |
| M13 | Смена языка устройства: справочное место переводится, свободный текст показывается как введён | Q3 |
| M14 | Логи dev-клиента при неуспешной операции: имя операции и код ошибки, без названий мест и id пользователя | Безопасность (A09) |
| M15 | Обход изменённых экранов на ru и en: непереведённых строк и ключей нет | AC-72 |

---

## 4a. Трассируемость AC → шаг → проверка

**Проверено при составлении плана: все 80 AC имеют минимум один шаг и минимум один критерий. Непокрытых нет.**

| AC | Шаг(и) | Чем проверяется |
|---|---|---|
| AC-1 | 3 | `supabase db reset` на чистом стенде |
| AC-2 | 3 | `trips_rls.test.sql` (владелец: select/insert/update/delete) |
| AC-3 | 3 | `trips_rls.test.sql` (второй пользователь: 0 строк, 0 затронутых) |
| AC-4 | 3 | `trips_rls.test.sql` (роль `anon`) |
| AC-5 | 3 | `trips_rls.test.sql` (insert с чужим `user_id`) |
| AC-6 | 3 | `trips_rls.test.sql` (каскад от `auth.users`); M8 косвенно |
| AC-7 | 3 | `trips_constraints.test.sql` (по тесту на ограничение) |
| AC-8 | 3, 4 | повторная генерация без диффа; схемы `shared` импортируют тип строки |
| AC-9 | 7, 12 | guardrails `no-service-role` / `backend-only-behind-the-boundary`; M14 |
| AC-10 | 4 | тест справочника (размер, обязательные поля) |
| AC-11 | 4 | тест целостности (IATA, `Intl` tz, уникальность id, ru/en) |
| AC-12 | 4 | тесты поиска («Пор»/«por», лимит 4, только с начала) |
| AC-13 | 4 | синхронность и отсутствие запрещённых импортов в `shared` |
| AC-14 | 6, 9 | тест поля: «1» → сообщение, кнопка активна; строка в обеих локалях |
| AC-15 | 4, 7 | `toTripWrite` (оба варианта); тело запроса в `tripsApi.test.ts`; pgTAP-ограничения |
| AC-16 | 4 | схема: значение со временем отвергается |
| AC-17 | 4, 9 | схема (`dates.incomplete`) + тест блока «Даты» |
| AC-18 | 4 | схема (`dates.endBeforeStart`) |
| AC-19 | 4 | схема (границы 365/366) |
| AC-20 | 4, 13 | `deriveTripStatus` для прошедших дат; поток Maestro |
| AC-21 | 9 | тест чекбокса: кнопки исчезают, тело запроса без дат |
| AC-22 | 4 | таблица случаев, включая «конец = сегодня» |
| AC-23 | 4, 8 | `pickUpcomingTripId`; акцентный чип ровно у одной карточки |
| AC-24 | 5 | тесты с подменённым источником времени, без подмены глобальных часов |
| AC-25 | 4, 10 | `nightsBetween` (0 ночей, месяц, 29 февраля); шапка S7 |
| AC-26 | 4 | тесты нормализации и длин |
| AC-27 | 4 | литеральный список идентификаторов в тесте; в `shared` нет текстов |
| AC-28 | 9 | `autoFocus` у поля «Куда»; M2 |
| AC-29 | 9 | стиль и состояние кнопки (`divider`/`textTertiary`, без `opacity`) |
| AC-30 | 9, 11 | вызов `replace`, не `push`; `navigation.test.tsx`; M2 |
| AC-31 | 4, 8, 9 | тело запроса без `title`; карточка показывает место |
| AC-32 | 9 | двойное нажатие → один вызов api |
| AC-33 | 9 | «Отмена» закрывает без сохранения и без диалога |
| AC-34 | 9 | типографические роли элементов подсказки; M9 |
| AC-35 | 4, 8 | сортировка/фильтр в `shared` + тест списка S4 |
| AC-36 | 4, 8 | то же для S5; отсутствие кнопки создания |
| AC-37 | 8 | чип «архив» по статусу; M9 |
| AC-38 | 4, 8 | `coverIndexOf` (стабильность, покрытие палитры) + карточка |
| AC-39 | 8 | состояние загрузки рендерит скелетоны, не спиннер |
| AC-40 | 8 | два независимых пустых состояния; M1 |
| AC-41 | 8 | мок ошибки → сообщение + «Повторить» вызывает api снова; M4 |
| AC-42 | 7 | инвалидация после каждой мутации |
| AC-43 | 10 | тест шапки (дата/ночи/«дата не выбрана») |
| AC-44 | 10, 11 | четыре случая → одно состояние; `navigation.test.tsx`; M6 |
| AC-45 | 10 | три пустых состояния, ноль карточек |
| AC-46 | 10 | состав меню в обоих состояниях |
| AC-47 | 10 | меню неархивной поездки не содержит удаления |
| AC-48 | 9 | предзаполнение всех четырёх состояний |
| AC-49 | 4, 9 | один модуль схемы, тесты формы параметризованы режимом |
| AC-50 | 9 | сохранение → возврат на детали с обновлёнными данными |
| AC-51 | 4, 9 | оба перехода места; pgTAP-ограничение не нарушается |
| AC-52 | 7, 10 | архивация: списки обновлены, экран деталей жив; M7 |
| AC-53 | 4, 10 | архивная с будущими датами → S4, с прошедшими → S5; M7 |
| AC-54 | 10 | без подтверждения api не вызывается |
| AC-55 | 7, 10 | ноль строк после удаления; возврат в список; M8 |
| AC-56 | 7, 10 | `notFound` при нуле затронутых строк → «не найдена» |
| AC-57 | 7, 9 | при ошибке состояние не меняется; M4 |
| AC-58 | 9, 10 | сообщение в шторке/на экране, значения сохранены, повтор; M4 |
| AC-59 | 7 | тайм-аут 15 с клиента `lib/supabase` (мок зависшего запроса) |
| AC-60 | 6, 7 | неизвестный код → общий текст, исходной строки нет |
| AC-61 | 7, 12 | «повреждённая строка → ошибка»; guardrail границы |
| AC-62 | 7 | при `signedOut` ни одного запроса |
| AC-63 | 12 | guardrail `no-mocks-directory` |
| AC-64 | 5, 12 | guardrail `no-direct-clock-outside-clock` + тесты статусов |
| AC-65 | 12 | тест профиля: значений `Booking.com`/`EUR` нет |
| AC-66 | 12 | `parity.test.ts`: ключей `cities.*` нет |
| AC-67 | 8, 9, 10, 12 | guardrails `no-hex-…`, `no-font-names-…`; M9 |
| AC-68 | 8, 9, 10 | типографические роли (моно только у билетных данных); M12 |
| AC-69 | 9, 10 | тест `Icon` + guardrail на текстовые символы |
| AC-70 | 8, 9, 10 | подписи, роли, зоны ≥ 44 pt; M10 |
| AC-71 | 8, 10 | объявление смены состояния и результата действия; M10 |
| AC-72 | 6 | `parity.test.ts`; M15 |
| AC-73 | — (ручная) | M9 |
| AC-74 | 6 | `format.test.ts` в обеих локалях |
| AC-75 | 11 | `navigation.test.tsx`: маршрут правки недостижим без сессии |
| AC-76 | 8, 10, 11 | имя маршрута и `params.tripId` в состоянии роутера |
| AC-77 | 1, 5 | изолированная граница выбора даты + мок; M3 |
| AC-78 | 5, 12 | guardrail `no-platform-os-outside-platform` |
| AC-79 | все | `pnpm -r typecheck`, `pnpm -r test`, `supabase test db` (§4) |
| AC-80 | 13 | `e2e/flows/trip-crud.yaml` |

---

## 4b. Чего делать НЕЛЬЗЯ (стоп-лист implementer'а)

1. Никаких таблиц, кроме `trips`: ни `flights`, ни `hotels`, ни `cars`, ни `bookings`, ни `documents`.
2. Никакого поля `source`, `status`, `cover_index`, валюты и ссылок на попутчиков в `trips`.
3. Никаких действий против **хостингового** Supabase: ни `db push`, ни `db reset`, ни дашборда.
   Только локальный стенд (`supabase start -x vector`).
4. Не редактировать применённую миграцию — только новая.
5. Ни одной таблицы без RLS и без pgTAP-теста политики. Клиентский фильтр в запросе — удобство,
   не защита: доказательством отказа остаётся тест на уровне БД.
6. `service_role` в `mobile/` — ни в коде, ни в `.env`, ни в примере. В `EXPO_PUBLIC_*` — только
   URL и анонимный ключ.
7. Никакого `@supabase/supabase-js` вне `src/lib/supabase/client.ts`; никакого `supabase` вне
   `lib/supabase`, `lib/session`, `features/*/api`.
8. Никакого `Platform.OS` / `.ios.*` / `.android.*` вне `src/platform/**`; нативный выбор даты —
   только за этой границей.
9. Никакой правки `mobile/ios/**` и `mobile/android/**` руками (CNG).
10. Никаких `@ts-ignore` / `@ts-expect-error` / `eslint-disable`.
11. Никаких литеральных пользовательских строк вне `src/lib/i18n/locales/**`; никаких hex-цветов,
    «магических чисел» и имён шрифтов вне `src/lib/theme/**`. Нужного токена нет — добавить
    сначала в `design/tokens.md`, потом в тему.
12. Никаких оптимистичных обновлений, очередей записи, локальной БД и офлайн-кэша списка (Non-goal):
    приложение не делает вид, что операция прошла.
13. Никакого «удалить навсегда» в обход архива и никакой корзины.
14. Никакого системного `Alert` для подтверждения удаления и для ошибок форм.
15. Никакого внешнего геокодера, Places API, ключей и сетевых вызовов ради подсказок мест.
16. Не удалять `PlaceholderField` (её используют формы S9) и не трогать `features/booking-form`.
17. Не удалять и не ослаблять ни одного существующего guardrail-правила «чтобы прошло».
18. Не переименовывать существующие маршруты: добавляется ровно один — `/trips/[tripId]/edit`.
19. Не придумывать название поездки за пользователя и не писать его в `title`.
20. Ни одного нового ключа в `src/lib/storage/keys.ts` и ни одного нового системного разрешения.

---

## 5. Риски, допущения, расхождения и вопросы

**Допущения (если неверны — остановиться и спросить):**
- A-1. Всё делается на **локальном** Supabase; хостинговый проект не создаётся и не трогается (Q12).
- A-2. Данные справочника мест собираются вручную в рамках этого плана (детерминированно, без API
  и LLM); ошибочная запись — дефект данных, ловится тестом AC-11 и ручной сверкой (см. Q-E).
- A-3. Приёмка на iOS; код кросс-платформенный, Android не проверяется.
- A-4. Записи брони (рейсы, отели, авто) в этом плане не появляются даже «на будущее».

**Риски:**
- **R-1 (расписание, высокий).** Нативный выбор даты требует **новой сборки dev-клиента**: до неё
  ни один ручной пункт про даты (M3) проверить нельзя, а на старом клиенте экран упадёт. Сборка —
  шаг 1, и она же повторно проверяет, что плагин `withIosSceneLifecycle` спасает старт на iOS 27.
- **R-2 (технический).** Создание пользователей `auth.users` прямо в pgTAP-тесте зависит от набора
  обязательных полей в установленной версии GoTrue (`instance_id`, `aud`, `role`, `encrypted_password`).
  Проверить фактическую схему `\d auth.users` на стенде, а не копировать рецепт из интернета.
- **R-3 (инструментальный).** Способ включения pgTAP не проверен: план включает расширение **внутри**
  транзакции теста. Если `supabase test db` установленной CLI этого не допускает — **фолбэк:**
  отдельная миграция `enable_pgtap` (`create extension if not exists pgtap with schema extensions`),
  и тогда это фиксируется как осознанное расширение прод-схемы.
- **R-4 (технический).** Снятие диакритики через `normalize("NFD")` + `\p{Diacritic}` не проверено
  в Hermes. **Фолбэк:** таблица фолдинга на ~40 латинских символов прямо в `shared/src/places/fold.ts`
  (полностью детерминированно, без Unicode-property-escape'ов). Решается тестом в `shared`,
  но окончательно — только на устройстве.
- **R-5 (тестовый).** `renderRouter` работает на фейковых таймерах и оборачивает приложение в
  синтетический `__root` (`mobile/insights.md`); новые асинхронные состояния списка потребуют
  `await act(async () => {})`, а не `setTimeout`. Закладывать это в шаг 11, а не выяснять на месте.
- **R-6 (инструментальный).** Maestro не установлен — поток `trip-crud.yaml` авторуется вслепую;
  он к тому же первый поток, который **создаёт данные на сервере**: у него должен быть свежий аккаунт
  на каждый прогон (механизм `RUN_ID` в `e2e.sh` уже есть).
- **R-7 (продуктовый, не блокирует).** Спек требует «сегодня» по часам устройства. Пользователь
  с переведёнными часами увидит другой статус — это осознанное решение спека (Edge case), не дефект.
- **R-8 (производительность).** Бюджет 5 мс на подсказку при линейном проходе по ~255 записям
  не измерялся на устройстве. Если не уложится — сначала измерить, и только потом думать про индекс
  (спек прямо запрещает строить индекс при старте).

**Расхождения спека и кода, найденные при планировании (не чиним молча):**
- **N-1.** `design/tokens.md` говорит «цвет обложки — по названию города», AC-38 требует «по
  идентификатору поездки». Правится **документ** (решение Q2 спека), шаг 14.
- **N-2.** `TripCoverPlaceholder` не использует `coverColors` вовсе (рисует `accent` с четырьмя
  уровнями непрозрачности) и приглушает «Историю» через `opacity: 0.55` на всей обложке, что прямо
  запрещено `design/screens/history.md` («приглушение — свойство подложки, а не карточки»).
  Шаг 8 всё равно переписывает этот файл под AC-38, поэтому чинит и приглушение (подложка, не карточка).
  Это **исправление дефекта SPEC-01**, а не расширение продуктового объёма — см. вопрос Q-D.
- **N-3.** `TripsScreen`/`HistoryScreen` строят href шаблонной строкой (`/trips/${id}`), хотя
  `mobile/insights.md` (2026-09-19) требует объектных href для динамических сегментов. Шаг 8 чинит.
- **N-4.** `design/screens/navigation.md` содержит маршруты, которых в коде нет
  (`profile/delete-account`, `trips/[tripId]/documents`, `hotels/[hotelId]`, `cars/[carId]`).
  Этот план их **не создаёт**; факт зафиксирован, документ правится только в части маршрута правки.
- **N-5.** `e2e/flows/skeleton-smoke.yaml` держится на моках (открывает S7 тапом по карточке
  Лиссабона). После шага 12 он гарантированно красный — см. Q-C.
- **N-6.** `mobile/src/features/trips/types.ts` описывает `TripCardData` как «мок сегодня»;
  `TripStatusKind` не знает статуса `archived`. Шаг 8 приводит тип к доменной модели `shared`.

**Вопросы владельцу (все — с вариантом по умолчанию; ни один не блокирует старт шагов 1–3):**
- **Q-A.** `country_code`: план берёт **ISO 3166-1 alpha-2** (`PT`, ограничение `^[A-Z]{2}$`).
  Спек говорит просто «ISO-код страны». Подтвердить alpha-2 или выбрать alpha-3.
- **Q-B.** Режим выполнения: по умолчанию **single-agent, строго по порядку**. Тир 1 (шаги 2, 3, 6)
  и тир 4 (шаги 8, 9) файл-непересекающиеся и могут быть розданы параллельно. Подтвердить.
- **Q-C.** `skeleton-smoke.yaml` после выпиливания моков видит **пустой** список поездок.
  *По умолчанию:* поток переписывается так, что перед обходом S7 он создаёт поездку (шаг 13).
  Альтернатива — убрать S7 из smoke и оставить его только в `trip-crud`.
- **Q-D.** Чинить ли заодно приглушение карточки в «Истории» (N-2: `opacity` на карточке →
  приглушение подложки)? *По умолчанию:* да — файл всё равно переписывается, а текущее поведение
  нарушает `design/screens/history.md` и рискует контрастом (AC-73).
- **Q-E.** Справочник мест: ~195 стран + ~60 городов собираются implementer'ом вручную, корректность
  IATA/таймзон проверяется тестом (формат) и ручной сверкой (содержание). Подтвердить, что владелец
  готов принять данные без внешнего источника, либо дать свой список городов.
