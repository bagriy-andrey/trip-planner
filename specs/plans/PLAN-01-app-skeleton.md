# Implementation Plan: App skeleton (SPEC-01)

**Spec:** `specs/SPEC-01-app-skeleton.md` (Status: approved, 2026-09-18) — источник истины для WHAT.
Этот документ — только HOW: файлы, модули, экспорты, порядок, команды.
**Status:** planning
**Scope:** `mobile/` (весь скелет), `e2e/` (Maestro smoke), `scripts/` (раннер e2e), корневые doc-файлы (статусы).
**НЕ трогаем:** `shared/`, `supabase/` — в скелете нет ни общей доменной логики, ни бэкенда.
**Platforms:** ios+android (код кросс-платформенный; проверка и приёмка — на iOS).
**Execution mode:** single-agent, последовательно (см. §3.0; опциональные параллельные тиры размечены).

---

## 0. Что уже существует (не трогать / не создавать заново)

Проверено чтением репозитория 2026-09-18.

| Артефакт | Состояние | Вывод для плана |
|---|---|---|
| `pnpm-workspace.yaml` | Есть, `packages: mobile, shared, e2e` | Менять не нужно; `supabase/` намеренно не пакет |
| корневой `package.json` | Есть: `typecheck`/`test` = `pnpm -r …`, `packageManager: pnpm@10`, `engines.node >=22` | Правка одна: `packageManager` указан как `pnpm@10`, локальный pnpm 11.7.0 ругается «not a valid exact version» — см. Шаг 1 |
| `mobile/`, `shared/`, `e2e/` | Только `AGENTS.md`, `CLAUDE.md`, `insights.md` (+ пустые `specs/` в mobile и shared). **Кода и `package.json` нет** | Шаг 1 обязан развернуть Expo-приложение **внутрь существующей папки**, не затерев эти файлы |
| `supabase/` | `AGENTS.md`, `CLAUDE.md`, `insights.md`, пустые `functions/`, `migrations/`, `tests/` | Вне скоупа плана целиком |
| `scripts/` | Пустая папка | Шаг 11 кладёт сюда `e2e.sh` |
| `specs/plans/` | Пустая папка | Сюда пишется этот план |
| `docs/decisions/ADR-001-backend-supabase.md` | Есть | Ничего из него в скелете не реализуется |
| `TESTING.md` | Есть: mobile = jest-expo + RNTL, e2e = Maestro | Фиксирует раннеры; менять не надо |
| `.gitignore` (корень) | Есть | Шаг 1 проверяет, что `mobile/ios`, `mobile/android`, `.expo`, `node_modules` игнорируются; дополняет при необходимости |
| Node 22.22.0, pnpm 11.7.0 | Установлены | OK |
| Xcode / iOS Simulator / Maestro | **Не проверялось** (см. §5) | Предусловие владельца, не задача implementer'а |

---

## 1. Разбивка по модулям

### 1.1 `mobile/` — корень пакета (конфигурация)

| Файл | Назначение |
|---|---|
| `package.json` | `@tripplanner/mobile`, `main: "expo-router/entry"`, скрипты `start`/`ios`/`typecheck`/`test`, **все** зависимости скелета (ставятся один раз, Шаг 1) |
| `tsconfig.json` | `extends: "expo/tsconfig.base"`, `strict: true`, `noUncheckedIndexedAccess`, `noImplicitOverride`, path-alias `@/*` → `src/*`, `include` с `expo-env.d.ts` и `.expo/types/**/*.ts` (typed routes) |
| `app.config.ts` | Единственная конфигурация приложения. Имя/схема/slug берутся **импортом** из `app.constants.ts`; `orientation: "portrait"`, `ios.supportsTablet: false`, `experiments.typedRoutes: true`, `locales: { ru, en }`, `plugins: ["expo-router", "expo-splash-screen", "expo-localization"]`, `ios.privacyManifests` — импортом из `app.privacy.ts` |
| `app.constants.ts` | **Единственный источник** `APP_NAME = "TripPlanner"`, `APP_SCHEME = "tripplanner"`, `APP_SLUG`, `SUPPORTED_LOCALES = ["ru","en"]`, `DEFAULT_LOCALE = "en"`. Файл без единого импорта (его читает и `app.config.ts` в Node-контексте, и RN-бандл) — **никаких** `react-native`/alias-импортов внутри |
| `app.privacy.ts` | Объект `iosPrivacyManifests` — зеркало required-reason API зависимостей (Шаг 10). Вынесен из `app.config.ts`, чтобы шаги не делили один файл |
| `jest.config.js` | `preset: "jest-expo"`, `setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"]`, `transformIgnorePatterns` из рецепта jest-expo |
| `jest.setup.ts` | Моки нативных модулей: async-storage (официальный jest-mock), `expo-localization`, `expo-blur`, `expo-font`, `expo-splash-screen`, `expo-system-ui` |
| `babel.config.js`, `metro.config.js`, `.gitignore`, `expo-env.d.ts` | Из шаблона `create-expo-app`; правится только alias/пресет |
| `assets/` | Временные иконка и splash (AC-29) |

### 1.2 `mobile/app/` — только маршруты (тонкие)

Правило `mobile-architecture`: файл маршрута читает параметры, задаёт заголовок/презентацию и рендерит экран фичи. Никакой логики, никаких литеральных строк, ≤ ~40 строк.

| Файл | Маршрут | Экран | Презентация |
|---|---|---|---|
| `app/_layout.tsx` | — | Root `<Stack>` + провайдеры + splash-гейт | — |
| `app/index.tsx` | `/` | `<Redirect href="/onboarding" />` | служебный, не экран |
| `app/onboarding.tsx` | `/onboarding` | S1 | корневой, `headerShown:false`, `gestureEnabled:false` |
| `app/sign-in.tsx` | `/sign-in` | S2 | push |
| `app/sign-up.tsx` | `/sign-up` | S3 | push |
| `app/forgot-password.tsx` | `/forgot-password` | S10 | push |
| `app/legal/terms.tsx` | `/legal/terms` | S11 | push |
| `app/legal/privacy.tsx` | `/legal/privacy` | S12 | push |
| `app/(tabs)/_layout.tsx` | — | `<Tabs>` с тремя экранами | таб-бар виден |
| `app/(tabs)/trips.tsx` | `/trips` | S4 | tab 1 |
| `app/(tabs)/history.tsx` | `/history` | S5 | tab 2 |
| `app/(tabs)/profile.tsx` | `/profile` | S6 | tab 3 |
| `app/trips/new.tsx` | `/trips/new` | S8 | modal |
| `app/trips/[tripId]/index.tsx` | `/trips/[tripId]` | S7 | push поверх табов (таб-бар не виден) |
| `app/trips/[tripId]/flights/new.tsx` | `/trips/[tripId]/flights/new` | S9-flight | modal |
| `app/trips/[tripId]/flights/[flightId].tsx` | `/trips/[tripId]/flights/[flightId]` | S9-flight | modal |
| `app/trips/[tripId]/hotels/new.tsx` | `/trips/[tripId]/hotels/new` | S9-hotel | modal |
| `app/trips/[tripId]/cars/new.tsx` | `/trips/[tripId]/cars/new` | S9-car | modal |
| `app/+not-found.tsx` | fallback | Переиспользует `features/legal` заглушку + кнопка «на главную» | служебный |

**Топология навигации (решение плана, соответствует AC-9/AC-10):**
S7 и модалки живут в **корневом** стеке, а не внутри стека таба. Тогда:
- таб-бар физически не виден на S7–S12 без хаков вида `tabBarStyle:{display:'none'}` (AC-9);
- возврат с S7 отдаёт пользователя в те табы и в тот таб, откуда он пришёл, потому что состояние `(tabs)` не размонтируется (AC-10);
- вход в табы — `router.replace('/trips')`, выход («Выйти») — `router.dismissAll()` + `router.replace('/onboarding')`, поэтому жест «назад» не возвращает в табы (AC-13).

Следствие (зафиксировать при ревью): edge case спека «повторное нажатие на активный таб возвращает стек таба к корню, например с S7 на S4» в этой топологии **неприменим** — на S7 таб-бар не виден. Внутри табов в скелете нет push-экранов, поэтому поведение «re-tap = scroll to top / no-op» достаточно. См. §5, вопрос R-1.

