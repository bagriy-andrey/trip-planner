# Implementation Plan: Профиль — блок «О себе», домашняя валюта, общая шторка выбора (SPEC-06)

**Spec:** `specs/SPEC-06-profile-about-me.md` (Status: draft, 2026-09-24). Спек — источник истины для WHAT.
Этот документ описывает только HOW: файлы, модули, порядок, команды и критерии готовности.
**Status:** planning
**Scope:** `supabase/` (таблица `profiles`, RLS, pgTAP), `shared/` (модуль `profile`, флаг из кода
страны, поиск шторки в `places`/`money`, названия валют, предзаполнение первого сегмента, правило
стоимости отеля AC-39, регенерированные типы БД), `mobile/` (общая шторка выбора в `components/`,
фича `profile`: api, хуки, S6; `segment-form` и `hotel-form` получают домашние значения; namespace
`picker` ru/en; guardrail), `e2e/` (один поток, можно отложить), `design/screens/*`, `AGENTS.md`
(корень и пакеты), `*/insights.md`.
**Platforms:** ios+android. Платформенно различается только знак флага (AC-22): модуль
`src/platform/flag.ts`, эмодзи на обеих платформах по умолчанию. Шторка хостится в RN `Modal`: это
кроссплатформенное ядро RN, поэтому её код лежит в `components/`, а не в `platform/`. **Новых
нативных зависимостей нет, dev-клиент пересобирать не нужно.**
**Execution mode:** по умолчанию **single-agent, строго по порядку шагов**. Тир 1 (шаги 1, 2, 3)
и тир 4 (шаги 7, 8, 9) не пересекаются по файлам, их можно раздать параллельным implementer'ам.
Решает владелец, см. Q-A в §5.
**Открытые вопросы спека Q1–Q6 приняты по умолчанию, как записано в спеке:** «Подключённые
аккаунты» — только «скоро»; домашний аэропорт — только в первый сегмент; «Не указано» —
`textSecondary`; у «Валюты» есть подпись «Подставим в стоимость нового отеля»; валюта без суммы
сохраняет отель без стоимости; шторка аэропорта показывает весь `AIRPORTS`.

---

## 0. Что уже существует (проверено чтением репозитория 2026-09-24)

| Артефакт | Фактическое состояние | Вывод для плана |
|---|---|---|
| `supabase/migrations/` | Пять миграций. `…_trips.sql` содержит `public.set_updated_at()` и образец RLS с прямым `user_id` (`user_id uuid not null default auth.uid() references auth.users on delete cascade`, 4 политики `to authenticated`) | Шаг 1 добавляет **шестую** миграцию. Форма RLS — как у `trips`, но **без** политики `delete`. `set_updated_at()` переиспользуется. Применённые миграции не трогаем |
| `supabase/tests/*_rls.test.sql` | `trips_rls`/`trip_segments_rls` считают строки по всей таблице и краснеют на непустой БД (`supabase/insights.md`, 2026-09-23). `trip_hotels_rls` считает только свои фикстуры | Новый RLS-файл считает **только свои фикстуры** (`where user_id in (…)`) |
| `shared/src/places/` | `PLACE_DIRECTORY` (197 стран + 100 городов, `CityRecord.airportCode?`), `AIRPORTS` (391, `isPrimary`, `cityId`, `countryCode`), `foldForSearch` (явная таблица, `ё→е`, `й→и`), `searchPlaces`/`searchCities`/`searchAirports` (лимит 4), `findCityById`, `findAirportByCode`, `primaryAirportOfCity`, `cityOfAirport` | Поиск шторки — **новые** функции без лимита, рядом со старыми. Старые функции с лимитом 4 не трогаем (контракт спека). Индексы `places/index.ts` и `money/index.ts` уже реэкспортируются из `shared/src/index.ts`, поэтому новые функции в этих модулях корневой индекс не трогают |
| `shared/src/money/currencies.ts` | `CURRENCIES` (40 кодов, порядок = порядок UI), `isCurrencyCode`, `searchCurrencies` (префикс кода, лимит 4) | Названий валют в `shared` нет: они лежат в i18n `hotel.form.currencyName.*` (только mobile). См. решение D-1 |
| `shared/src/segments/prefill.ts` | `firstSegmentPrefill(trip)` → `{ fromAirport: <аэропорт города поездки>, departureDate }`. Это дрейф от SPEC-04 AC-38 (`mobile/insights.md` 2026-09-24). Потребитель один: `segment-form/SegmentFormScreen.tsx` → `segmentFormFromFirstPrefill` | Контракт меняется. Он меняется **в том же шаге**, что и потребитель (шаг 8), иначе mobile-тесты краснеют между шагами |
| `shared/src/hotels/schemas.ts` | «Валюта без суммы» → `cost.amountMissing` (стр. ~270). Id есть в `HOTEL_FIELD_ERROR` и в зафиксированном списке `form.test.ts` | AC-39 меняет правило и убирает id. Это делается в одном шаге с mobile-формой отеля (шаг 9) |
| `shared/src/trips/__tests__/purity.test.ts` | Сканирует `places/ trips/ forms/ hotels/ money/`. Кириллица разрешена только в `directory.ts`/`airports.ts`/`fold.ts`, `Intl` — только в `places/timeZone.ts` | Шаг 2 добавляет в скан `profile/` и разрешает кириллицу в `money/currencyNames.ts`. Сортировка «по алфавиту» идёт **без `Intl`**, см. §1.2 |
| `shared/src/auth/__tests__/schemas.test.ts` | Строковый литерал `"from"` вне `__tests__` даёт ложное срабатывание (`shared/insights.md`) | В новых файлах `"from"` не использовать нигде, в том числе в комментариях в кавычках |
| `mobile/src/features/profile/` | `ProfileScreen.tsx`: заголовок, `ProfileHeader` (аватар константой **72**), одна `GlassSurface`, внутри которой `ThemeSettingRow` и три `SoonSettingRow`, затем «Выйти». Нет ни api, ни хуков, ни `useQuery` | Экран собирается заново по AC-9. Тема выносится под карточку. Появляются api и хуки |
| `mobile/src/features/hotel-form/components/CurrencySheet.tsx` | Своя шторка: подстрочный поиск (`filterCurrencies`), строка «Не выбрана», названия из `hotel.form.currencyName.*`, in-tree `AnimatedSheetOverlay`. Монтируется в `HotelFormBody`. `CostField` показывает плейсхолдер `t("form.field.currencyPlaceholder")` = «EUR» | Файл удаляется (AC-41). Форма получает общую шторку валюты. Ключи `currencyName.*` и `form.currency.*` удаляются тем же шагом, который удаляет их последнего потребителя (шаг 9) |
| `mobile/src/components/AnimatedSheetOverlay.tsx` | In-tree `absoluteFill`, fade подложки + slide панели на `Animated` (native driver), «Уменьшить движение», панель прижата к низу по высоте контента, «ручки» нет | Шаг 5 добавляет необязательные `topInset` и `handle` с сохранением обратной совместимости. Хост поверх таб-бара — RN `Modal` в новой шторке, см. решение D-2 |
| `mobile/src/components/icons.ts` | Есть `check`, `close` (x), `chevron`. **Нет `search`** | Шаг 5 добавляет `search` (Feather) |
| `mobile/src/lib/theme/metrics.ts` | `layout.sheetTopInset 104`, `sheetHandleW 36`, `sheetHandleH 4`, `radius.sheet 26`, `layout.avatarProfile 56`, `motion.sheetEnter/Exit` | Новых токенов не нужно |
| `mobile/src/lib/query/QueryCacheGuard.tsx` | Очищает **весь** кэш при смене или окончании личности | AC-30 уже выполняется для любого ключа. Дополнительно ключ профиля содержит `userId` (§1.6), тест пишется |
| `mobile/src/features/trips/api/errors.ts` | `mapTripError` + `TripErrorKind` (`notFound/offline/timeout/denied/unknown`), экспорт через `@/features/trips` | Классификатор переиспользуется (как у transport/hotels), копия не пишется |
| `mobile/__tests__/navigation.test.tsx`, `features/profile/__tests__/ProfileSignOut.test.tsx` | Real-route тесты, которые доходят до `/profile`. `@/lib/supabase` замокан только с `auth` | После шага 7 экран S6 делает `useQuery`, поэтому оба файла мокают `@/features/profile/api` (урок `mobile/insights.md` 2026-09-22). Оба файла принадлежат шагу 7 |
| Тесты `segment-form`/`hotel-form` | Мокают `@/lib/supabase` как `{ supabase: { from: jest.fn() } }` | Без мока profile-api загрузка профиля падает в ошибку `unknown`, а форма открывается без домашних значений. Это и есть AC-36. Новые тесты с профилем мокают `@/features/profile/api` явно |
| `mobile/__tests__/guardrails.test.ts` | `backend-only-behind-the-boundary`, `no-credentials-in-logs` (в логах допустимы только `operation`/`errorCode`), `no-platform-os-outside-platform`, `no-cyrillic-outside-locales` и др. | Шаг 6 добавляет одно узкое правило `profiles-table-only-in-profile-api` |
| `AGENTS.md` (корень) | Исключение «флаг страны эмодзи» **уже добавлено** владельцем (не закоммичено). Файл занимает 120 строк, лимит 100 | Шаг 11 вносит оставшиеся три правки (две про валюту, моно для кодов). Правки **заменяют** строки и не добавляют новые |

---

## 1. Разбивка по модулям

Направление зависимостей: **миграция → типы БД → `shared/profile` → api `mobile` → экраны**.
Чистая логика `shared` (поиск, связи, флаг, предзаполнение) от БД не зависит и идёт параллельно
с миграцией.

### Решения, которые иначе переоткроют вслепую

- **D-1. Названия валют переезжают в `shared`** (`money/currencyNames.ts`: `{ ru, en }` на каждый
  код `CURRENCIES`). Причина: AC-17 ищет по началу названия **на ru или en** независимо от языка
  интерфейса, а поиск живёт в `shared` (контракт спека). Это тот же приём, что у справочника мест:
  названия как данные. i18n-ключи `hotel.form.currencyName.*` удаляются (AC-41: «один набор, без
  дублирования»). Кириллица в этом файле добавляется в allowlist `purity.test.ts`.
- **D-2. Хост шторки — RN `Modal`** (`transparent`, `animationType="none"`, `statusBarTranslucent`,
  `navigationBarTranslucent`, `onRequestClose` = «назад» на Android), внутри анимированная панель.
  `Modal` перекрывает таб-бар (AC-15), нативно изолирует дерево доступности (AC-44), не пушит маршрут
  (`mobile/insights.md` 2026-09-22 про гонку `Modal` с модальным маршрутом здесь не срабатывает:
  шторка никуда не переходит) и одинаково работает на iOS и Android. Один хост на оба места:
  в форме отеля шторка монтируется там же, где сейчас `CurrencySheet` (тело экрана). Если на
  устройстве `Modal` поверх модального маршрута формы отеля поведёт себя плохо, запасной вариант —
  проп `presentation="inline"` (см. R-2). Заранее он не строится.
- **D-3. Алфавитная сортировка без `Intl`.** В `shared` `Intl` разрешён только для таймзон
  (`purity.test.ts`). Поэтому список сортируется по `foldForSearch(name[lang])` сравнением строк
  по кодовым точкам, при равенстве — по `id`. Для ru после свёртки `ё→е` порядок кодовых точек
  совпадает с алфавитом. Для en — латиница. Цена: `й` сортируется как `и` (свёртка), это
  допустимо (R-4).
- **D-4. Ключ запроса профиля содержит `userId`** (`["profile", userId]`). Даже до того, как
  `QueryCacheGuard` очистит кэш, новый пользователь не прочитает чужой ключ (AC-30).
- **D-5. Запись — `upsert` только изменённых колонок + `user_id` из сессии**, `onConflict:
  "user_id"`. `user_id` передаётся явно: так цель конфликта детерминирована в PostgREST. RLS
  `with check (user_id = auth.uid())` отклоняет любой другой id (AC-4). В теле нет ни
  `created_at`, ни `updated_at`, ни неизменённых колонок (AC-8).
- **D-6. Записи сериализуются, а показ оптимистичный.** Мутации профиля идут с TanStack
  `scope: { id: "profile-save" }` (v5.103 поддерживает `scope`): следующая запись уходит только
  после ответа на предыдущую, поэтому порядок в БД совпадает с порядком выбора (AC-32). На экране
  показывается «кэш сервера + очередь ожидающих патчей по порядку». Успех n кладёт ответ сервера
  в кэш и снимает патч n. Ошибка n снимает патч n (откат группы, AC-31) и показывает сообщение.
  Поздний ответ на ранний патч ничего не откатывает: он никогда не приходит после позднего.

### 1.1 `supabase/` — таблица `profiles` (шаг 1)

Файл: `supabase migration new profiles`.

```sql
-- SPEC-06: one optional "about me" row per user. Lazy upsert: no row = every field empty.
create table public.profiles (
  user_id                  uuid primary key default auth.uid()
                           references auth.users (id) on delete cascade,
  citizenship_country_code text,
  residence_country_code   text,
  home_city_place_id       text,
  home_airport_code        text,
  home_currency            text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  constraint profiles_citizenship_fmt   check (citizenship_country_code is null
                                               or citizenship_country_code ~ '^[A-Z]{2}$'),
  constraint profiles_residence_fmt     check (residence_country_code is null
                                               or residence_country_code ~ '^[A-Z]{2}$'),
  constraint profiles_home_city_fmt     check (home_city_place_id is null
                                               or (char_length(home_city_place_id) <= 64
                                                   and home_city_place_id ~ '^city-[a-z0-9-]+$')),
  constraint profiles_home_airport_fmt  check (home_airport_code is null
                                               or home_airport_code ~ '^[A-Z]{3}$'),
  constraint profiles_home_currency_fmt check (home_currency is null
                                               or home_currency ~ '^[A-Z]{3}$')
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- No delete policy: clearing a field writes null; the row goes only with the user (cascade).
```

Отдельного индекса не нужно: PK по `user_id` и есть индекс. Справочников в БД нет. Проверяется
**только формат**, как требует спек: принадлежность к справочнику и связь «город ↔ страна» — это
запись в `shared` (§1.4).

**pgTAP:**

| Файл | Что доказывает |
|---|---|
| `supabase/tests/profiles_rls.test.sql` (~22) | RLS включён; `policies_are` — ровно 3 политики (без delete) (AC-2). Владелец: upsert (`insert … on conflict (user_id) do update set <одна колонка> = excluded.<колонка>` — так пишет PostgREST) создаёт строку; повторный upsert **одной** колонки не обнуляет остальные (AC-7, AC-8); select своей строки. Другой пользователь: select → 0 строк, update → 0 затронутых, значения не изменились (AC-3). Insert с чужим `user_id` → `42501`; update, меняющий `user_id` на чужой → `42501` (AC-4). `delete` владельцем → 0 затронутых, строка на месте (нет политики). `anon`: 0 строк на select/update и `42501` на insert (`supabase/insights.md`). `delete from auth.users` → строк профиля с этим `user_id` нет (AC-5). **Все подсчёты идут только по своим фикстурам** (`where user_id in (<фикстуры>)`) |
| `supabase/tests/profiles_constraints.test.sql` (~12) | AC-6: по одной падающей вставке на каждое из **5** ограничений (`pl`, `POL`, `city-` + 60 символов → 65, `City-krakow`, `krk`, `eur`, `EU`). Каждая колонка принимает `null`. Число CHECK-ограничений закреплено через `pg_constraint where conrelid = 'public.profiles'::regclass and contype = 'c'` = 5. Триггер `updated_at` проверяется приёмом «вставить со старым `updated_at`, обновить, сравнить с `now()`». Значение вне справочника, но правильного формата (`XK`, `city-unknown`, `ZZZ`), принимается |

Пишется ровно по тесту на каждое ограничение, которое реально есть в DDL (урок PLAN-04/05:
расхождение прозы и DDL).

**Типы:** `supabase gen types typescript --local > shared/src/db/database.types.ts` (AC-1).
Против хостингового проекта ничего не запускается.

### 1.2 `shared/` — поиск шторки, флаг, названия валют, связи профиля (шаг 2)

Всё здесь — чистый TS без БД. Каждый новый файл попадает в скан `purity.test.ts`.

```
shared/src/places/flag.ts          flagEmojiOf(countryCode: string): string | null — только для
                                   ^[A-Z]{2}$ (COUNTRY_CODE_PATTERN), иначе null (Untrusted inputs:
                                   произвольная строка из БД во флаг не превращается). Строится через
                                   String.fromCodePoint(0x1F1E6 + (c - 65)) — без литерала эмодзи
                                   в исходнике
shared/src/places/pickerSearch.ts  Поиск шторки, БЕЗ лимита (AC-17, AC-19):
                                   searchCountryOptions(query, lang): CountryRecord[]
                                   searchCityOptions(query, lang, residenceCountry: string | null): CityRecord[]
                                   searchAirportOptions(query, lang, homeCityId: string | null): AirportRecord[]
                                   countryHasCities(countryCode): boolean   (для AC-26)
shared/src/places/index.ts         + экспорт flag и pickerSearch
shared/src/money/currencyNames.ts  CURRENCY_NAMES: Record<CurrencyCode, { ru: string; en: string }> —
                                   ровно 40 ключей (тест: множество ключей === CURRENCIES).
                                   Русские названия берутся из нынешнего mobile hotel.ts (currencyName.*),
                                   английские — из en/hotel.ts, текст дословно, чтобы UI не поменялся
shared/src/money/currencySearch.ts searchCurrencyOptions(query, lang): CurrencyCode[]
shared/src/money/index.ts          + экспорт CURRENCY_NAMES, searchCurrencyOptions
shared/src/profile/errorCodes.ts   PROFILE_WRITE_ERROR (список ниже; контракт с mobile)
shared/src/profile/types.ts        Profile = { citizenship, residence, homeCityId, homeAirport,
                                   homeCurrency } (все string | null); EMPTY_PROFILE; ProfileField =
                                   "citizenship" | "residence" | "homeCity" | "homeAirport" | "homeCurrency";
                                   ProfilePatch = Partial<Profile>
shared/src/profile/links.ts        applyProfileChoice(current: Profile, field, value: string | null):
                                   ProfilePatch | null — ЕДИНСТВЕННОЕ место правил AC-23…AC-25 и
                                   «повторный выбор = без записи» (AC-20)
shared/src/profile/validate.ts     validateProfilePatch(current, patch): { ok: true } | { ok: false;
                                   errors: ProfileWriteErrorId[] } — проверка при записи
shared/src/profile/defaults.ts     homeCurrencyDefault(value: string | null): CurrencyCode | null
                                   (isCurrencyCode, иначе null — AC-38, edge case «не из CURRENCIES»)
shared/src/profile/__tests__/      links.test.ts, validate.test.ts, defaults.test.ts
shared/src/places/__tests__/       flag.test.ts, pickerSearch.test.ts (новые файлы; старые search-тесты не трогать)
shared/src/money/__tests__/        currencySearch.test.ts, currencyNames.test.ts
shared/src/trips/__tests__/purity.test.ts  + /src/profile/ в скане; allowlist кириллицы:
                                   /money/currencyNames.ts ("currency NAMES are data, not UI text")
```

**Правила поиска (одинаковые для всех четырёх списков):**
- `q = normalizeQuery(query)` (свёртка `foldForSearch`, trim, схлопнутые пробелы). Совпадение —
  **начало** названия `ru` **или** `en` (свёрнутого), без транслитерации.
- **Точный код** (`query.trim().toUpperCase()`): alpha-2 для страны; `city.airportCode` для города
  (AC-17: «KRK» → Краков); IATA для аэропорта; ISO для валюты. Точное совпадение по коду стоит
  **первым**, дальше без дубля.