### 1.3 `mobile/src/lib/` — сквозная инфраструктура (три «единственные точки» спека)

```
src/lib/theme/
  tokens.ts            darkTokens, lightTokens, ThemeTokens, spacing, radii   (AC-16)
  typography.ts        FONT_FAMILY (Manrope*/IBMPlexMono*), typography роли: display/title/body/caption/mono (AC-17)
  preference.ts        ThemePreference='light'|'dark'|'system'; THEME_STORAGE_KEY;
                       parseThemePreference(value: unknown): ThemePreference | null   (AC-31)
                       resolveColorScheme(pref, systemScheme): 'light'|'dark'         (AC-14)
  ThemeProvider.tsx    контекст {tokens, scheme, preference, setPreference, isReady}; читает
                       настройку один раз на старте, пишет только после явного выбора (AC-33)
  useTheme.ts          хук-потребитель
  index.ts             публичная поверхность
src/lib/storage/
  settingsStorage.ts   единственная граница AsyncStorage: readSetting(key), writeSetting(key,value):
                       Promise<{ok:boolean}>; ошибки глотаются, наружу — флаг (edge case «запись не удалась»)
  index.ts
src/lib/i18n/
  resolveLocale.ts     SUPPORTED_LOCALES, resolveLocale(tags: string[]): 'ru'|'en'    (AC-35, AC-36)
  format.ts            formatDateRange, formatShortDate, formatNights, formatRelativeDays (AC-37)
  i18n.ts              init i18next: resources (namespaces), fallbackLng 'en', lng = resolveLocale(…)
  useDeviceLocaleSync.ts  AppState 'active' → пересчитать локаль → changeLanguage (edge case «смена языка на лету»)
  types.d.ts           типизация ресурсов i18next (ключ с опечаткой = ошибка компиляции)  (AC-24)
  locales/ru/*.ts, locales/en/*.ts   namespaces: common, onboarding, auth, legal, trips, history,
                       profile, tripDetail, bookingForm
  index.ts
src/lib/fonts.ts       useAppFonts(): [loaded, error] на expo-font + @expo-google-fonts/*; имена семейств
                       импортирует из theme/typography.ts (единственный источник)   (AC-18)
```

### 1.4 `mobile/src/components/` — общие примитивы (без знания о фичах)

`Screen.tsx` (safe area + scroll + keyboard-avoiding обёртка — edge case «клавиатура перекрывает кнопку»), `AppText.tsx` (проп `variant` из typography-ролей; `mono`-роль для билетных данных), `PrimaryButton.tsx`, `SecondaryButton.tsx`, `IconButton.tsx`, `PressableRow.tsx` (все — `accessibilityRole`, обязательный `accessibilityLabel`, minHeight/hitSlop ≥ 44pt — AC-19/AC-20), `GlassSurface.tsx` (стеклянная панель, использует `src/platform/blur`), `Pill.tsx` (accent/neutral/muted), `SoonBadge.tsx` (единое правило заглушек, Q7), `EmptyState.tsx`, `ModalHeader.tsx` (Отмена / Заголовок / Готово), `PlaceholderField.tsx` (неинтерактивное поле; проп `secure` для паролей — `secureTextEntry`, без логирования), `Stepper.tsx` (статичное значение между «−» и «+»), `Avatar.tsx` / `AvatarButton.tsx`, `index.ts`.

### 1.5 `mobile/src/platform/` — единственное место платформенных различий

`blur.ts` (по умолчанию + iOS: `BlurView` из `expo-blur`) и `blur.android.ts` (BlurView с `experimentalBlurMethod: 'dimezisBlurView'`; если качество/производительность неприемлемы — полупрозрачная заливка токеном «стекло» + граница). Фича-код импортирует только `@/platform/blur` (AC-27).

### 1.6 `mobile/src/features/*` — экраны как компоненты (без роутинга внутри)

Каждая фича: `index.ts` — публичная поверхность; навигация наружу — через `useRouter()` в компонентах-экранах фичи (маршруты как строковые литералы контракта, типизированные typed routes); параметры маршрута приходят **пропсами** из файла маршрута.

- `features/onboarding/` — `OnboardingScreen.tsx`, `components/DotsIndicator.tsx`.
- `features/auth/` — `SignInScreen.tsx`, `SignUpScreen.tsx`, `ForgotPasswordScreen.tsx`, `components/{SocialAuthButtons,OrDivider,AuthFooterLink,ConsentText}.tsx`.
- `features/legal/` — `LegalScreen.tsx` (проп `kind: 'terms' | 'privacy'`).
- `features/trips/` — `TripsScreen.tsx`, `components/{TripCard,TripCoverPlaceholder,TripStatusPill,FloatingAddButton}.tsx`, `placeholders.ts`, `types.ts`. **`TripCard.tsx` — «сменная единица»** (принцип 9 спека): замена на «корешок»/«таймлайн» = замена одного компонента.
- `features/history/` — `HistoryScreen.tsx`, `placeholders.ts` (переиспользует `TripCard` и тип через `features/trips/index.ts`, не через внутренности).
- `features/profile/` — `ProfileScreen.tsx`, `components/{ProfileHeader,ThemeSettingRow,SoonSettingRow}.tsx`. `ThemeSettingRow` — единственный рабочий интерактив скелета (AC-15, AC-30).
- `features/trip-detail/` — `TripDetailScreen.tsx` (проп `tripId: string`, содержимое от него не зависит — edge case «произвольный tripId»), `components/{TripHero,BookingSection,FlightCard,HotelCard,CarEmptySection}.tsx`, `placeholders.ts`.
- `features/new-trip/` — `NewTripScreen.tsx`.
- `features/booking-form/` — `BookingFormScreen.tsx` (проп `variant: 'flight' | 'hotel' | 'car'`), `fields.ts` (описание набора полей на вариант — данные, не разметка), `components/{PassengerStepper,BaggageToggle}.tsx`.

### 1.7 `mobile/src/test-utils/`

`renderWithProviders.tsx` — обёртка RNTL с Theme/i18n/SafeArea-провайдерами и опцией `{ locale, themePreference }`.

### 1.8 `e2e/` и `scripts/`

`e2e/package.json` (`@tripplanner/e2e`, приватный, скрипты `test:e2e`, no-op `typecheck`/`test`, чтобы `pnpm -r` не падал), `e2e/flows/skeleton-smoke.yaml`, `e2e/flows/theme-persistence.yaml`, `e2e/flows/config.yaml` (appId), `scripts/e2e.sh`.

---

## 2. Изменения зависимостей

Все зависимости ставятся **одним разом на Шаге 1** — это сознательное решение: `mobile/package.json` и `pnpm-lock.yaml` тогда принадлежат ровно одному шагу, и списки файлов остальных шагов остаются непересекающимися.

**Версии не указываем.** Каждая строка ниже ставится через `npx expo install <pkg>` — версия пинится Expo SDK на момент реализации.

| Пакет | Зачем в скелете | Нативный? |
|---|---|---|
| `expo`, `react`, `react-native` | база (из шаблона) | да |
| `expo-router` + `react-native-safe-area-context`, `react-native-screens`, `expo-linking`, `expo-constants`, `expo-status-bar` | файловая навигация, safe areas, URL-схема | да |
| `expo-splash-screen` | удержание сплэша до готовности шрифтов и темы (AC-18, AC-32) | да |
| `expo-system-ui` | цвет корневого фона по теме — убирает вспышку белого до первого кадра (AC-32) | да |
| `expo-font`, `@expo-google-fonts/manrope`, `@expo-google-fonts/ibm-plex-mono` | Manrope + IBM Plex Mono (AC-17); google-fonts-пакеты — просто TTF-ассеты | expo-font: да |
| `expo-blur` | liquid-glass панели; кросс-платформенный Expo-модуль (iOS: UIVisualEffectView, Android: experimental blur) | да |
| `expo-localization` | язык устройства (AC-35/36) | да |
| `@react-native-async-storage/async-storage` | единственная запись скелета — выбор темы. **Не MMKV** (`mobile/AGENTS.md`, `mobile/insights.md`: UserDefaults → privacy-manifest риск) | да |
| `expo-dev-client` | dev-сборка вместо Expo Go (в проекте есть нативные модули вне Expo Go) | да |
| `i18next`, `react-i18next` | локализация | нет (чистый JS) |
| dev: `typescript`, `@types/react`, `jest`, `jest-expo`, `@testing-library/react-native`, `@types/jest`, `react-test-renderer` | тесты и типы | нет |