- Остальные совпадения идут в порядке пустого списка (ниже).
- Пустой запрос даёт весь список:
  - страны, города — по `foldForSearch(name[lang])`, при равенстве — по `id` (D-3);
  - аэропорты — сначала аэропорты `homeCityId` (сначала `isPrimary`, затем по названию), затем
    остальные по названию (AC-19);
  - валюты — порядок `CURRENCIES` (AC-19), он же и при запросе.
- Город фильтруется по `residenceCountry`, если он задан (AC-23). Фильтр идёт **до** поиска,
  поэтому «KRK» при стране «Германия» ничего не находит.
- Аэропорт: кроме собственного названия совпадает и начало названия **его города** (как
  у `searchAirports`: «Аэропорт Жирона» иначе не находится по «Жир»). См. Q-C.
- `lang` — `PlaceLanguage` (`ru` | `en`). Для прочих языков mobile передаёт `en` (AC-47).

**`PROFILE_WRITE_ERROR` (id, не тексты; клиентам не показываются: UI такие патчи не порождает,
это защита от ошибки программы или чужого клиента):**
`citizenship.unknown`, `residence.unknown`, `homeCity.unknown`, `homeAirport.unknown`,
`homeCurrency.unknown`, `homeCity.countryMismatch`, `homeCity.residenceMissing`.

**`validateProfilePatch`:**
- Принадлежность к справочнику проверяется **только у колонок, которые есть в патче** и не равны
  `null`: страны — `PLACE_DIRECTORY` (kind `country`, по `countryCode`), город — `findCityById`,
  аэропорт — `findAirportByCode`, валюта — `isCurrencyCode`. Значение вне справочника, которое уже
  лежит в строке и в патч не попало, запись **не блокирует** (AC-27).
- Согласованность проверяется, если патч трогает `homeCity` или `residence`: в итоговом профиле
  (`{...current, ...patch}`) город из справочника требует страну проживания, равную стране города
  (`residenceMissing` / `countryMismatch`). Город вне справочника в этой проверке не участвует.

**`applyProfileChoice(current, field, value)` — таблица случаев (тест-матрица AC-20, AC-23…AC-25):**

| Поле | Условие | Патч |
|---|---|---|
| любое | `value === current[field]` | `null` (ничего не пишем, AC-20) |
| `citizenship` / `homeAirport` / `homeCurrency` | — | `{ [field]: value }` |
| `residence` | `current.homeCityId` есть в справочнике **и** его страна ≠ `value` (в том числе при `value = null`) | `{ residence: value, homeCityId: null }`. Аэропорт не трогаем (AC-25) |
| `residence` | иначе (города нет, город той же страны, город вне справочника) | `{ residence: value }` |
| `homeCity` | `value = null` | `{ homeCityId: null }` |
| `homeCity` | город; `current.residence = null` | `+ residence: city.countryCode` (AC-23) |
| `homeCity` | город с `primaryAirportOfCity` **и** (`current.homeAirport = null` **или** `cityOfAirport(current.homeAirport) === current.homeCityId`) | `+ homeAirport: primary.iata` (AC-24) |
| `homeCity` | ручной «чужой» аэропорт / город без аэропорта | аэропорт не трогаем |

Пять обязательных случаев AC-24: пусто; аэропорт прежнего города; ручной чужой (WAW при смене
Краков → Прага); город без аэропорта; повторный выбор того же города (`null`). Плюс случаи из
Edge cases: WAW при смене Краков → Варшава остаётся; при стране Польша → Германия Краков очищается,
KRK остаётся; Краков при пустой стране даёт Польшу; очистка страны после этого очищает город.

### 1.3 `mobile/src/lib/i18n` — namespace `picker` и строки профиля (шаг 3)

Урок PLAN-04 (корневой `insights.md`, 2026-09-23): namespace, созданный одним шагом, сразу
содержит **все** строки последующих шагов. Дерево ниже — контракт шагов 5, 6, 7, 9. Если ключа не
хватает, это дефект плана. В single-agent режиме ключ дописывается в обе локали и отмечается
в отчёте шага, в multi-agent режиме нужно остановиться и сообщить.

```
picker.searchLabel               «Поиск» / "Search"
picker.clearSearch               a11y крестика: «Очистить поиск»
picker.notSpecified              «Не указано» / "Not specified"  (строка шторки И значение пустой строки профиля)
picker.noResults.title           «Ничего не нашли»
picker.noResults.optional        «Проверьте написание или оставьте поле пустым — оно необязательное.»
picker.noResults.required        «Проверьте написание.»
picker.noCities.title            «Для этой страны городов в списке пока нет»
picker.noCities.body             «Поле необязательное — можно оставить пустым.»
picker.a11y.close                подложка: «Закрыть выбор»
picker.a11y.item                 «{{name}}, {{code}}»

profile.aboutMe.title            «О себе» / "About me"
profile.aboutMe.footnote         «Все поля необязательные.» / "All fields are optional."
profile.fields.citizenship       «Гражданство» / "Citizenship"      (это же — название шторки)
profile.fields.residence         «Страна проживания» / "Country of residence"
profile.fields.homeCity          «Город» / "City"
profile.fields.homeAirport       «Домашний аэропорт» / "Home airport"
profile.hints.homeAirport        «Подставим в „Откуда" при добавлении рейса» / "Prefilled in "From" when you add a flight"
profile.hints.currency           «Подставим в стоимость нового отеля» / "Prefilled in a new hotel's cost"   (Q4)
profile.values.notInDirectory    «Нет в справочнике» / "Not in the list"
profile.a11y.row                 «{{label}}, {{value}}»
profile.rows.currency            уже есть («Валюта»), это же — название шторки валюты
```

«Отмена» берётся из `common:actions.cancel`, «Повторить» — из `common:actions.retry`, ошибки —
из `trips:errors.*` (AC-28/AC-31). Дубликатов не заводить. Файлы: `locales/{ru,en}/picker.ts`
(новые), `locales/{ru,en}/profile.ts`, `locales/{ru,en}/index.ts`. `hotel.ts` этот шаг **не
трогает**: его ключи удаляет шаг 9, одновременно с их последним потребителем.

### 1.4 `shared/` — строка БД, запись, публичная поверхность (шаг 4)

```
shared/src/profile/rows.ts   profileRowSchema (z.object из unknown; ТОЛЬКО формат, AC-27):
                             user_id: string; *_country_code: ^[A-Z]{2}$ | null; home_city_place_id:
                             ^city-[a-z0-9-]+$ и ≤64 | null; home_airport_code / home_currency: ^[A-Z]{3}$ | null.
                             toProfile(row | null): Profile — null → EMPTY_PROFILE (AC-7);
                             profileFromRowSchema.
                             ProfileWrite = { user_id: string } & частичные snake_case колонки;
                             toProfileWrite(userId, patch): ProfileWrite — ТОЛЬКО ключи из patch (AC-8).
                             Типовой тест: ProfileWrite присваиваем TablesInsert<"profiles">
shared/src/profile/index.ts  публичная поверхность profile (всё из шага 2 + rows)
shared/src/index.ts          + export * from "./profile"
shared/src/profile/__tests__/rows.test.ts  goodRow: Tables<"profiles">; `XK` / `city-unknown` / `ZZZ`
                             принимаются (AC-27); `pl`, `KRKX`, `town-x` → ошибка разбора;
                             toProfileWrite({ homeCurrency: "PLN" }) даёт ровно { user_id, home_currency }
```

### 1.5 `mobile/src/components` + `src/platform` — общая шторка выбора (шаг 5)

```
src/platform/flag.ts                 FLAG_DISPLAY: "emoji" | "code" = "emoji". Единственное место
                                     платформенного решения AC-22. Android-переопределение
                                     (flag.android.ts → "code") появится, только если найдётся прошивка
                                     без флагов (Android backlog). Комментарий об этом — в файле
src/components/CountryFlag.tsx       { countryCode } → эмодзи (flagEmojiOf) при FLAG_DISPLAY="emoji" и
                                     валидном коде; иначе код моношрифтом (variant mono). Скрыт от
                                     скринридера (accessibilityElementsHidden + no-hide-descendants), AC-43
src/components/AnimatedSheetOverlay.tsx  + topInset?: number — панель от topInset до низа окна
                                     (top: topInset, bottom: 0), без него — прежнее поведение
                                     (по высоте контента); + handle?: boolean — «ручка»
                                     sheetHandleW×sheetHandleH, цвет divider, только визуальная (без
                                     жеста), скрыта от a11y. Обратная совместимость: CurrencySheet
                                     и timeSheetPicker не меняются
src/components/icons.ts              + search: { set: "feather", glyph: "search" }
src/components/picker/PickerSheet.tsx     Modal-хост (D-2) + AnimatedSheetOverlay(topInset=
                                     layout.sheetTopInset, handle) + шапка + поиск + список. ≤ ~150 строк
src/components/picker/PickerHeader.tsx    «Отмена» слева (common:actions.cancel, ≥44pt), title по центру
                                     (accessibilityRole header), справа пустой View той же ширины
src/components/picker/PickerSearchField.tsx  Icon search + TextInput (autoFocus, autoCorrect false,
                                     autoCapitalize none, accessibilityLabel picker.searchLabel) + крестик
                                     IconButton close (a11y picker.clearSearch, ≥44pt), только при непустом тексте
src/components/picker/PickerRow.tsx       [флаг?] название (flex 1, перенос) код-моно [галочка accent];
                                     выбранная — фон surface, accessibilityState.selected; label
                                     picker.a11y.item (или item.a11yName); ≥44pt
src/components/picker/PickerEmpty.tsx     заголовок + строка (varianty noResults.optional /
                                     noResults.required / произвольная пара для AC-26)
src/components/picker/types.ts       PickerItem = { key: string; name: string; code: string;
                                     flagCountryCode?: string; a11yName?: string }
                                     PickerSheetProps = { title; selectedKey: string | null;
                                     search: (query: string) => readonly PickerItem[];
                                     emptyWhenBlank?: { title: string; body: string };  // AC-26
                                     required?: boolean;                                 // AC-18
                                     onSelect: (key: string | null) => void; onClose: () => void; testID }
src/components/picker/CurrencyPickerSheet.tsx  PickerSheet для валют: search = searchCurrencyOptions
                                     (+ CURRENCY_NAMES[lang]), без флага; используют И профиль, И отель
src/components/picker/index.ts
src/components/index.ts              + PickerSheet, CurrencyPickerSheet, CountryFlag и типы
src/components/__tests__/PickerSheet.test.tsx, CurrencyPickerSheet.test.tsx, CountryFlag.test.tsx,
                                     AnimatedSheetOverlay.test.tsx (+ topInset/handle; старые кейсы без правок)
```