**Чего в скелете НЕТ и быть не должно:** `@supabase/supabase-js`, `@tanstack/react-query`, `expo-secure-store`, `expo-sqlite`, `expo-notifications`, `react-native-mmkv`, `expo-image`, `react-native-reanimated` (в скелете нечего анимировать вне нативной навигации), любые аналитика/крэш-репортинг.

**Почему i18next, а не самописный словарь.** Нужны три вещи, которые руками писать дороже, чем взять библиотеку: (а) русские правила множественного числа для «через 1/2/5 дней» — у i18next они встроены (ICU plural categories), (б) namespaces, чтобы файлы строк не становились одним конфликтным файлом, (в) типизация ресурсов (`types.d.ts`), превращающая опечатку в ключе в ошибку `tsc` — это и есть автоматическая часть AC-24/AC-34. `react-i18next` даёт перерисовку при смене языка на лету. Библиотека чисто-JS, нативной сборки не требует. Даты — `Intl.DateTimeFormat` (см. риск R-3).

**Разрешения / permission-строки:** ни одна из зависимостей выше не требует `NS*UsageDescription`. Если реализация потянет пакет, требующий usage-строку, — это отклонение от спека, остановиться и спросить владельца.

**Privacy manifest (Шаг 10):** AsyncStorage объявляет `NSPrivacyAccessedAPICategoryFileTimestamp` (код `C617.1`). Проверить фактический файл установленной версии и продублировать в `ios.privacyManifests` (Apple ненадёжно разбирает манифесты вложенных статических подов — `mobile/insights.md`).

**Dev-client rebuild:** ровно один раз после Шага 1 (`npx expo run:ios` — CNG сгенерирует `mobile/ios/`, который правкам руками не подлежит). Дальше до конца плана нативные модули не добавляются, пересборка не нужна.

**Секреты:** в скелете их нет. Никаких `.env`, никаких `EXPO_PUBLIC_*` «на будущее» (Non-functional/Безопасность спека). AsyncStorage не зашифрован — туда пишется ровно один несекретный ключ.

---

## 3. Порядок выполнения

### 3.0 Режим выполнения

По умолчанию план рассчитан на **single-agent, строго по порядку**. Причина: сквозные слои (тема, i18n, примитивы, layout'ы) — это и есть почти весь скелет; параллельный выигрыш маленький, а цена расхождения (разные подписи компонентов, разъезд ключей строк) большая. Шаги 6, 7, 8 и 10 формально файл-непересекающиеся и помечены как **OPTIONAL parallel tier** — их можно раздать параллельно, если владелец выберет multi-agent. Вопрос владельцу — в финальном сообщении.

**Исключение из правила непересечения (одно, осознанное):** Шаг 1 создаёт `app/_layout.tsx` и `app/index.tsx` как *bootstrap-заглушки* — без них expo-router не стартует и DoD Шага 1 («приложение запускается») непроверяем. Шаг 9 — единственный, кому разрешено эти два файла **переписать целиком**. Ни один другой шаг их не трогает. При multi-agent это значит: Шаг 9 всегда после Шага 1, никогда параллельно ему.

---

### Шаг 1 — Каркас Expo-приложения и подключение к workspace

**Зависит от:** ничего. **Блокирует:** всё.

**Владеет файлами:**
`mobile/package.json`, `mobile/tsconfig.json`, `mobile/babel.config.js`, `mobile/metro.config.js`, `mobile/.gitignore`, `mobile/expo-env.d.ts`, `mobile/jest.config.js`, `mobile/jest.setup.ts`, `mobile/app/_layout.tsx` (bootstrap-заглушка), `mobile/app/index.tsx` (bootstrap-заглушка), `pnpm-lock.yaml`, `package.json` (корневой — одна правка `packageManager`), `.gitignore` (корневой — только если чего-то не хватает).

**Что делать (точные команды):**

`create-expo-app` отказывается работать в непустой папке, поэтому генерируем в скрэтч-каталоге и переносим содержимое поверх существующего `mobile/` (rsync ничего не удаляет — `AGENTS.md`, `CLAUDE.md`, `insights.md`, `specs/` уцелеют):

```bash
cd /tmp
npx create-expo-app@latest tp-mobile --template blank-typescript --no-install
rsync -a --exclude node_modules/ --exclude .git/ tp-mobile/ \
  /Users/andriibahrii/Documents/pet-projects/trip-planner/mobile/
rm -rf /tmp/tp-mobile
```

Шаблон `blank-typescript` выбран сознательно: шаблон `default` приносит демо-табы и демо-компоненты, которые пришлось бы вычищать.

Дальше, из `mobile/`:
1. `package.json`: `"name": "@tripplanner/mobile"`, `"private": true`, `"main": "expo-router/entry"`, скрипты:
   `"start": "expo start"`, `"ios": "expo run:ios"`, `"typecheck": "tsc --noEmit"`, `"test": "jest"`.
2. Удалить сгенерированный `App.tsx` и `app.json` (конфиг переедет в `app.config.ts` на Шаге 2; до тех пор оставить минимальный `app.json` с `name`/`slug`/`scheme`, чтобы приложение стартовало).
3. Установка зависимостей (список §2), нативные — только через expo:
   ```bash
   npx expo install expo-router react-native-safe-area-context react-native-screens \
     expo-linking expo-constants expo-status-bar expo-splash-screen expo-system-ui \
     expo-font expo-blur expo-localization expo-dev-client \
     @react-native-async-storage/async-storage
   npx expo install @expo-google-fonts/manrope @expo-google-fonts/ibm-plex-mono
   pnpm add i18next react-i18next
   npx expo install -- --save-dev jest jest-expo @testing-library/react-native @types/jest react-test-renderer
   npx expo install --check      # привести версии к SDK, согласиться на предложенные правки
   ```
4. `tsconfig.json`: `extends "expo/tsconfig.base"`, `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `skipLibCheck: true`, `paths: { "@/*": ["./src/*"] }`, `include: ["**/*.ts", "**/*.tsx", "expo-env.d.ts", ".expo/types/**/*.ts"]`. Alias продублировать в `babel.config.js` (`babel-plugin-module-resolver`) **или** не заводить alias вовсе и использовать относительные импорты — выбрать одно и держаться (рекомендуется alias: expo-router-проекты его поддерживают из коробки через `tsconfig.paths` + metro).
5. `jest.config.js` (`preset: jest-expo`, `setupFilesAfterEach`/`setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']`, `transformIgnorePatterns` по рецепту jest-expo) и `jest.setup.ts` с моками: async-storage (`jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'))`), `expo-localization` (управляемый `getLocales`), `expo-blur` (рендерит `View`), `expo-font` (`isLoaded → true`), `expo-splash-screen`, `expo-system-ui`.
6. Bootstrap-маршруты: `app/_layout.tsx` — голый `<Stack />`; `app/index.tsx` — экран с текстом `APP bootstrap` (временный, заменяется на Шаге 9).
7. Корневой `package.json`: `"packageManager": "pnpm@10.0.0"` (или точная установленная версия) — текущее `pnpm@10` даёт WARN на pnpm 11.
8. Проверить, что корневой `.gitignore` покрывает `node_modules`, `.expo`, `mobile/ios`, `mobile/android`, `*.log`, `.maestro`.
9. Один раз собрать dev-клиент: `cd mobile && npx expo run:ios`.

**НЕ делать:** не создавать `package.json` в `shared/` (в скелете нет общей логики — `pnpm install` просто игнорирует папку без манифеста); `e2e/package.json` появится на Шаге 11.

**Критерии готовности:**
- `pnpm install` в корне проходит; `mobile` виден как workspace-пакет (`pnpm -r list --depth -1`).
- `pnpm --filter @tripplanner/mobile typecheck` — 0 ошибок.
- `pnpm --filter @tripplanner/mobile test` — jest стартует (0 тестов допустимо, `--passWithNoTests`).
- `npx expo run:ios` ставит dev-клиент, приложение открывается и показывает bootstrap-экран.
- `git status`: `mobile/AGENTS.md`, `mobile/CLAUDE.md`, `mobile/insights.md` **не изменены**; `mobile/ios/` не попал в индекс.

---

### Шаг 2 — Идентичность приложения и `app.config.ts`

**Зависит от:** Шаг 1.

**Владеет файлами:** `mobile/app.constants.ts`, `mobile/app.config.ts`, `mobile/app.privacy.ts` (заглушка: пустой манифест + TODO на Шаг 10), `mobile/assets/icon.png`, `mobile/assets/splash.png`, `mobile/assets/adaptive-icon.png`, `mobile/assets/icon.svg` (исходник), `mobile/__tests__/app-config.test.ts`. Удаляет `mobile/app.json`.

**Что делать:**
- `app.constants.ts` — единственные значения `APP_NAME`, `APP_SCHEME`, `APP_SLUG`, `SUPPORTED_LOCALES`, `DEFAULT_LOCALE` (принцип 3 спека, US-5). Ноль импортов в файле.
- `app.config.ts` (`export default (): ExpoConfig => …`): `name: APP_NAME`, `slug`, `scheme: APP_SCHEME` (`tripplanner://`, Q10), `orientation: 'portrait'`, `userInterfaceStyle: 'automatic'`, `ios.supportsTablet: false`, `ios.bundleIdentifier` — **временный плейсхолдер с комментарием, что финальный выбирается в release-спеке (Q12)**, `locales: { ru: './locales/ru.json', en: './locales/en.json' }` (файлы метаданных приложения — только `CFBundleDisplayName`; нужны, чтобы iOS считал приложение локализованным), `experiments.typedRoutes: true`, `plugins: ['expo-router', 'expo-splash-screen', 'expo-localization']`, `ios.privacyManifests: iosPrivacyManifests` из `app.privacy.ts`, `splash`/`icon` на временные ассеты, `backgroundColor` = тёмный фон `#0B0D11` (никакой белой вспышки).
- Временные иконка и splash (AC-29): нарисовать `assets/icon.svg` (фон `#0B0D11`, акцентная `#F2A93B` фигура/буква) и растрировать: `pnpm dlx sharp-cli -i assets/icon.svg -o assets/icon.png resize 1024 1024`. `sharp-cli` — разовый инструмент, **в зависимости не добавляется**. Альтернатива, если растеризация не заладится: владелец кладёт любой PNG 1024×1024 (см. R-5).

**Критерии готовности:**
- `npx expo config --type public` отдаёт валидный конфиг; `name` совпадает с `APP_NAME`, `orientation === 'portrait'`, `scheme === 'tripplanner'`.
- Тест `app-config.test.ts`: импортирует `app.config.ts` и `app.constants.ts`, проверяет `name === APP_NAME`, `scheme === APP_SCHEME`, `orientation === 'portrait'`, `ios.supportsTablet === false`, `locales` содержит ровно `ru` и `en` (AC-2, AC-4).
- `pnpm --filter @tripplanner/mobile typecheck` зелёный.

---

### Шаг 3 — Слой темы и граница хранилища

**Зависит от:** Шаг 1 (Шаг 2 не обязателен).

**Владеет файлами:** `mobile/src/lib/theme/{tokens.ts, typography.ts, preference.ts, ThemeProvider.tsx, useTheme.ts, index.ts}`, `mobile/src/lib/storage/{settingsStorage.ts, index.ts}`, `mobile/src/lib/theme/__tests__/{preference.test.ts, tokens.test.ts, ThemeProvider.test.tsx}`, `mobile/src/lib/storage/__tests__/settingsStorage.test.ts`.

**Что делать:**
- `tokens.ts`: ровно значения из таблицы брифа (Q13), `as const`:
  фон `#0B0D11` / `#F3F1EC`; стекло `rgba(255,255,255,0.07)` / `rgba(255,255,255,0.55)`; граница стекла `rgba(255,255,255,0.14)` / `rgba(20,23,28,0.09)`; текст `#F5F6F7` / `#14171C`; акцент `#F2A93B` в обеих. Плюс производные (приглушённый текст, цвет пилюли, оверлей обложки) — тоже здесь, не в экранах. Плюс `spacing`, `radii`.