Поведение `PickerSheet`:
- Строка «Не указано» (`picker.notSpecified`) идёт первой, **только** когда `selectedKey !== null`.
  Она вызывает `onSelect(null)` (AC-16).
- Закрытие как у `CurrencySheet`: `exit`-состояние → анимация выхода → `onExited` → `onSelect(key)`
  или `onClose()`. Первое нажатие побеждает (`current ?? …`), поэтому двойной тап даёт один выбор.
  «Отмена», подложка и `Modal.onRequestClose` («назад» на Android) закрывают без изменений (AC-20).
- «Уменьшить движение» и токены `motion.*`/`easing.*` унаследованы от `AnimatedSheetOverlay`
  (AC-21).
- Список — `FlatList` одной карточкой (`surface`, `radius.card`, разделители `divider`),
  `keyboardShouldPersistTaps="handled"`, `automaticallyAdjustKeyboardInsets` (iOS-проп,
  Android игнорирует; приём `Screen`, без `Platform.OS`). Виртуализация нужна: до 391 строки.
- Пустой запрос и пустой результат при `emptyWhenBlank` дают `PickerEmpty(emptyWhenBlank)`
  (AC-26). Непустой запрос без результата даёт `noResults.title` + `required ? required :
  optional` (AC-18).
- Панель — `accessibilityViewIsModal`. Фокус при открытии уходит в поле поиска (autoFocus) (AC-44).

### 1.6 `mobile/src/features/profile` — данные, запись, логика экрана (шаг 6)

Этот шаг владеет **всеми** хуками и чистыми функциями фичи, включая нужные только шагам 7, 8, 9
(урок PLAN-04).

```
api/profileApi.ts     ЕДИНСТВЕННЫЙ модуль, который обращается к `profiles` (через @/lib/supabase).
                      getProfile(): ProfileResult<Profile> — .select(<явные колонки>).maybeSingle();
                      null → EMPTY_PROFILE (AC-7); строка через profileFromRowSchema, не разобралась →
                      "unknown". RLS сама ограничивает строки владельцем, фильтр по user_id не нужен.
                      saveProfile(userId, patch): ProfileResult<Profile> — validateProfilePatch не
                      прошёл → { ok:false, kind:"unknown" } БЕЗ запроса; иначе
                      .upsert(toProfileWrite(userId, patch), { onConflict: "user_id" })
                      .select(<колонки>).single() (D-5).
                      Ошибки: mapTripError из @/features/trips. Лог: console.warn("[profile]", operation,
                      "failed", errorCode), где operation ∈ "profile.load" | "profile.save". Значения
                      полей, userId и патч не логируются (AC-29, guardrail no-credentials-in-logs:
                      локальная переменная называется ИМЕННО errorCode)
api/index.ts          поверхность api + unwrapProfile → throw TripApiError(kind)
hooks/queryKeys.ts    profileKeys = { all: ["profile"], mine: (userId) => ["profile", userId] } (D-4)
hooks/useProfileQuery.ts  enabled только при status "signedIn"; queryFn бросает (retry offline/timeout,
                      mobile/insights.md 2026-09-22) → { profile, isPending, isError, error, refetch }
hooks/pendingPatches.ts   ЧИСТЫЕ функции D-6: overlay(base: Profile, queue: {seq, patch}[]): Profile;
                      enqueue / settle(seq). Тесты без рендера
hooks/useProfileSave.ts   useMutation({ scope: { id: "profile-save" }, mutationFn: saveProfile }) +
                      очередь патчей в state; onSuccess(seq): setQueryData(mine(userId), server) и
                      снять патч; onError(seq): снять патч, lastError = { field, kind }. Без
                      сессии → TripApiError("denied"), ничего не уходит
hooks/useProfileEditor.ts  Контроллер S6 (шаг 7 только рисует): display = overlay(кэш, очередь);
                      loading (AC-28: нет данных в кэше и isPending), loadError + retry;
                      activeField / open(field) (повторное открытие при уже открытой шторке
                      игнорируется — edge case «двойное нажатие») / close;
                      choose(value): patch = applyProfileChoice(display, activeField, value);
                      null → только закрыть; иначе save(patch).
                      saveError: { card: "aboutMe" | "settings"; kind } | null — card по полю
                      (homeCurrency → settings), сбрасывается следующим выбором
hooks/useHomeDefaults.ts   ДЛЯ ДРУГИХ ФИЧ: useQuery с тем же ключом → { homeAirport: string | null,
                      homeCurrency: CurrencyCode | null } — только из уже пришедших данных, без ожидания
                      (AC-36). homeCurrency через homeCurrencyDefault (AC-38). Ошибка или загрузка → null
pickerItems.ts        ЧИСТЫЕ: itemsFor(field, query, lang, profile): PickerItem[] — страны
                      (flagCountryCode = code, code = alpha-2), города (флаг и код = страна города),
                      аэропорты (без флага, code = IATA, a11yName = название аэропорта — AC-43), через
                      функции шага 2; selectedKeyOf(field, profile); emptyWhenBlankFor(field, profile)
                      (страна проживания без городов → AC-26)
rowValues.ts          ЧИСТЫЕ: rowValueOf(field, profile, lang) →
                      { kind: "empty" } | { kind: "country"; code; name } | { kind: "rawCode"; code; spoken? }
                      | { kind: "city"; name } | { kind: "unknownCity" } — AC-10, AC-27 (страна вне
                      справочника → rawCode без флага; аэропорт/валюта → rawCode как есть; аэропорт из
                      справочника → rawCode + spoken = название, AC-43)
index.ts              + export { useHomeDefaults } (+ тип). Прежние экспорты (ProfileScreen, ThemeSettingRow)
                      остаются. api наружу НЕ экспортируется
api/__tests__/profileApi.test.ts   мок @/lib/supabase как у hotelsApi.test: нет строки → пустой профиль;
                      тело upsert = ровно { user_id, <изменённые колонки> } + onConflict "user_id";
                      недопустимый патч → без вызова клиента; каждая категория ошибки → свой kind;
                      console.warn получает только operation/errorCode
hooks/__tests__/      pendingPatches.test.ts; useProfileSave.test.tsx (успех; offline/timeout/denied/unknown
                      → откат и ошибка; откат связанной группы город+страна+аэропорт; AC-32: два выбора,
                      ответы в обратном порядке → на экране и в последнем вызове api значение второго;
                      вторая запись ушла только после первой); useProfileEditor.test.tsx (повторный выбор
                      → нет вызова api); useHomeDefaults.test.tsx (данных нет → null, пришли позже → хук
                      отдаёт их, решение «не подставлять» — у форм); cacheIdentity.test.tsx (смена userId →
                      другой ключ, после signOut кэш профиля пуст, AC-30)
__tests__/pickerItems.test.ts, __tests__/rowValues.test.ts
mobile/__tests__/guardrails.test.ts  + правило profiles-table-only-in-profile-api: литерал `"profiles"`
                      в вызове `.from(` запрещён вне src/features/profile/api/**; иглу собрать из частей
                      (любое mobile-all правило сканирует сам файл). Самотест: ловит нарочный пример и
                      проходит на реальном дереве
```

Тестовые подводные камни (`mobile/insights.md`): мутации уничтожать до `QueryClient.clear()`;
`renderWithProviders` асинхронный; мокать api модулем `@/features/profile/api` при залогиненной
сессии.

### 1.7 `mobile/src/features/profile` — экран S6 (шаг 7)

```
ProfileScreen.tsx                ≤ ~100 строк, только композиция в порядке AC-9: h1 «Профиль» →
                                 ProfileHeader → AboutMeCard → SettingsCard → ThemeSettingRow (ВНЕ
                                 карточки, AC-13) → «Выйти». Строки «Удалить аккаунт» нет. Пока шторка
                                 открыта, контент под ней accessibilityElementsHidden /
                                 no-hide-descendants (AC-44; Modal изолирует и нативно, флаг нужен
                                 для RNTL-проверки)
components/ProfileHeader.tsx     AVATAR_SIZE 72 → layout.avatarProfile (56): спек разрешает попутно
                                 (Follow-ups), account.md требует токен. См. Q-D
components/AboutMeCard.tsx       подпись aboutMe.title; GlassSurface с 4 ProfileValueRow; footnote
                                 (textSecondary, small); под карточкой ошибка сохранения, если
                                 saveError.card === "aboutMe" (danger, accessibilityRole alert, без Alert)
components/SettingsCard.tsx      SoonSettingRow ×2 (notifications, connectedAccounts — Q1: только «скоро»)
                                 + ProfileValueRow «Валюта» (код моно или «Не указано», hint
                                 profile.hints.currency, без «скоро», AC-14); ошибка сохранения под
                                 карточкой, если saveError.card === "settings"
components/ProfileValueRow.tsx   PressableRow role button, ≥44pt: слева label (+hint вторым рядом:
                                 только у homeAirport и currency, AC-11), справа значение + Icon chevron.
                                 Значение по rowValueOf: country → CountryFlag + название; rawCode →
                                 AppText mono; city → название; unknownCity → «Нет в справочнике»
                                 textSecondary; empty → picker.notSpecified textSecondary (Q3).
                                 Раскладка flexDirection row + flexWrap wrap: при крупном шрифте
                                 значение уходит под название, название не обрезается; длинное значение —
                                 numberOfLines 2 + ellipsis (AC-46). a11y: profile.a11y.row с полным
                                 значением (spoken у аэропорта) (AC-43). Состояние loading: плейсхолдер
                                 (фон divider, radius.tile), disabled, без onPress (AC-28)
components/ProfileLoadError.tsx  trips:errors.<kind> + SecondaryButton common:actions.retry — вместо
                                 строк карточки «О себе» при loadError (AC-28). Строка «Валюта» в это
                                 время остаётся плейсхолдером, не нажимается (N-5)
components/ProfileFieldPicker.tsx  по activeField: homeCurrency → CurrencyPickerSheet (title
                                 profile.rows.currency); иначе PickerSheet (title profile.fields.<field>,
                                 search = q => itemsFor(field, q, lang, display), selectedKey,
                                 emptyWhenBlank). onSelect → editor.choose, onClose → editor.close
components/ThemeSettingRow.tsx   без изменений поведения (3 radio). Правится, только если нужен отступ
                                 блока вне карточки
components/SoonSettingRow.tsx    проп value больше не нужен: удалить неиспользуемое
__tests__/ProfileScreen.test.tsx       порядок по testID (AC-9); 2 строки «скоро», у «Валюты» значение
                                 (AC-14); полностью пустой профиль: только «Не указано» ×5 и сноска, без
                                 бейджей и счётчиков (AC-12); подпись только у аэропорта и валюты (AC-11);
                                 флаг и название, город без флага, IATA моно (AC-10); значения вне
                                 справочника (AC-27); загрузка → плейсхолдеры не нажимаются, тема и
                                 «Выйти» работают; ошибка → «Повторить» (AC-28); «нет строки языка»,
                                 «нет строки удаления», «ровно 3 radio» остаются
__tests__/ProfilePicker.test.tsx       открытие каждой из 5 шторок с нужным названием (AC-15); выбор → строка
                                 обновлена сразу (AC-31); «Не указано» очищает (US-6); Краков при пустой
                                 стране → Польша + KRK одной записью (US-1, AC-23/24); смена страны
                                 очищает город (US-5, AC-25); Андорра → AC-26; ошибка записи → откат
                                 и сообщение под нужной карточкой (AC-31); a11y экрана под шторкой скрыт
                                 (AC-44)
__tests__/ProfileSignOut.test.tsx      + jest.mock("@/features/profile/api")
__tests__/ThemeSettingRow.test.tsx     без изменений (должен остаться зелёным)
mobile/__tests__/navigation.test.tsx   + jest.mock("@/features/profile/api", …) → пустой профиль; проверки
                                 /profile (logout на месте) без изменений
```

### 1.8 `segment-form` + `shared/segments/prefill` — «Откуда» = дом (шаг 8)

```
shared/src/segments/prefill.ts   FirstSegmentPrefill = { fromAirport: AirportRecord | null;
                                 toAirport: AirportRecord | null; departureDate }.
                                 firstSegmentPrefill(trip, homeAirportCode: string | null):
                                 home = code ? findAirportByCode(code) : undefined (вне справочника → null);
                                 dest = city-поездка ? primaryAirportOfCity : null;
                                 dest.iata === home.iata → toAirport null (AC-34). Докстринг переписать
                                 (сейчас он повторяет дрейф). nextSegmentPrefill НЕ трогать (AC-35)
shared/src/segments/__tests__/prefill.test.ts  матрица AC-33: дом {есть, нет, вне справочника} × поездка
                                 {город с аэропортом, страна, свободный текст}; AC-34 совпадение;
                                 тесты nextSegmentPrefill без изменений
mobile/src/features/segment-form/hooks/formState.ts  segmentFormFromFirstPrefill принимает
                                 { fromAirport, toAirport, departureDate } и заполняет обе стороны
mobile/src/features/segment-form/SegmentFormScreen.tsx  ТОЛЬКО CreateSegmentLoader: const { homeAirport } =
                                 useHomeDefaults(); условие загрузки НЕ меняется (профиль не ждём, AC-36);
                                 initial считается при первом рендере тела. SegmentFormBody (key "create")
                                 держит initial в useState, поэтому позднее значение не подставляется.
                                 Остальные ~500 строк файла не трогать
mobile/src/features/segment-form/__tests__/SegmentFormScreen.test.tsx
                                 + jest.mock("@/features/profile/api"); тест «prefills the departure airport
                                 … for a city trip» → аэропорт города в «Куда» (Что заменяется); новые:
                                 дом KRK + Лиссабон → Откуда KRK, Куда LIS (US-2); дом = LIS → Куда пусто;
                                 ошибка профиля → форма открыта без дома; профиль пришёл после открытия →
                                 «Откуда» не меняется (AC-36); уже есть сегменты → Откуда пусто (AC-35);
                                 нетронутая предзаполненная форма закрывается без «Закрыть без
                                 сохранения?» (AC-37); тесты цепочки «Сохранить и добавить следующий»
                                 зелёные без правок
mobile/src/features/segment-form/__tests__/formState.test.ts  обе стороны
```

Подводный камень (`mobile/insights.md` 2026-09-23): `userEvent.type` дописывает к непустому полю.
Дефолтная фикстура — без профиля; тесты с домом включают его явно.

### 1.9 `hotel-form` + `shared/hotels` — валюта по умолчанию, общая шторка, AC-39 (шаг 9)

```
shared/src/hotels/schemas.ts     стоимость: сумма пуста → cost: null БЕЗ ошибки при любой валюте (AC-39);
                                 сумма без валюты → cost.currencyMissing (без изменений); неизвестная
                                 валюта при сумме → cost.currencyUnknown (без изменений)
shared/src/hotels/errorCodes.ts  удалить costAmountMissing ("cost.amountMissing")
shared/src/hotels/__tests__/form.test.ts  литеральный список id без cost.amountMissing; «только валюта» →
                                 ok, cost null
mobile/src/features/hotel-form/components/CurrencySheet.tsx  УДАЛИТЬ (+ filterCurrencies)
mobile/src/features/hotel-form/components/HotelFormBody.tsx  CurrencySheet → CurrencyPickerSheet (title
                                 hotel:form.field.currency, selectedKey = costCurrency || null,
                                 required = costAmount !== "" — AC-18), монтируется там же
mobile/src/features/hotel-form/components/CostField.tsx  + проп currencyPlaceholder: string (AC-40)
mobile/src/features/hotel-form/HotelFormScreen.tsx  CreateHotelLoader: useHomeDefaults().homeCurrency →
                                 hotelFormFromTrip(…, homeCurrency). Загрузчик профиль не ждёт. Edit-загрузчик
                                 профиль не читает (AC-38)
mobile/src/features/hotel-form/hooks/formState.ts  hotelFormFromTrip(trip, lang, today, homeCurrency:
                                 CurrencyCode | null) → costCurrency = homeCurrency ?? ""
mobile/src/features/hotel-form/hooks/useHotelForm.ts  selectCurrency(code | null) без изменений
                                 по смыслу; повторный выбор той же валюты состояние не меняет;
                                 currencyPlaceholder = useHomeDefaults().homeCurrency ?? t("form.field.
                                 currencyPlaceholder") (подсказка, не значение)
mobile/src/lib/i18n/locales/{ru,en}/hotel.ts  удалить form.currencyName.*, form.currency.{title,
                                 searchLabel, none, empty}, form.a11y.currencyClose, form.validation.cost.
                                 amountMissing. Перед удалением: grep по mobile/src и mobile/app (урок
                                 PLAN-04 step 11). currencyPlaceholder «EUR», currencyRequired,
                                 a11y.currencyField/currencyEmpty ОСТАВИТЬ
mobile/src/features/hotel-form/__tests__/*   + jest.mock("@/features/profile/api"); create с домашней
                                 валютой PLN → валюта PLN (US-3); без неё → пусто; домашняя «ZZZ» → пусто;
                                 edit отеля без стоимости остаётся без валюты (AC-38); плейсхолдер PLN / EUR
                                 (AC-40); валюта без суммы → сохранение с cost null и без ошибки (AC-39);
                                 сумма без валюты → currencyMissing (как было); шторка: поиск «зло»/«PLN»,
                                 галочка у выбранной, «Не указано» вместо «Не выбрана», пустой результат
                                 при сумме → «Проверьте написание.» (AC-41, AC-18); смена домашней
                                 валюты не трогает существующий отель (AC-42)
```

Тесты `CurrencySheet` из `HotelFormScreen.fields.test.tsx` переписываются под `CurrencyPickerSheet`
(testID шторки сохранить: `hotel-form-currency-sheet`, подписи опций по `picker.a11y.item`).
`hotelKeys.test.ts` проверяет направление «id shared → ключ локали», поэтому удалённый id
его не ломает.

---

## 2. Изменения зависимостей

| Что | Решение |
|---|---|
| npm-пакеты | **Ни одного.** Поиск, свёртка, флаг, сортировка — свои чистые функции; анимация — RN `Animated` (reanimated не зависимость); `Modal` — ядро RN |
| Нативные модули | **Ни одного** → dev-клиент не пересобирается. Если нативная зависимость всё же появится, это изменение объёма: остановиться и сообщить |
| Миграции | Одна: `supabase/migrations/<ts>_profiles.sql` — таблица, 5 CHECK, триггер, RLS, 3 политики (без delete). pgTAP в том же шаге, сразу регенерация `shared/src/db/database.types.ts`. Только локальный стенд |
| Env | Ничего нового; `service_role` в клиенте не появляется |
| Разрешения / privacy manifest | Без изменений в коде: ни разрешений (геолокацию **не** запрашиваем), ни `NS*UsageDescription`, ни ключей в `src/lib/storage/keys.ts`. Профиль живёт только в кэше TanStack Query в памяти. App Privacy label, `NSPrivacyCollectedDataTypes` и текст политики — чек-лист `release-manager` (M12), не этот план |
| Контракт `@tripplanner/shared` | Расширяется: `profile/*`, `flagEmojiOf`, `search*Options`, `countryHasCities`, `CURRENCY_NAMES`, `searchCurrencyOptions`, тип строки `profiles`. **Меняется:** `firstSegmentPrefill(trip, homeAirportCode)` + `FirstSegmentPrefill.toAirport` (потребитель один, обновляется в том же шаге 8); `HOTEL_FIELD_ERROR` теряет `cost.amountMissing` (шаг 9). Потребитель один — `mobile/`; Edge Functions и `web` план не вводит |

---

## 3. Порядок выполнения

### 3.0 Режим, тиры, правило непересечения

11 шагов, 5 тиров. Списки файлов шагов **нигде не пересекаются**.

| Тир | Шаги | Зависит от |
|---|---|---|
| 1 | 1 (supabase), 2 (shared-логика), 3 (i18n) — взаимно независимы | — |
| 2 | 4 (shared: строка/запись/индекс), 5 (шторка в components) — независимы | 4: 1, 2 · 5: 2, 3 |
| 3 | 6 (профиль: api, хуки, логика, guardrail) | 3, 4, 5 |
| 4 | 7 (экран S6), 8 (segment-form + prefill), 9 (hotel-form + AC-39) — взаимно независимы | 7: 3, 5, 6 · 8: 6 · 9: 3, 5, 6 |
| 5 | 10 (e2e, можно отложить), затем 11 (документы) | 10: 7, 8 · 11: 1–10 |

Правила порядка:
1. **Миграция раньше строки.** `rows.ts` тестируется против `Tables<"profiles">`, поэтому шаг 4
   без шага 1 не компилируется.
2. **Контракт меняется вместе с потребителем.** `firstSegmentPrefill` меняется в шаге 8 вместе
   с `segment-form`, правило AC-39 — в шаге 9 вместе с `hotel-form`. Иначе mobile-тесты краснеют
   между шагами.
3. **Ключ удаляется вместе с последним потребителем.** `hotel.form.currencyName.*` и
   `form.currency.*` удаляет шаг 9, тот же, что удаляет `CurrencySheet.tsx`. Иначе типизированный
   i18n ломает `typecheck`.
4. **Маршрутов не добавляется**: регенерация `.expo/types` не нужна.
5. **Worktree-гоча** (корневой `insights.md`): worktree implementer'а режется от `main`, поэтому
   первым делом нужны `git merge <integration-branch>` и `pnpm install`. `supabase db reset` из
   worktree бьёт по **общему** локальному стенду.

---

### Шаг 1 — `supabase/`: миграция `profiles`, RLS, pgTAP, типы *(Тир 1)*

**Зависит от:** ничего. **Блокирует:** 4.
**Владеет файлами:** `supabase/migrations/<timestamp>_profiles.sql`,
`supabase/tests/profiles_rls.test.sql`, `supabase/tests/profiles_constraints.test.sql`,
`shared/src/db/database.types.ts`.
**Что делать:** §1.1.
```bash
supabase start -x vector
supabase migration new profiles
supabase db reset          # ЛОКАЛЬНО; стирает локальные аккаунты — только с согласия владельца
supabase test db
supabase gen types typescript --local > shared/src/db/database.types.ts
```
**НЕ делать:** политику `delete`; триггер на `auth.users` и `security definer`-функции; CHECK
на принадлежность справочнику; правку существующих миграций и pgTAP-файлов; ничего против
хостингового проекта.
**Критерии готовности:** `supabase db reset` применяет 6 миграций (AC-1). `supabase test db`
зелёный целиком, в том числе **на непустой локальной БД** (AC-2…AC-8 в части db). Есть тест на
каждое из 5 ограничений, число закреплено через `pg_constraint`. Повторная генерация типов не даёт
диффа. `pnpm -r typecheck` зелёный.

### Шаг 2 — `shared/`: поиск шторки, флаг, названия валют, связи профиля *(Тир 1)*

**Зависит от:** ничего. **Блокирует:** 4, 5.
**Владеет файлами:** `shared/src/places/{flag,pickerSearch,index}.ts`,
`shared/src/places/__tests__/{flag,pickerSearch}.test.ts`,
`shared/src/money/{currencyNames,currencySearch,index}.ts`,
`shared/src/money/__tests__/{currencyNames,currencySearch}.test.ts`,
`shared/src/profile/{errorCodes,types,links,validate,defaults}.ts`,
`shared/src/profile/__tests__/{links,validate,defaults}.test.ts`,
`shared/src/trips/__tests__/purity.test.ts`.
**Что делать:** §1.2.
**НЕ делать:** пользовательских строк (только id); `Intl`, `localeCompare`, `normalize()`;
литерал `"from"`; лимит в новых функциях поиска; правку `searchPlaces`/`searchCities`/
`searchAirports`/`searchCurrencies`; `profile/index.ts` и `shared/src/index.ts` (это шаг 4);
`segments/**`, `hotels/**`.
**Критерии готовности (`pnpm --filter @tripplanner/shared test` + `typecheck`):**
- Поиск (AC-17): «PL», «pl» → Польша первой; «Пол», «Pol» → Польша; «KRK» → Краков (город) и KRK
  (аэропорт) первыми; «Ё/Е»: в справочнике нет названий с «ё», поэтому проверяется свёртка
  запроса — «Бёр» и «Бер» дают один и тот же результат (Берлин, Берн…); «Zur» находит Zürich; пустой запрос → все 197 стран / 100 городов /
  391 аэропорт / 40 валют (лимита нет); «Порту» не находит «Porto» по ru-en.
- Порядок (AC-19): пустой список стран в ru отсортирован по алфавиту (проверка первых и последних
  значений и монотонности по свёрнутому ключу); аэропорты при `homeCityId = city-barcelona`:
  BCN первым, затем прочие аэропорты Барселоны, затем остальные; валюты — ровно `CURRENCIES`.
- Город при `residenceCountry = "PL"` — только польские; `countryHasCities("AD") === false` (AC-26).
- `flagEmojiOf("PL")` = два regional-indicator; `"pl"`, `"POL"`, `""`, `"P1"` → `null`.
- `CURRENCY_NAMES` покрывает ровно `CURRENCIES`, у каждой валюты непустые `ru` и `en`.
- Вся таблица `applyProfileChoice` из §1.2 (AC-20, AC-23…AC-25, edge cases). `validateProfilePatch`:
  неизвестный код в патче → id; неизвестный код **вне** патча не мешает; город другой страны →
  `countryMismatch`; город без страны → `residenceMissing`. `homeCurrencyDefault("PLN")` = PLN,
  `"ZZZ"` → null.
- Список `PROFILE_WRITE_ERROR` закреплён литеральным массивом в тесте. `purity.test.ts` сканирует
  `profile/` и зелёный.

### Шаг 3 — `mobile/`: namespace `picker` и строки профиля *(Тир 1)*

**Зависит от:** ничего. **Блокирует:** 5, 6, 7, 9.
**Владеет файлами:** `mobile/src/lib/i18n/locales/{ru,en}/picker.ts`,
`mobile/src/lib/i18n/locales/{ru,en}/profile.ts`, `mobile/src/lib/i18n/locales/{ru,en}/index.ts`.
**Что делать:** §1.3, полное дерево ключей.
**НЕ делать:** трогать `hotel.ts` (это шаг 9); дублировать `common:actions.*` и `trips:errors.*`;
удалять `profile.rows.*`.
**Критерии готовности:** `parity.test.ts` зелёный; `pnpm --filter @tripplanner/mobile typecheck`
зелёный; все существующие тесты `mobile` зелёные без правок.

### Шаг 4 — `shared/`: строка БД, запись, публичная поверхность профиля *(Тир 2)*

**Зависит от:** 1, 2. **Блокирует:** 6.
**Владеет файлами:** `shared/src/profile/rows.ts`, `shared/src/profile/index.ts`,
`shared/src/index.ts`, `shared/src/profile/__tests__/rows.test.ts`.
**Что делать:** §1.4.
**Критерии готовности:** значения вне справочника принимаются (AC-27); неверный формат даёт ошибку
разбора; `toProfile(null)` = `EMPTY_PROFILE` (AC-7); `toProfileWrite` содержит только ключи патча +
`user_id` (AC-8); `ProfileWrite` присваиваем `TablesInsert<"profiles">` (типовой тест); весь
`@tripplanner/shared` зелёный (`typecheck` + `test`).

### Шаг 5 — `mobile/`: общая шторка выбора, флаг, иконка *(Тир 2)*

**Зависит от:** 2, 3. **Блокирует:** 6, 7, 9.
**Владеет файлами:** `mobile/src/components/picker/**`, `mobile/src/components/CountryFlag.tsx`,
`mobile/src/components/AnimatedSheetOverlay.tsx`, `mobile/src/components/icons.ts`,
`mobile/src/components/index.ts`, `mobile/src/platform/flag.ts`,
`mobile/src/components/__tests__/{PickerSheet,CurrencyPickerSheet,CountryFlag,AnimatedSheetOverlay}.test.tsx`,
`mobile/src/components/__tests__/Icon.test.tsx` (только если он закрепляет полный список имён).
**Что делать:** §1.5.
**НЕ делать:** `Platform.OS` вне `src/platform/`; литералы эмодзи в исходниках; hex и магические
числа (размеры — `layout.sheetTopInset`, `sheetHandleW/H`, `radius.sheet`, `layout.minTouch`);
менять поведение `CurrencySheet`/`timeSheetPicker` (новые пропсы необязательные); импорт из
`features/`; жест смахивания.
**Критерии готовности:**
- Шапка: «Отмена» слева, заголовок с ролью header, правая заглушка той же ширины. Поиск с лупой,
  у поля `autoFocus`, крестик виден только при непустом тексте и очищает поле. Панель на
  `sheetTopInset`, есть «ручка». Подложка `scrim` (AC-15).
- Строка: флаг/название/код-моно; выбранная — галочка `accent` + фон `surface` +
  `selected: true`. «Не указано» первой только при значении (AC-16).
- Пустые состояния AC-18 (оба варианта) и AC-26 (`emptyWhenBlank`).
- Выбор закрывает шторку и вызывает `onSelect` **после** анимации выхода (`waitFor`). «Отмена»,
  подложка и `onRequestClose` → `onClose` без `onSelect`. Двойной тап даёт один вызов (AC-20).
- Анимация стартует с токенами темы (`jest.spyOn(Animated, "timing")`, `toValue: 1`), при
  «Уменьшить движение» длительность 0 (AC-21; приём `mobile/insights.md` 2026-09-24).
- `CountryFlag`: при моке `@/platform/flag` = "emoji" рисуется эмодзи, при "code" — код моно,
  невалидный код → код моно; флаг скрыт от a11y (AC-22, AC-43).
- Подпись строки `«<название>, <код>»`, зона ≥44pt у «Отмены», крестика и строк (AC-43, AC-44).
- Старые тесты `AnimatedSheetOverlay` и всего `mobile` зелёные без правок. `FlatList`-тесты ждут
  окно виртуализации (`mobile/insights.md` 2026-09-22).

### Шаг 6 — `mobile/`: фича `profile` — api, хуки, логика, guardrail *(Тир 3)*

**Зависит от:** 3, 4, 5. **Блокирует:** 7, 8, 9.
**Владеет файлами:** `mobile/src/features/profile/api/**`, `mobile/src/features/profile/hooks/**`,
`mobile/src/features/profile/pickerItems.ts`, `mobile/src/features/profile/rowValues.ts`,
`mobile/src/features/profile/index.ts`,
`mobile/src/features/profile/__tests__/{pickerItems,rowValues}.test.ts`,
`mobile/__tests__/guardrails.test.ts`.
**Что делать:** §1.6.
**НЕ делать:** `supabase-js` напрямую; копию классификатора ошибок; правила связей в mobile
(только `applyProfileChoice`); логирование чего-либо, кроме `operation`/`errorCode`; очередь
офлайн-записей; политику повтора мутаций; экспорт api из `index.ts`; правку `ProfileScreen.tsx`
и `components/**` (это шаг 7).
**Критерии готовности:** все тесты §1.6 зелёные: пустая строка → пустой профиль (AC-7); тело
upsert только с изменёнными колонками (AC-8); ошибки с `kind`, query бросает (AC-29); откат
и сообщение по каждой категории ошибки, включая связанную группу (AC-31); последний выбор
побеждает при обратном порядке ответов (AC-32); смена личности → другой ключ, кэш очищается
(AC-30); повторный выбор → нет записи (AC-20); `pickerItems`/`rowValues` покрывают AC-10, AC-16,
AC-26, AC-27, AC-43; новый guardrail ловит нарочный пример и проходит на дереве;
`backend-only-behind-the-boundary` и `no-credentials-in-logs` зелёные.

### Шаг 7 — `mobile/`: экран S6 *(Тир 4)*

**Зависит от:** 3, 5, 6.
**Владеет файлами:** `mobile/src/features/profile/ProfileScreen.tsx`,
`mobile/src/features/profile/components/**`,
`mobile/src/features/profile/__tests__/{ProfileScreen,ProfilePicker,ProfileSignOut,ThemeSettingRow}.test.tsx`,
`mobile/__tests__/navigation.test.tsx`.
**Что делать:** §1.7.
**НЕ делать:** строку «Удалить аккаунт», восстановление пароля, ссылки на условия (Non-goals);
«Booking.com» у подключённых аккаунтов (Q1); индикаторы заполненности; вычисление связей или
форматирование значений в компонентах (только `rowValueOf`/`useProfileEditor`); системный `Alert`;
правку `hooks/**`, `api/**`, `index.ts`, `app/(tabs)/profile.tsx`.
**Критерии готовности:** все тесты §1.7 зелёные (AC-9…AC-16, AC-20, AC-23…AC-28, AC-31, AC-43,
AC-44); `navigation.test.tsx` и `ProfileSignOut.test.tsx` зелёные с моком profile-api; тесты темы
не меняются по смыслу (AC-13).

### Шаг 8 — `segment-form` + `shared/segments/prefill`: «Откуда» = дом *(Тир 4)*

**Зависит от:** 6.
**Владеет файлами:** `shared/src/segments/prefill.ts`,
`shared/src/segments/__tests__/prefill.test.ts`,
`mobile/src/features/segment-form/SegmentFormScreen.tsx`,
`mobile/src/features/segment-form/hooks/formState.ts`,
`mobile/src/features/segment-form/__tests__/{SegmentFormScreen,formState}.test.ts(x)`.
**Что делать:** §1.8.
**НЕ делать:** `nextSegmentPrefill` и цепочку (AC-35); ожидание профиля в загрузчике (AC-36);
подстановку дома в сегменты, которые не первые (Q2); прямое чтение `profiles`, только
`useHomeDefaults` из `@/features/profile`; рефакторинг остального `SegmentFormScreen.tsx`.
**Критерии готовности:** матрица AC-33/AC-34 в `shared` и в mobile; AC-35, AC-36, AC-37; тесты
цепочки зелёные без правок; `pnpm -r typecheck` зелёный (все потребители `FirstSegmentPrefill`
обновлены).

### Шаг 9 — `hotel-form` + `shared/hotels`: домашняя валюта, общая шторка, AC-39 *(Тир 4)*

**Зависит от:** 3, 5, 6.
**Владеет файлами:** `shared/src/hotels/schemas.ts`, `shared/src/hotels/errorCodes.ts`,
`shared/src/hotels/__tests__/form.test.ts`, `mobile/src/features/hotel-form/**`,
`mobile/src/lib/i18n/locales/{ru,en}/hotel.ts`.
**Что делать:** §1.9.
**НЕ делать:** конвертацию, пересчёт и правку `cost_currency` существующих отелей (AC-42);
предзаполнение валюты при правке (AC-38); удаление `currencyPlaceholder`/`currencyRequired`/
`a11y.currencyField`; ожидание профиля в загрузчике.
**Критерии готовности:** тесты §1.9 зелёные (AC-38…AC-42, US-3); `grep -rn "CurrencySheet\|
currencyName\|amountMissing" mobile/src shared/src` пусто; `parity.test.ts` и `hotelKeys.test.ts`
зелёные; `pnpm -r test` и `pnpm -r typecheck` зелёные.

### Шаг 10 — `e2e/`: «домашний аэропорт → новый рейс» *(Тир 5, можно отложить)*

**Зависит от:** 7, 8.
**Владеет файлами:** `e2e/flows/profile-home-airport.yaml`, `scripts/e2e.sh`, `e2e/insights.md`.
**Что делать:** новый аккаунт (sign up, как в `trip-crud`) → таб «Профиль» → «Домашний аэропорт»
→ поиск `KRK` → выбрать → строка показывает `KRK` → создать поездку-город «Лиссабон» с датами →
«Добавить рейс» → «Откуда» = KRK, «Куда» = LIS. Все строки задаются как `KEY=VALUE` в
`scripts/e2e.sh`, в потоке литералов нет. Maestro не установлен, поэтому поток пишется вслепую,
а допущения (выбор строки в `Modal`, autofocus поиска, поиск в `Modal` по placeholder/label)
уходят в `e2e/insights.md`.
**Критерии готовности:** в потоке нет литералов UI; он запускается `./scripts/e2e.sh
profile-home-airport`, **когда** Maestro и симулятор доступны. Иначе в `e2e/insights.md` явно
записано «не запускался».

### Шаг 11 — документы, статусы, insights *(Тир 5, последний)*

**Зависит от:** 1–10.
**Владеет файлами:** `AGENTS.md`, `mobile/AGENTS.md`, `shared/AGENTS.md`, `supabase/AGENTS.md`,
`design/screens/account.md`, `design/screens/picker.md`, `design/screens/add-hotel.md`,
`design/screens/add-flight.md`, `mobile/insights.md`, `shared/insights.md`, `supabase/insights.md`,
`insights.md`.
**Что делать:** весь раздел спека «Документы, которые нужно обновить»:
- `AGENTS.md`: две строки про валюту и пункт про IBM Plex Mono (+ коды стран и валют). Правки
  **заменяют** строки: файл уже 120 строк при лимите 100. Исключение про эмодзи-флаг уже
  добавлено владельцем, второй раз его не вносить.
- `supabase/AGENTS.md`: «currency per record; `profiles.home_currency` is only a default for new
  records» + статус (`profiles`, число тестов).
- `account.md`: подписи о пользе (валюта теперь подставляется, Q4), Q1, «Не указано» →
  `textSecondary` (Q3), «Состояние».
- `picker.md`: «Не указано» первой, код у города, пустые состояния AC-18/AC-26, порядок AC-19,
  закрытие, «ручка», «Состояние».
- `add-hotel.md`: предзаполнение валюты и AC-39. `add-flight.md`: «Откуда» = дом, «Куда» = город
  поездки для первого сегмента.
- Статусы пакетов. Insights — по протоколу `engineering-insights`: только существенное
  и неочевидное, после чтения и дедупликации. В multi-agent режиме implementer'ы возвращают
  находки в отчёте, а записывает их этот шаг.

**НЕ делать:** менять продуктовые требования в `design/`; переписывать SPEC-01…SPEC-06.
**Критерии готовности:** ни одного пункта «Документов, которые нужно обновить» не осталось;
`AGENTS.md` не стал длиннее.

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
grep -rniE "exchange|convert|rate\b" mobile/src/features/{profile,hotel-form} shared/src/{profile,money}   # AC-42: пусто по смыслу
./scripts/e2e.sh profile-home-airport                 # когда Maestro и симулятор доступны
```
Без `@ts-ignore`, `@ts-expect-error` и `eslint-disable` (guardrail).

**Ручной чек-лист (iOS, существующий dev-клиент, пересборка не нужна):**

| # | Проверка | AC |
|---|---|---|
| M1 | S6 против скриншота владельца: порядок блоков, тема под карточкой, «О себе» + сноска | AC-9, AC-13 |
| M2 | Шторка перекрывает таб-бар и статус-бар подложкой; верх на 104pt; «ручка»; светлая и тёмная тема | AC-15, AC-45 |
| M3 | US-1: Польша → Краков → аэропорт KRK сам. US-5: страна Германия → город очищен, KRK остался | AC-23…AC-25 |
| M4 | US-2: поездка в Лиссабон → «+» Транспорт → Откуда KRK, Куда LIS; поездка в Краков → Куда пусто | AC-33, AC-34 |
| M5 | US-3: домашняя PLN → новый отель, валюта PLN; сумма пустая → сохраняется без стоимости | AC-38, AC-39 |
| M6 | Авиарежим: выбор → значение показано → откат + сообщение под карточкой; повторная загрузка экрана из кэша | AC-31, Mobile «Офлайн» |
| M7 | Два устройства или вкладки: правка разных полей не затирает друг друга (проверка D-5 через реальный PostgREST) | AC-8 |
| M8 | Клавиатура: список прокручивается над клавиатурой, последний элемент достижим | Mobile «Клавиатура» |
| M9 | VoiceOver: строки профиля «<название>, <значение>», аэропорт по названию, флаг не звучит, экран под шторкой недоступен | AC-43, AC-44 |
| M10 | Крупный шрифт (Dynamic Type XXL): значение переносится под название, «Босния и Герцеговина» не обрезает название | AC-46 |
| M11 | Контраст «Не указано» и подписей на стеклянной карточке ≥4.5:1 в обеих темах | AC-45, Q3 |
| M12 | Чек-лист `release-manager`: App Privacy (страна/город/аэропорт/валюта/гражданство, linked, App Functionality), манифест, политика 5.1.1(i) | Mobile «App Store impact» |
| M13 | Логи dev-клиента при ошибке — только `profile.load`/`profile.save` и код, без значений | AC-29 |
| M14 | Второй аккаунт на том же устройстве: ни на миг не виден профиль первого | AC-30 |
| M15 | Форма отеля: шторка валюты поверх модального маршрута открывается и закрывается без артефактов (R-2) | AC-41 |

### 4a. Трассируемость AC → шаг

| AC | Шаг(и) | AC | Шаг(и) | AC | Шаг(и) |
|---|---|---|---|---|---|
| 1 | 1 | 18 | 5, 9 | 35 | 8 |
| 2 | 1 | 19 | 2, 5 | 36 | 6, 8, 9 |
| 3 | 1 | 20 | 2, 5, 6 | 37 | 8 |
| 4 | 1 | 21 | 5 | 38 | 2, 6, 9 |
| 5 | 1 | 22 | 2, 5 (+M) | 39 | 9 |
| 6 | 1 | 23 | 2, 7 | 40 | 9 |
| 7 | 1, 4, 6 | 24 | 2, 7 | 41 | 5, 9 |
| 8 | 1, 4, 6 (+M7) | 25 | 2, 7 | 42 | 9 (+grep) |
| 9 | 7 | 26 | 2, 5, 6, 7 | 43 | 5, 6, 7 (+M9) |
| 10 | 6, 7 | 27 | 4, 6, 7 | 44 | 5, 7 (+M9) |
| 11 | 7 | 28 | 6, 7 | 45 | 5, 7 (+M2, M11) |
| 12 | 7 | 29 | 6 (+M13) | 46 | 7 (+M10) |
| 13 | 7 | 30 | 6 (+M14) | 47 | 3 (parity), 2 |
| 14 | 7 | 31 | 6, 7 | 48 | 5 (guardrail) |
| 15 | 5, 7 | 32 | 6 | 49 | все (§4) |
| 16 | 5, 6 | 33 | 8 | | |
| 17 | 2 | 34 | 8 | | |

### 4b. Стоп-лист implementer'а

1. Одна новая таблица `profiles`. Политики `delete` нет, триггеров на `auth.users` нет, применённые
   миграции не правятся.
2. Против хостингового Supabase ничего не запускать; `db reset` локально — только с согласия
   владельца.
3. `service_role` и секреты в `mobile/` — нигде. `profiles` читается и пишется только из
   `features/profile/api/`.
4. Правила связей, поиск, сортировка, флаг, проверка записи, предзаполнение — только в `shared`.
5. Никакой конвертации валют, итогов, курсов. Существующие отели не меняются.
6. Геолокацию не запрашивать; новых разрешений, нативных модулей и ключей хранилища не добавлять.
7. Никакого `Platform.OS`, `.ios.*`, `.android.*` вне `src/platform/**`.
8. Никаких строк UI вне `locales/**` (названия стран, городов, аэропортов и валют — данные
   `shared`). Никаких hex, магических чисел и имён шрифтов вне `lib/theme`. Эмодзи — только флаг
   из `flagEmojiOf`.
9. Значения профиля, `userId`, поисковый запрос — не в логах и не в текстах ошибок.
10. Системного `Alert` нет; шторка не пушит маршрут.
11. Индикаторов заполненности, напоминаний и бейджей нет.
12. Свободный ввод значения в шторке не принимается.
13. Никаких `@ts-ignore`/`@ts-expect-error`/`eslint-disable`; существующие guardrails не ослаблять.
14. Литерал `"from"` в `shared` вне `__tests__` не использовать.
15. Тесты — вне `app/`.

---

## 5. Риски, допущения, расхождения, вопросы

**Допущения (если неверны — остановиться и спросить):**
- A-1. Только локальный Supabase; хостинговый проект не трогается.
- A-2. Приёмка на iOS; код кроссплатформенный, Android не проверяется (флаги на Android — backlog).
- A-3. Существующие аккаунты бэкфилла не требуют: отсутствие строки — нормальное состояние (спек).

**Риски:**
- **R-1 (технический, средний).** Семантика PostgREST upsert: при `merge-duplicates` обновляются
  только колонки из тела. pgTAP моделирует это SQL-ом `on conflict … do update set <колонка>`,
  unit-тест проверяет тело запроса, а сам PostgREST — только ручная M7. Если окажется, что upsert
  обнуляет колонки, запасной вариант — `update` по `user_id`, а при 0 строк — `insert`: две
  операции в api, контракт тот же.
- **R-2 (технический, средний).** RN `Modal` поверх модального маршрута формы отеля (нативный
  modal stack). Ожидается, что всё работает, так как шторка не навигирует. Если на устройстве
  появятся артефакты (M15), в `PickerSheet` добавляется проп `presentation: "inline"`
  (in-tree, как нынешний `CurrencySheet`) только для формы отеля. Это правка шагов 5 и 9, объём
  не меняется.
- **R-3 (платформенный).** Клавиатура внутри `Modal` на Android (adjustResize у Dialog). На iOS
  работает `automaticallyAdjustKeyboardInsets`. Android — backlog, как и вся Android-приёмка.
- **R-4 (продуктовый, низкий).** Сортировка по свёртке: `й` стоит как `и`, `ß` как `ss`. Точная
  локальная коллация потребовала бы `Intl` в `shared`, а это запрещено `purity.test.ts`.
- **R-5 (тестовый).** Real-route тесты, которые доходят до `/profile`, падают или шумят без мока
  profile-api. `navigation.test.tsx` и `ProfileSignOut.test.tsx` закреплены за шагом 7. Если
  `authRoutes.test.tsx` тоже окажется на `/profile`, шаг 7 добавляет мок и туда и отмечает это
  в отчёте (файл вне списка — сообщить).
- **R-6 (данные).** 100 городов в справочнике: у многих стран городов нет (AC-26), синтетические
  аэропорты видны в шторке (Q6 спека, `shared/insights.md`).
- **R-7 (тестовый).** `FlatList` в шторке: окно виртуализации и таймер ~50 мс
  (`mobile/insights.md`); тесты ждут его явно.

**Расхождения спека, дизайна и кода (молча не чиним):**
- **N-1.** `account.md` требует `textTertiary` для «Не указано», а это ниже 4.5:1. План следует
  Q3 спека (`textSecondary`), документ правит шаг 11.
- **N-2.** `account.md` перечисляет строку «Удалить аккаунт» и ссылки на условия. Их нет
  (Non-goals спека, отдельный спек-блокер релиза).
- **N-3.** `currencyName.*` переезжают из i18n в `shared` (D-1). Спек допускает «ru/en из
  справочника или i18n»; выбран справочник, потому что поиск ищет на обоих языках сразу.
- **N-4.** `picker.md` говорит «четыре места», а перечисляет пять. План следует спеку (пять).
- **N-5.** При ошибке загрузки AC-28 говорит об ошибке «в блоке», не уточняя, в каком. План: ошибка
  и «Повторить» стоят в карточке «О себе», строка «Валюта» остаётся ненажимаемым плейсхолдером
  до успешной загрузки.
- **N-6.** `trips:errors.denied` звучит как «Нет доступа к этой поездке» и для профиля читается
  странно. План по букве AC-28/AC-31 переиспользует `trips:errors.*`. См. Q-E.
- **N-7.** Аватар S6 = 72 при токене 56 (Follow-ups спека). План чинит попутно в шаге 7, см. Q-D.

**Вопросы владельцу (у всех есть вариант по умолчанию; ни один не блокирует тир 1):**
- **Q-A. Режим выполнения.** *По умолчанию:* single-agent, по порядку. Тиры 1 (шаги 1–3)
  и 4 (шаги 7–9) не пересекаются по файлам и могут идти параллельными implementer'ами.
- **Q-B. `Modal` и в форме отеля** (D-2, R-2). *По умолчанию:* да, один хост на оба места;
  in-tree — запасной вариант по результатам M15.
- **Q-C. Поиск аэропорта по названию его города** («Жир» → Жирона, «Krak» → KRK). AC-17 говорит
  «по началу названия». *По умолчанию:* да, как в `searchAirports` формы рейса. Если нет — одна
  строка в `searchAirportOptions`.
- **Q-D. Аватар 72 → `layout.avatarProfile` (56)** в шаге 7. *По умолчанию:* да (спек разрешает
  попутно, `account.md` требует токен).
- **Q-E. Текст отказа `denied` для профиля** (N-6). *По умолчанию:* по спеку `trips:errors.denied`.
  Альтернатива — один ключ `profile.errors.denied` (правка шага 3 и одной строки в шаге 7).