- `typography.ts`: константы семейств (`Manrope_400Regular`, `Manrope_600SemiBold`, `Manrope_700Bold`, `IBMPlexMono_400Regular`, `IBMPlexMono_500Medium`) и роли (`display`, `title`, `body`, `caption`, `mono`, `monoSmall`). Роли не задают абсолютный `lineHeight` в пикселях без запаса — Dynamic Type (AC-21).
- `preference.ts`: `THEME_STORAGE_KEY = 'tripplanner.settings.theme'`; `parseThemePreference` (валидация недоверенного значения из хранилища: всё, что не в множестве, → `null`); `resolveColorScheme(pref, systemScheme)`: `'system' → systemScheme ?? 'dark'`, иначе сама тема. Функции чистые, без импортов RN.
- `ThemeProvider.tsx`: на монтировании читает настройку (async), ставит `isReady`; `scheme` = `resolveColorScheme(preference, useColorScheme())` — вычисляется при рендере, не хранится в state (react-best-practices: derive, don't store); `setPreference` обновляет state **и** пишет в хранилище, отдавая результат записи; при неуспехе тема всё равно применяется в сессии. До первого явного выбора **ничего не пишется** (AC-33). Контекст один и мал (`tokens`, `scheme`, `preference`, `setPreference`, `isReady`).
- `settingsStorage.ts`: `readSetting`/`writeSetting`, try/catch, никогда не бросает; экспортирует список разрешённых ключей и запрещает писать что-либо кроме них (тест этого правила — часть AC-33).

**Критерии готовности (`pnpm --filter @tripplanner/mobile test`):**
- `parseThemePreference`: `'light'|'dark'|'system'` → само значение; `null`, `undefined`, `''`, `'Светлая'`, `'{"a":1}'`, число → `null` (AC-31).
- `resolveColorScheme`: нет выбора → `dark` при системной светлой (AC-14); `'system'` + системная светлая → `light`; `'system'` + `null` от системы → `dark`.
- `tokens.test.ts`: точные значения из AC-16 (снимок литералов, не `toMatchSnapshot`).
- `ThemeProvider.test.tsx`: смена preference меняет отдаваемые токены немедленно (AC-15); при сломанном хранилище (мок бросает) провайдер стартует в тёмной без исключения; после `setPreference` в хранилище оказывается **ровно один** ключ (AC-33).
- `pnpm --filter @tripplanner/mobile typecheck`.

---

### Шаг 4 — Локализация: строки, выбор локали, форматирование

**Зависит от:** Шаг 1.

**Владеет файлами:** `mobile/src/lib/i18n/**` (все файлы из §1.3, включая `locales/ru/*.ts`, `locales/en/*.ts`), `mobile/src/lib/i18n/__tests__/{resolveLocale.test.ts, format.test.ts, parity.test.ts}`, `mobile/locales/ru.json`, `mobile/locales/en.json` (метаданные приложения для `app.config.ts:locales`).

**Что делать:**
- Один шаг владеет **всеми** строками обеих локалей — это и делает проверку паритета ключей осмысленной, и снимает конфликт «каждая фича правит общий файл строк». Ключи выводятся напрямую из колонки «Что показывает скелет» инвентаря экранов S1–S12 (включая тексты заглушек «скоро»/`soon` и «Текст будет добавлен позже»/«Text will be added later», Q14).
- Namespace на экранную группу: `common` (кнопки Отмена/Готово/Сохранить/Назад, подписи табов, «скоро»), `onboarding`, `auth`, `legal`, `trips`, `history`, `profile`, `tripDetail`, `bookingForm`.
- **Один плейсхолдер в каждой локали сознательно делается длинным** (город и имя пользователя) — edge case спека про перенос/усечение.
- `resolveLocale(tags)`: по primary subtag; `ru*` → `ru`, иначе `en` (AC-36).
- `format.ts`: диапазон дат и короткая дата через `Intl.DateTimeFormat(locale, …)`; «через N дней» — через i18next-ключ с плюрализацией (`{count}`), не через `Intl.RelativeTimeFormat` (см. R-3); «завершено»/«completed» — обычный ключ. Все функции чистые, принимают `locale` и фиксированную дату «сейчас» параметром (тестируемость без моков времени).
- `types.d.ts`: `declare module 'i18next' { interface CustomTypeOptions { resources: typeof ruResources } }` — опечатка в ключе становится ошибкой `tsc`.
- `useDeviceLocaleSync.ts`: при `AppState → 'active'` пересчитать локаль и, если изменилась, `i18n.changeLanguage` (edge case «смена языка устройства на лету»).

**Критерии готовности:**
- `parity.test.ts`: множества ключей ru и en (рекурсивно, по всем namespace) идентичны; ни одного пустого значения; ни одного значения, равного своему ключу (AC-34).
- `resolveLocale.test.ts`: `['ru-RU']→ru`, `['en-US']→en`, `['de-DE']→en`, `[]→en`, `['ru']→ru` (AC-35, AC-36).
- `format.test.ts`: диапазон «12–18 сент 2026» и его английский аналог; «через 1 день / через 2 дня / через 5 дней» и «in 1 day / in 5 days» — обе локали, границы плюрализации; проверка на переходе через сутки (AC-37).
- typecheck зелёный.

---

### Шаг 5 — Шрифты, платформенный blur, общие UI-примитивы, тестовая обвязка

**Зависит от:** Шаги 3, 4.

**Владеет файлами:** `mobile/src/lib/fonts.ts`, `mobile/src/platform/{blur.ts, blur.android.ts}`, `mobile/src/components/**` (все примитивы §1.4 + `index.ts`), `mobile/src/components/__tests__/*`, `mobile/src/test-utils/renderWithProviders.tsx`.

**Что делать:**
- `fonts.ts`: `useAppFonts()` на `useFonts` из `expo-font`, карта «имя семейства из `theme/typography.ts` → ассет из `@expo-google-fonts/*`». Имена семейств **не дублировать** — импортировать из `typography.ts`.
- `blur.ts` / `blur.android.ts`: единственное место, где вообще может быть платформенная развилка (AC-27). Нейтральный экспорт `Blur` с пропами `{ intensity, tint, style, children }`.
- Примитивы: все интерактивные — обязательный `accessibilityLabel` в типе пропсов (не опциональный!), `accessibilityRole`, минимальная область нажатия 44×44 (`minHeight/minWidth` + `hitSlop`). `AppText` не отключает `allowFontScaling`. `PlaceholderField` с `secure` → `secureTextEntry`, `editable={false}`.
- `GlassSurface`: `Blur` + граница из токена + возможность усилить подложку (запас на AC-22 при недостаточном контрасте).
- `renderWithProviders`: RNTL + ThemeProvider (можно задать preference) + I18nextProvider (можно задать локаль) + SafeAreaProvider с фиксированными инсетами.

**Критерии готовности:**
- Тесты примитивов: у кнопки/строки/иконки есть роль и непустая подпись; при попытке отрендерить без `accessibilityLabel` — ошибка типов (проверяется тем, что проп обязателен) (AC-19); стиль кнопки даёт ≥44pt по обеим осям (AC-20).
- `AppText` c `variant='mono'` отдаёт семейство IBM Plex Mono, остальные роли — Manrope (AC-17).
- typecheck + test зелёные.

---

### Шаг 6 — Экраны: онбординг, аутентификация, юридические заглушки (S1, S2, S3, S10, S11, S12)

**Зависит от:** Шаг 5. **OPTIONAL parallel tier A** (вместе с 7, 8, 10).

**Владеет файлами:** `mobile/src/features/onboarding/**`, `mobile/src/features/auth/**`, `mobile/src/features/legal/**` (включая их `__tests__`).

**Что делать:** собрать экраны по инвентарю спека из примитивов Шага 5 и ключей Шага 4. Навигация — `useRouter()` по маршрутам контракта: S1 «Начать» → `/sign-up`, «Войти» → `/sign-in`; S2 «Войти» → `router.replace('/trips')`, «Создать» → `/sign-up`, «Забыли пароль?» → `/forgot-password`; S3 «Зарегистрироваться» → `router.replace('/trips')`, ссылки → `/legal/terms`, `/legal/privacy`. Apple/Google — заглушки по правилу Q7 (нажимаемы, ничего не делают, рядом пометка «скоро»). Поля — `PlaceholderField`, пароли — `secure`. Экраны обёрнуты в `Screen` (safe area + скролл, чтобы клавиатура не перекрывала первичную кнопку).

**Критерии готовности:**
- Тест S1: отображаемое название равно `APP_NAME` из `app.constants.ts` (AC-2); нажатия «Начать»/«Войти» вызывают router с ожидаемыми маршрутами (AC-6).
- Тест S2/S3: «Войти»/«Зарегистрироваться` → `replace('/trips')` без какой-либо проверки значений (AC-7).
- Тест: в поддереве экранов нет ни одной строки, не пришедшей из i18n (проверяется общим guardrail-тестом Шага 9; здесь — визуально/ревью).
- typecheck + test.

---

### Шаг 7 — Экраны табов: Поездки, История, Профиль (S4, S5, S6)

**Зависит от:** Шаг 5 (и Шаг 3 для темы). **OPTIONAL parallel tier A.**

**Владеет файлами:** `mobile/src/features/trips/**`, `mobile/src/features/history/**`, `mobile/src/features/profile/**` (включая `__tests__`).

**Что делать:**
- S4: крупный заголовок, `AvatarButton` (переключает **таб** `/profile`, Q1 — `router.navigate('/profile')`, не push), 3–4 статичные карточки (`placeholders.ts`: ближайшая с акцентной пилюлей «через 5 дней», остальные нейтральные, одна — черновик «план · дата не выбрана», одна — с нарочито длинным названием города), `FloatingAddButton` → `/trips/new`. Даты — `mono`-роль и `format.ts`.
- S5: то же, приглушённые карточки, статус «завершено».
- S6: `ProfileHeader` (аватар, имя, email — плейсхолдеры); `SoonSettingRow` × 3 («Уведомления», «Подключённые аккаунты · Booking.com», «Валюта · EUR») по правилу Q7; `ThemeSettingRow` — **рабочий** сегментированный выбор Светлая/Тёмная/Системная через `useTheme().setPreference`; «Выйти» → `router.dismissAll()` + `router.replace('/onboarding')`.
- `TripCard` пометить комментарием как сменную единицу (принцип 9).

**Критерии готовности:**
- Тест `ThemeSettingRow`: выбор «Светлая» меняет тему в дереве немедленно (AC-15) и вызывает запись в хранилище ровно одного ключа (AC-33).
- Тест `ProfileScreen`: набор строк настроек **не содержит** строки выбора языка (AC-40); каждая заглушка несёт пометку «скоро» (Q7).
- Тест `TripsScreen`/`HistoryScreen`: рендер всех плейсхолдеров, у аватар-кнопки и карточек непустые accessibility-подписи (AC-19); длинный город не выбрасывает исключение и усечён (`numberOfLines`).
- typecheck + test.

---

### Шаг 8 — Экраны: детали поездки и формы (S7, S8, S9)

**Зависит от:** Шаг 5. **OPTIONAL parallel tier A.**

**Владеет файлами:** `mobile/src/features/trip-detail/**`, `mobile/src/features/new-trip/**`, `mobile/src/features/booking-form/**` (включая `__tests__`).

**Что делать:**
- S7 (`TripDetailScreen`, проп `tripId: string`, **контент от него не зависит**): hero ~260pt, стеклянные круглые «назад» и «…» (последняя — заглушка Q7), стеклянная панель (город, пилюля, «12–18 сент 2026 · 6 ночей» моноширинным). Секции «Рейс» / «Отель» / «Аренда авто», у каждой в заголовке «+». Карточка рейса → `/trips/[tripId]/flights/[flightId]`; «+» рейса → `/flights/new`; «+» отеля → `/hotels/new`; «Добавить автомобиль» и «+» авто → `/cars/new`. Секция авто — единственное пустое состояние (`EmptyState`).
- S8 (`NewTripScreen`): `ModalHeader` (Отмена / Новая поездка / Готово), два `PlaceholderField`, «Сохранить»; любая из трёх кнопок — `router.back()`.
- S9 (`BookingFormScreen`, `variant`): общий каркас; наборы полей в `fields.ts` (рейс: Откуда, Куда, Дата вылета, Время, переключатель «Багаж включён», `Stepper` «Пассажиры» со статичным «2» (Q15), Место, Номер билета; отель: Название, Город, Check-in, Check-out, Завтраки; авто: Компания, Получение, Возврат, Даты). Кнопки шапки и «Сохранить» → `router.back()`.

**Критерии готовности:**
- Тест: `TripDetailScreen` с `tripId='', 'не-существует', '../../etc'` рендерится одинаково и без исключений (edge case «произвольный tripId», защита будущей deep-link поверхности).
- Тест: три варианта `BookingFormScreen` рендерят свои наборы полей; степпер показывает «2» и не меняется по нажатию (Q15).
- Тест: кнопки шапки модалок вызывают `back()` (AC-12).
- typecheck + test.

---

### Шаг 9 — Маршруты, layout'ы, splash-гейт и контрактные guardrail-тесты

**Зависит от:** Шаги 2, 3, 4, 5, 6, 7, 8. Переписывает bootstrap-файлы Шага 1 (см. §3.0).

**Владеет файлами:** весь `mobile/app/**` (список из §1.2), `mobile/__tests__/routes.contract.test.ts`, `mobile/__tests__/guardrails.test.ts`, `mobile/app/__tests__/navigation.test.tsx`.

**Что делать:**
- `app/_layout.tsx`: `SplashScreen.preventAutoHideAsync()` на уровне модуля; провайдеры `SafeAreaProvider → ThemeProvider → I18nextProvider`; `useAppFonts()` + `useDeviceLocaleSync()`; сплэш скрывается **только когда шрифты загружены И тема прочитана** (`isReady`) (AC-18, AC-32); `expo-system-ui` ставит фон корня по теме; `<Stack>` с объявленными `Stack.Screen` — презентации (`modal` для `trips/new` и всех форм), `headerShown` и `gestureEnabled: false` на `onboarding` и `(tabs)`.
- `app/(tabs)/_layout.tsx`: три `Tabs.Screen` с локализованными подписями и `tabBarAccessibilityLabel`; подсветка активного цветом-акцентом (AC-8). Подписи табов — самое узкое место расширения текста (AC-39), не задавать фиксированную ширину.
- Файлы маршрутов — тонкие: `useLocalSearchParams<{tripId: string}>()` и передача в компонент фичи пропсом.
- `routes.contract.test.ts`: рекурсивно читает `app/`, нормализует имена файлов в маршруты, сравнивает множество с точным списком карты маршрутов спека + служебные `/`, `+not-found` (AC-23).
- `guardrails.test.ts` — статические проверки исходников (это и есть автоматическая часть «архитектурных» AC):
  - в `app/**` и `src/features/**`, `src/components/**` нет символов кириллицы вне комментариев → значит нет зашитых пользовательских строк (AC-24); все строки живут в `src/lib/i18n/locales/**`;
  - нигде вне `src/platform/**` нет `Platform.OS` / `.ios.tsx` / `.android.tsx` (AC-27);
  - нигде нет `supabase`, `@supabase/`, `fetch(`, `XMLHttpRequest`, `axios` (AC-25);
  - нигде нет `@ts-ignore` / `@ts-expect-error` / `eslint-disable` (AC-26);
  - вне `src/lib/theme/**` нет hex-литералов цвета и имён шрифтов (AC-16, AC-17);
  - вне `src/lib/storage/**` нет импорта `@react-native-async-storage/async-storage`, и записывается ровно один ключ (AC-33).
- `navigation.test.tsx` на `renderRouter` из `expo-router/testing-library`: старт даёт `/onboarding` (AC-1); «Начать» → `/sign-up` (AC-6); «Войти» → `/trips` (AC-7); на `/trips`,`/history`,`/profile` таб-бар в дереве есть, на `/trips/x` — нет (AC-8, AC-9); открытие детали из `/history` и `back()` возвращает на `/history` (AC-10); «Выйти» приводит к `/onboarding` и стек не содержит табов (AC-13).
  *Если `renderRouter` в установленной версии недоступен — fallback: мок `useRouter` и проверка вызванных маршрутов; отметить в `mobile/insights.md`.*

**Критерии готовности:**
- Все три тест-файла зелёные; `pnpm --filter @tripplanner/mobile typecheck` и `test` зелёные.
- Ручная проверка: на симуляторе достижимы все 12 экранов; таб-бар виден/скрыт по AC-8/AC-9; swipe-back работает на S7, S10, S11, S12; модалки закрываются свайпом вниз.

---

### Шаг 10 — Privacy manifest: зеркалирование required-reason API

**Зависит от:** Шаг 1 (файл-независим от 2–9). **OPTIONAL parallel tier A.**

**Владеет файлами:** `mobile/app.privacy.ts`, `docs/release/privacy-manifest-audit.md` (короткая таблица аудита с датой и версиями).

**Что делать (процедура из `mobile-release` + `mobile/insights.md`):**
```bash
cd mobile
ls node_modules/*/ios/**/PrivacyInfo.xcprivacy node_modules/@*/*/ios/**/PrivacyInfo.xcprivacy 2>/dev/null
cat node_modules/@react-native-async-storage/async-storage/ios/PrivacyInfo.xcprivacy
```
Собрать `NSPrivacyAccessedAPITypes` + коды причин всех прямых и транзитивных нативных зависимостей и продублировать их в `iosPrivacyManifests` (ожидание: AsyncStorage → `NSPrivacyAccessedAPICategoryFileTimestamp`, причина `C617.1`; другие Expo-модули могут добавить `SystemBootTime`/`DiskSpace` — брать фактические, не предполагаемые). Зависимость, которая трогает эти API и **не** несёт своего манифеста, — стоп-сигнал: зафиксировать в документе аудита и сообщить владельцу.

**Критерии готовности:** `npx expo config --type public` показывает непустой `ios.privacyManifests`; в документе аудита перечислены все найденные файлы манифестов с версиями пакетов; в скелете по-прежнему ноль permission-строк (`ios.infoPlist` не содержит ни одной `NS*UsageDescription`).

---

### Шаг 11 — Maestro e2e: пакет, раннер, два потока

**Зависит от:** Шаги 4 (строки — селекторы), 9 (маршруты и подписи).

**Владеет файлами:** `e2e/package.json`, `e2e/flows/config.yaml`, `e2e/flows/skeleton-smoke.yaml`, `e2e/flows/theme-persistence.yaml`, `scripts/e2e.sh`.

**Что делать:**
- `e2e/package.json`: `@tripplanner/e2e`, private, `scripts: { "test:e2e": "../scripts/e2e.sh", "typecheck": "echo no-op", "test": "echo no-op" }` (последние два — чтобы `pnpm -r typecheck/test` не падали на пакете без TS).
- `scripts/e2e.sh` (bash, `set -euo pipefail`, chmod +x): проверяет наличие `maestro` в PATH и загруженного симулятора (`xcrun simctl list devices booted`), печатает понятную ошибку с инструкцией, если чего-то нет; принимает имя потока и флаг `--locale ru|en`; запускает `maestro test e2e/flows/<flow>.yaml`.
- `skeleton-smoke.yaml` — обход в фиксированном порядке (AC-5, AC-28): `launchApp` с `clearState: true` → онбординг (заголовок «Все поездки — в одном месте») → «Начать» → S3 → ссылки на S11 и S12 и назад → «Зарегистрироваться» → `/trips` → переключить все три таба → карточка из «Истории» → S7 → назад (проверить, что видна «История») → карточка в «Поездки» → S7 → «+» рейса → S9 → «Отмена» → назад → «+» плавающая → S8 → «Отмена» → таб «Профиль» → «Выйти» → онбординг. Дополнительно из S2: «Забыли пароль?» → S10 → назад. Селекторы — **только** по тексту/accessibility-подписи (двойная роль: проверка a11y, AC-19).
- `theme-persistence.yaml` (AC-30): `clearState: true` → войти → Профиль → «Светлая» → `stopApp` → `launchApp` (без `clearState`) → убедиться, что экран светлый (по видимому маркеру — например, `assertVisible` на элементе, который есть только в светлой теме, либо `takeScreenshot` для ручного сравнения; выбрать при реализации то, что Maestro даёт стабильно).
- Локали (AC-35): прогон обоих потоков с `launchApp.launchArguments: { "-AppleLanguages": "(en)" }` / `"(ru)"`; `scripts/e2e.sh --locale` подставляет переменную окружения в поток. Если на практике iOS не подхватывает launch-аргументы у dev-client-сборки — fallback: смена языка симулятора вручную и повторный прогон (перенести AC-35 в ручной чек-лист, отметив это в `e2e/insights.md`).

**Предусловия (у владельца, не у implementer'а):** установленный Maestro (`curl -Ls "https://get.maestro.mobile.dev" | bash`), Xcode + запущенный iOS-симулятор, установленный dev-client-билд приложения.

**Критерии готовности:** `./scripts/e2e.sh skeleton-smoke` и `./scripts/e2e.sh theme-persistence` проходят зелёными на iOS-симуляторе в обеих локалях; поток не содержит ни одного `testId`-селектора.

---

### Шаг 12 — Синхронизация документации

**Зависит от:** Шаги 1–11.

**Владеет файлами:** `mobile/AGENTS.md` (секция Status), `e2e/AGENTS.md` (секция Status), `shared/AGENTS.md` (Status — уточнить «не трогалось в SPEC-01»), `specs/SPEC-01-app-skeleton.md` (только строка `Implementation Plan:` → `specs/plans/PLAN-01-app-skeleton.md`), корневой `AGENTS.md` (секция Commands — вписать реальные команды mobile/e2e).

**Критерии готовности:** ни одна строка Status больше не утверждает «Not scaffolded yet» про `mobile/` и `e2e/`; команды в корневом `AGENTS.md` исполняются как написано.

---

## 4. Definition of Done (вся фича)

**Автоматика (должно быть зелёным одной командой из корня):**
```bash
pnpm install
pnpm -r typecheck          # = tsc --noEmit в mobile
pnpm -r test               # = jest в mobile
cd mobile && npx expo config --type public   # конфиг валиден
./scripts/e2e.sh skeleton-smoke
./scripts/e2e.sh skeleton-smoke --locale en
./scripts/e2e.sh theme-persistence
```

**Ручной чек-лист владельца (iOS-симулятор + реальное устройство).** Отмечено, какой AC закрывает.

| # | Проверка | ACs |
|---|---|---|
| M1 | На iPhone с Dynamic Island ни текст, ни интерактив не перекрыты вырезом/индикатором home ни на одном из 12 экранов | AC-3 |
| M2 | Поворот устройства не меняет компоновку — только портрет | AC-4 |
| M3 | Руками, без отладки, обойдены все 12 экранов с холодного старта | AC-5 |
| M4 | Свайп от левого края возвращает назад на S7, S10, S11, S12 | AC-11 |
| M5 | «Выйти» → онбординг; жест «назад» не возвращает в табы | AC-13 |
| M6 | Свежая установка на устройстве со **светлой** системной темой → приложение тёмное | AC-14 |
| M7 | Смена темы в профиле применяется мгновенно на всех экранах | AC-15 |
| M8 | Manrope — везде; IBM Plex Mono — только коды, даты, номера билетов, места (S4, S7, S9) | AC-17, AC-38 |
| M9 | Холодный старт: нет кадра с системным шрифтом и последующего скачка верстки | AC-18 |
| M10 | VoiceOver / Accessibility Inspector: у каждого интерактива непустая подпись и корректная роль | AC-19 |
| M11 | Accessibility Inspector: область нажатия каждого интерактива ≥ 44×44 pt | AC-20 |
| M12 | Максимальный стандартный Dynamic Type: текст не режется посреди слова и не наезжает | AC-21, AC-39 |
| M13 | Обход всех экранов в тёмной и светлой теме: текст на стекле поверх обложки читаем (ориентир WCAG AA 4.5:1 для основного текста) | AC-22 |
| M14 | Сетевой инспектор при полном обходе пуст; приложение полностью работает в авиарежиме | AC-25 |
| M15 | Иконка на домашнем экране и splash отличимы от дефолтной заготовки Expo | AC-29 |
| M16 | Выбор «Системная» переживает перезапуск и следует теме устройства | AC-30 |
| M17 | Выбрана «Светлая», система тёмная, холодный старт → нет вспышки тёмной темы между splash и первым экраном | AC-32 |
| M18 | Осмотр контейнера приложения после полного обхода: в хранилище ровно один ключ темы, ничего больше | AC-33 |
| M19 | Обход всех экранов на устройстве с русским и с английским языком: ни одного непереведённого текста и ни одного видимого ключа | AC-34, AC-35 |
| M20 | Устройство на немецком → английский интерфейс и английский формат дат | AC-36 |
| M21 | Даты и относительные подписи выглядят по-русски в ru и по-английски в en (S4, S5, S7) | AC-37 |
| M22 | В профиле нет строки выбора языка | AC-40 |
| M23 | Edge cases: свайп вниз закрывает модалку; двойное быстрое нажатие не открывает два экрана; возврат из фона не сбрасывает навигацию; холодный старт ≤ 2 с на iPhone 12+ в release-сборке; прокрутка со стеклом поверх обложек без подвисаний **на реальном устройстве** | Non-functional, Edge cases |

---

## 4a. Трассируемость AC → проверка (обязательная таблица)

Автоматической проверки покрытия в репозитории нет — эта таблица и есть механизм контроля. Ни один AC не остаётся без строки.

| AC | Тип | Чем именно проверяется | Шаг |
|---|---|---|---|
| AC-1 | e2e + unit | `skeleton-smoke.yaml` (launch → заголовок онбординга); `navigation.test.tsx` (старт = `/onboarding`) | 9, 11 |
| AC-2 | unit + manual | `app-config.test.ts` (`name === APP_NAME`); тест S1 (отображаемое имя === `APP_NAME`) | 2, 6 |
| AC-3 | manual | M1 | — |
| AC-4 | unit + manual | `app-config.test.ts` (`orientation==='portrait'`, `supportsTablet:false`); M2 | 2 |
| AC-5 | e2e + manual | `skeleton-smoke.yaml` (все 12 экранов); M3 | 11 |
| AC-6 | e2e + unit | smoke; тест S1 (роутер вызван с `/sign-up` и `/sign-in`) | 6, 11 |
| AC-7 | e2e + unit | smoke; тесты S2/S3 (`replace('/trips')` без валидации) | 6, 11 |
| AC-8 | e2e + unit + manual | smoke (три подписи табов, активный); `navigation.test.tsx`; M3 | 9, 11 |
| AC-9 | e2e + unit + manual | smoke (отсутствие подписей табов на S7); `navigation.test.tsx` | 9, 11 |
| AC-10 | e2e | smoke: «История» → S7 → назад → видна «История» | 11 |
| AC-11 | manual | M4 | — |
| AC-12 | e2e + unit | smoke (Отмена на S8/S9); тесты `ModalHeader`/`BookingFormScreen` (`back()`) | 8, 11 |
| AC-13 | e2e + unit + manual | smoke («Выйти» → онбординг); `navigation.test.tsx`; M5 | 9, 11 |
| AC-14 | unit + manual | `preference.test.ts` (`resolveColorScheme` без выбора → dark); M6 | 3 |
| AC-15 | unit + manual | `ThemeProvider.test.tsx`, `ThemeSettingRow` тест; M7 | 3, 7 |
| AC-16 | unit + manual | `tokens.test.ts` (точные значения); guardrail «нет hex вне theme»; M13 | 3, 9 |
| AC-17 | unit + manual | тест `AppText` (роль mono → IBM Plex Mono); guardrail «нет имён шрифтов вне theme»; M8 | 5, 9 |
| AC-18 | manual + e2e | M9; smoke стабильно находит первый экран после launch | 11 |
| AC-19 | unit + e2e + manual | тесты примитивов (обязательная подпись + роль); smoke селектится только по подписям/тексту; M10 | 5, 11 |
| AC-20 | unit + manual | тесты примитивов (≥44pt); M11 | 5 |
| AC-21 | manual | M12 | — |
| AC-22 | manual | M13 | — |
| AC-23 | unit + manual | `routes.contract.test.ts` (множество маршрутов == карта спека) | 9 |
| AC-24 | unit + manual | guardrail «нет кириллицы вне locales»; типизация ресурсов i18next; M19 | 4, 9 |
| AC-25 | unit + manual | guardrail «нет supabase/fetch/axios»; M14 | 9 |
| AC-26 | unit | `pnpm --filter @tripplanner/mobile typecheck` + guardrail «нет `@ts-ignore`/`@ts-expect-error`» | 1, 9 |
| AC-27 | unit + manual | guardrail «`Platform.OS` только в `src/platform/**`» | 9 |
| AC-28 | e2e | `skeleton-smoke.yaml` — последовательность ровно из AC-28 | 11 |
| AC-29 | manual | M15 | 2 |
| AC-30 | e2e + manual | `theme-persistence.yaml` («Светлая» → перезапуск → светло); M16 («Системная») | 11 |
| AC-31 | unit | `preference.test.ts` (отсутствует / повреждено / чужое значение / ошибка чтения → dark) | 3 |
| AC-32 | manual | M17 | — |
| AC-33 | unit + manual | `ThemeProvider.test.tsx` (пишется один ключ и только после выбора), `settingsStorage.test.ts` (allow-list ключей), guardrail «AsyncStorage только в `src/lib/storage`»; M18 | 3, 9 |
| AC-34 | unit + manual | `parity.test.ts` (совпадение ключей, нет пустых, нет «ключ-как-значение»); M19 | 4 |
| AC-35 | e2e + manual | прогон обоих потоков с `-AppleLanguages` ru/en; M19 | 11 |
| AC-36 | unit + manual | `resolveLocale.test.ts` (`de-DE`, пустой список → en); M20 | 4 |
| AC-37 | unit + manual | `format.test.ts` (обе локали, плюрализация, граница суток); M21 | 4 |
| AC-38 | manual | M8 | — |
| AC-39 | manual | M12 (обе локали при максимальном Dynamic Type) | — |
| AC-40 | unit + manual | тест `ProfileScreen` (в наборе строк нет выбора языка); M22 | 7 |

---

## 4b. Чего делать НЕЛЬЗЯ (короткий стоп-лист для implementer'а)

1. Никакого Supabase: ни `supabase init`, ни `@supabase/supabase-js`, ни `lib/supabase`, ни миграций.
2. Никакой авторизации и сессий: ни `expo-secure-store`, ни LargeSecureStore, ни гейтинга маршрутов по сессии.
3. Никакого сетевого кода: ни `fetch`, ни TanStack Query, ни загрузки изображений по URL. Обложки — цветные плейсхолдеры.
4. Никаких уведомлений, Live Activities, Dynamic Island, Wallet, геолокации, камеры — и **ни одной** `NS*UsageDescription` в конфиге.
5. Никаких `Platform.OS` / `.ios.tsx` / `.android.tsx` вне `src/platform/**`.
6. Никакой логики в `app/**`: файл маршрута читает параметры и рендерит компонент фичи — и всё.
7. Никаких литеральных пользовательских строк в экранах и компонентах — только ключи i18n. Никаких hex-цветов и имён шрифтов вне `src/lib/theme/**`.
8. Никакой записи в хранилище, кроме одного ключа темы, и только после явного выбора пользователем.
9. Никаких `EXPO_PUBLIC_*`, `.env`, ключей и секретов — даже «на будущее».
10. Никакой правки `mobile/ios/**` и `mobile/android/**` руками (CNG) — только `app.config.ts`.
11. Никаких `@ts-ignore` / `@ts-expect-error` / `eslint-disable` (AC-26).
12. Никакого расширения продуктового скоупа: экран «Сейчас», переключатель языка, реальная валидация форм — это Follow-up спеки, не этот план.
13. Не менять имена маршрутов из карты спека — это контракт для всех следующих спеков.

---

## 5. Риски, допущения и вопросы к владельцу

**Допущения плана (если неверны — остановиться и спросить):**
- A-1. `shared/` в SPEC-01 не скаффолдится: в скелете нет ни одной общей доменной функции (принцип 6 спека прямо запрещает закреплять такую логику в `mobile/`, но и создавать пустой пакет незачем).
- A-2. `supabase/` не трогается вообще.
- A-3. Приёмка идёт на iOS-симуляторе и/или устройстве; Android не проверяется, но код кросс-платформенный.

**Риски:**

- **R-1 (ambiguity, не блокирует).** Edge case спека «повторное нажатие на активный таб возвращает стек таба к корню (с S7 назад на S4)» конфликтует с AC-9 («таб-бар скрыт на S7»): если таб-бара на S7 не видно, нажать по нему нельзя. План выбирает презентацию S7 поверх табов (чисто удовлетворяет AC-9 и AC-10) и трактует edge case как неприменимый в скелете. **Нужен кивок владельца при ревью плана.**
- **R-2 (технический).** Соседство `app/(tabs)/trips.tsx` (→ `/trips`) и каталога `app/trips/**` (→ `/trips/new`, `/trips/[tripId]`) — пути разные, конфликта быть не должно, но если expo-router выдаст предупреждение о конфликте маршрутов, **fallback**: превратить таб-файл в `app/(tabs)/trips/index.tsx`. URL и контракт при этом не меняются.
- **R-3 (технический).** Полнота `Intl` в Hermes для `ru` не проверялась. Поэтому относительные подписи («через 5 дней») сделаны на плюрализации i18next, а не на `Intl.RelativeTimeFormat`. Если и `Intl.DateTimeFormat('ru')` в Hermes окажется неполным — **fallback**: полифилы `@formatjs/intl-*` (чистый JS, нативной пересборки не требуют); зафиксировать в `mobile/insights.md`.
- **R-4 (технический).** Пакеты `@expo-google-fonts/*` могут поставлять latin-subset TTF без кириллицы. Проверить на первом же русском экране; **fallback** — положить полные TTF в `mobile/assets/fonts/` и грузить их напрямую через `expo-font`.
- **R-5 (процессный).** Временная иконка/splash (AC-29) требует растеризации SVG. План предлагает разовый `pnpm dlx sharp-cli`; если инструмент не отработает — владелец кладёт любой PNG 1024×1024, реализация не блокируется.
- **R-6 (технический).** `expo-blur` на Android даёт худшее качество/производительность; iOS-путь эталонный. Развилка изолирована в `src/platform/blur.android.ts` с деградацией в полупрозрачную заливку — Android-бэклог, не задача этого плана.
- **R-7 (инструментальный).** `renderRouter` из `expo-router/testing-library` доступен не во всех версиях — fallback описан в Шаге 9.
- **R-8 (инструментальный).** Typed routes генерируют типы в `.expo/types` при первом запуске Metro. Если `tsc --noEmit` падает на отсутствии этих типов в чистом клоне, реализация должна один раз выполнить `npx expo start --clear` (или добавить `expo-env.d.ts` в `include`) и зафиксировать это в `mobile/AGENTS.md`.
- **R-9 (инструментальный).** Задание локали симулятора из Maestro через `-AppleLanguages` — не гарантировано; fallback — ручная смена языка симулятора и перенос AC-35 в ручную часть (Шаг 11).
- **R-10 (предусловие).** Xcode, iOS-симулятор и Maestro должны быть установлены у владельца — план это не проверяет и не устанавливает.

**Открытых вопросов, блокирующих начало работы, нет.** К ревью — только R-1 (трактовка edge case с повторным нажатием таба) и выбор режима выполнения (§3.0).
