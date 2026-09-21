# Implementation Plan: Email-авторизация (SPEC-02)

**Spec:** `specs/SPEC-02-email-auth.md` (Status: draft, 2026-09-21) — источник истины для WHAT.
Этот документ — только HOW: файлы, модули, порядок, команды, критерии.
**Status:** planning
**Scope:** `shared/` (создаётся), `supabase/` (init + `config.toml` + шаблон письма), `mobile/`,
`e2e/`, `scripts/`, `docs/release/`, статусные строки `*/AGENTS.md`.
**Platforms:** ios+android (весь код кросс-платформенный; приёмка — на iOS). iOS-only поведений нет
и появляться не должно; `expo-secure-store` и `expo-crypto` кросс-платформенны, `src/platform/` этим
спеком не пополняется.
**Execution mode:** по умолчанию **single-agent, строго по порядку**. Тир 1 (шаги 2–5) файл-непересекающийся
и может быть роздан параллельно — решение владельца, см. §3.0.
**Вопросы владельцу Q-A, Q-B, Q-C закрыты 2026-09-21** (см. §5): все три — варианты по умолчанию плана.
**Решения `[NEEDS CLARIFICATION]` C1–C7 спека приняты по умолчанию**, как написано в спеке
(один английский шаблон письма, без проверки утечек, `otp_expiry = 600`, без клиентского счётчика
попыток, свежий email на каждый e2e-прогон, поднятый локальный лимит писем).

---

## 0. Что уже существует (проверено чтением репозитория 2026-09-21)

| Артефакт | Фактическое состояние | Вывод для плана |
|---|---|---|
| `pnpm-workspace.yaml` | `packages: mobile, shared, e2e`; `allowBuilds`, `minimumReleaseAgeExclude` | Менять не нужно: `shared` уже объявлен пакетом, хотя манифеста ещё нет |
| `shared/` | Только `AGENTS.md`, `CLAUDE.md`, `insights.md`. **Ни `package.json`, ни `src/`** | Шаг 1 создаёт манифест **внутрь** папки, не затирая эти файлы |
| `supabase/` | Только `AGENTS.md`, `CLAUDE.md`, `insights.md`. Папок `migrations/`, `functions/`, `tests/` на диске **нет** (в PLAN-01 §0 они упомянуты — расхождение, см. §5 N-4) | Шаг 3 делает `supabase init` в существующую папку |
| Supabase CLI | **Не установлен** (`supabase: command not found`). Docker есть (Rancher Desktop) | Предусловие владельца, см. §5 R-1 |
| `mobile/` | Скелет SPEC-01 целиком: 17 маршрутов, 12 экранов, тема, i18n ru/en, 5 тест-файлов в `__tests__/`, `plugins/withIosSceneLifecycle.js`, `app.privacy.ts`, `mobile/ios/` (CNG, сгенерирован) | Правится точечно, см. §1 |
| `mobile/package.json` | Нет `@supabase/supabase-js`, `expo-secure-store`, `expo-crypto`, `zod`, `@tripplanner/shared` | Все зависимости ставятся на Шаге 1 |
| `mobile/__tests__/guardrails.test.ts` | Правило `no-backend-or-network` (`/supabase|\bfetch\s*\(|XMLHttpRequest|\baxios\b/i`) действует на **весь** `app/` + `src/`; `ALLOWED_SETTING_KEYS` пинится к длине 1 и ровно одному `setItem` | Переписывается **в том же шаге**, что вводит клиент и сессию (Шаг 6), иначе `pnpm test` красный |
| `mobile/__tests__/navigation.test.tsx` | `enterTabs()` жмёт `sign-in-submit` и ждёт `/trips` — поведение SPEC-01 AC-7 | Переписывается на Шаге 7 (гейтинг), до появления настоящих форм |
| `mobile/__tests__/routes.contract.test.ts` | `SPEC_ROUTES` — жёсткий список 15 маршрутов, `/reset-password` в нём нет; `MAX_ROUTE_LINES = 40` | Дополняется на Шаге 8 вместе с файлом маршрута |
| `mobile/src/lib/storage/settingsStorage.ts` | Единственная граница AsyncStorage, `ALLOWED_SETTING_KEYS = [THEME_STORAGE_KEY]` | Шаг 6 вводит реестр ключей и второй модуль-писатель в этой же папке |
| `mobile/src/components/PlaceholderField.tsx` | `editable={false}`, `autoComplete="off"` — неинтерактивная заглушка | **Не удаляется**: её используют S8/S9. Настоящий ввод — новый `TextField` (Шаг 4) |
| `mobile/src/components/PrimaryButton.tsx` / `SecondaryButton.tsx` | Заблокированное состояние = `opacity: 0.4` поверх активного стиля | Нарушение `design/tokens.md` «Состояния» → AC-42, Шаг 4 |
| `mobile/src/features/auth/*` | `SignInScreen`, `SignUpScreen`, `ForgotPasswordScreen` на `PlaceholderField`; `router.replace("/trips")` без проверок; `SocialAuthButtons`/`OrDivider`/`ConsentText`/`AuthFooterLink`; тесты в `__tests__/auth.test.tsx` | Экраны переписываются (Шаг 8), Apple/Google/разделитель — **без единого изменения** (AC-49) |
| «Забыли пароль?» | `<AppText color="accent">` в `SignInScreen.tsx` | AC-41: → `textSecondary`, Шаг 8 |
| `mobile/src/mocks/user.ts` | `MOCK_USER = { name, email, connectedAccount, currency }` | Шаг 9: уходят `name` и `email`, остаются `connectedAccount`/`currency` |
| Потребители `MOCK_USER` | `ProfileScreen.tsx` (имя, email, + две заглушки), `TripsScreen.tsx:22`, `HistoryScreen.tsx:21` (инициал аватара) | Ровно три экрана AC-27 |
| `mobile/src/lib/theme` | `tokens.danger` (`#D96B5A` / `#C0503C`), `textTertiary`, `divider`, `radius.field`, `layout.minTouch=44` — всё есть, ни один экран `danger` не использует | **Новых токенов не требуется** (подтверждено чтением `tokens.ts` и `design/tokens.md`) |
| `mobile/src/lib/i18n/locales/{ru,en}/auth.ts` | Плейсхолдеры `name@example.com`, `Анна Иванова`, текст «отправим ссылку»; подзаголовков S2/S3 нет | Шаг 8 приводит к дизайну (Q16), см. §5 Q-B |
| `mobile/jest.setup.ts` | Моки async-storage, expo-localization, expo-blur, expo-font, expo-splash-screen, expo-system-ui | Шаг 1 добавляет `expo-secure-store`, `expo-crypto` |
| `mobile/src/test-utils/renderWithProviders.tsx` | Async-обёртка Theme + i18n + SafeArea | Шаг 7 добавляет сессию-провайдер и опцию `session` |
| `e2e/flows/skeleton-smoke.yaml` | Жмёт `${SIGNUP_SUBMIT}` и сразу ждёт табы | Падает после Шага 8 → обновляется на Шаге 10 |
| `scripts/e2e.sh` | Таблица строк локалей, вручную зеркалит `locales/*` | Шаг 10 дополняет таблицу |
| `docs/release/privacy-manifest-audit.md`, `mobile/app.privacy.ts` | Аудит SDK 57 от 2026-09-19 (FileTimestamp, UserDefaults, SystemBootTime, DiskSpace) | Шаг 5 повторяет процедуру для новых нативных модулей |
| Корневой `.gitignore` | `.env`, `.env.*`, `!.env.example` уже есть | Достаточно; `.env` в `mobile/` не попадёт в git |
| `TESTING.md` | mobile = jest-expo + RNTL, shared = vitest, supabase = pgTAP, e2e = Maestro | Раннеры зафиксированы; pgTAP в этом спеке не запускается (таблиц нет) |

---

## 1. Разбивка по модулям

Порядок раздела — от контрактов к клиенту: `shared/` → `supabase/` → `mobile/` → `e2e/`.

### 1.1 `shared/` — пакет `@tripplanner/shared` (создаётся впервые, минимально)

Только схемы форм аутентификации. Никакого `supabase-js`, `react-native`, Node/DOM API —
пакет обязан работать в Hermes, браузере, Deno и Node (`shared/AGENTS.md`).

| Файл | Назначение |
|---|---|
| `shared/package.json` | `@tripplanner/shared`, `private: true`, **экспорт TS-исходника** (`"main"`/`"types"`/`"exports"` → `./src/index.ts`) — сборочного шага нет: Metro транспилирует исходник, Deno читает TS напрямую. Зависимость: `zod`. Dev: `vitest`, `typescript`. Скрипты: `typecheck: tsc --noEmit`, `test: vitest run` |
| `shared/tsconfig.json` | `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `lib: ["ES2022"]` (без `DOM`), `types: []` — TypeScript 6 не подтягивает `@types/*` автоматически (`mobile/insights.md`, 2026-09-19) |
| `shared/vitest.config.ts` | Минимальный, `environment: "node"` |
| `shared/src/auth/errorCodes.ts` | `AUTH_FIELD_ERROR` — стабильные идентификаторы ошибок полей (`"email.invalid"`, `"password.tooShort"`, `"name.empty"`, `"name.tooLong"`, `"code.length"`, `"code.digits"`). **Идентификаторы, не тексты** (контракт §«Контракты между модулями» п.1): текст подставляет клиент из своих локализованных строк |
| `shared/src/auth/schemas.ts` | `emailSchema` (`z.string().trim().toLowerCase()` → `.email()` через `pipe`, порядок важен: нормализация **до** проверки, AC-17), `passwordSchema` (`z.string().min(8)` — **без** `trim`: пробел по краям пароля значим, Edge case), `displayNameSchema` (`trim`, непустое, ≤ 64), `otpCodeSchema` (`/^\d{6}$/`). Композиты: `signInSchema`, `signUpSchema`, `passwordResetRequestSchema`, `newPasswordSchema` |
| `shared/src/auth/parse.ts` | `parseAuthForm(schema, input): { ok: true, value } \| { ok: false, fieldErrors: Record<field, errorId> }` — обёртка над `safeParse` + `flatten()`; **никогда** не бросает (`parse-use-safeparse`, `error-use-flatten`) |
| `shared/src/auth/index.ts`, `shared/src/index.ts` | Публичная поверхность: схемы, типы (`z.infer` — `type-use-z-infer`), идентификаторы ошибок, `parseAuthForm` |
| `shared/src/auth/__tests__/schemas.test.ts` | vitest, см. критерии Шага 2 |

Правила из скилла `zod`, обязательные здесь: `safeParse` для пользовательского ввода, кастомные
`message` = идентификатор ошибки (не текст), `z.infer` вместо ручных типов, экспорт схемы **и** типа,
нормализация через `transform`/`pipe`, а не в экране.

### 1.2 `supabase/` — проект CLI (не pnpm-пакет)

| Файл | Назначение |
|---|---|
| `supabase/config.toml` | Единственный версионируемый контракт поведения сервера (AC-48). Явно: `[auth] site_url`, `enable_signup = true`, `minimum_password_length = 8`; `[auth.email] enable_signup = true`, `enable_confirmations = false`, `otp_length = 6`, `otp_expiry = 600` (AC-52), `max_frequency = "60s"`; `[auth.rate_limit]` — `email_sent`, `token_verifications`, `sign_in_sign_ups`, `token_refresh`; `[auth.email.template.recovery]` с `subject` и `content_path` |
| `supabase/templates/recovery.html` | Письмо восстановления, **обязательно содержит `{{ .Token }}`** (AC-51) и срок действия. Один английский шаблон (решение C1). Стандартный шаблон Supabase содержит только ссылку — без этого файла поток Q3 не работает вообще |
| `supabase/.gitignore` | То, что создаёт `supabase init` (`.branches`, `.temp`) |
| `supabase/README.md` | Как поднять локальный стенд: `supabase start`, где смотреть почту (порт `54324`; Inbucket/Mailpit — проверить по факту версии CLI), откуда взять `EXPO_PUBLIC_*` для `mobile/.env` |

Миграций, таблиц, RLS, pgTAP и Edge Functions этот план **не создаёт** (Non-goal спека).
`supabase test db` здесь не запускается: политик нет — тестировать нечего.
Хостинговый проект не трогается: ни `db push`, ни `db reset`, ни правок в дашборде.

### 1.3 `mobile/src/lib/` — сквозная инфраструктура (три новые границы)

```
src/lib/supabase/
  config.ts        readSupabaseConfig(env): { url, anonKey } | бросает ConfigError с понятным текстом (AC-47).
                   Читает ТОЛЬКО EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY (AC-46).
                   Чистая функция от объекта env → тестируется без нативных модулей.
  client.ts        ЕДИНСТВЕННЫЙ файл, импортирующий @supabase/supabase-js (AC-8).
                   createClient(url, anonKey, { auth: { storage: sessionSecureStorage,
                   autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
                   global: { fetch: fetchWithTimeout(15_000) } })  (Non-functional: тайм-аут 15 с).
  index.ts         экспортирует `supabase` и типы; НЕ экспортирует createClient наружу.

src/lib/storage/    (существующая граница AsyncStorage, расширяется)
  keys.ts          STORAGE_KEYS — реестр ВСЕХ ключей AsyncStorage с назначением и признаком
                   "секретный/нет": тема (SPEC-01), шифротекст сессии, флаг первого запуска.
                   Единственный источник для guardrail-теста.
  settingsStorage.ts   без изменений по смыслу; ALLOWED_SETTING_KEYS берёт из keys.ts
  sessionSecureStorage.ts  LargeSecureStore: реализация интерфейса хранилища supabase-js
                   (getItem/setItem/removeItem). AES-ключ — в expo-secure-store
                   (keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY), шифротекст — в AsyncStorage
                   (AC-7). Любая ошибка расшифровки = «значения нет» + очистка остатков (AC-3).
  freshInstall.ts  ensureFreshInstallCleared(): нет флага первого запуска в AsyncStorage →
                   удалить ключ SecureStore и блоб сессии (Keychain переживает переустановку,
                   `mobile/insights.md` 2026-09-18) (AC-6).
  index.ts

src/lib/session/    (новая сквозная инфраструктура, по образцу lib/theme)
  SessionProvider.tsx  состояние { status: "restoring" | "signedIn" | "signedOut", user }.
                   На монтировании: ensureFreshInstallCleared() → supabase.auth.getSession() →
                   подписка onAuthStateChange (AC-4, AC-24); AppState active/background →
                   startAutoRefresh/stopAutoRefresh (AC-5). Никаких сетевых вызовов на пути
                   восстановления (AC-9).
  useSession.ts    хук-потребитель
  displayName.ts   ЧИСТЫЕ функции: displayNameOf(user) (display_name → часть email до "@", AC-26),
                   initialOf(name) (первый графемный кластер, эмодзи допустим) — ОДИН источник
                   для профиля и шапок S4/S5 (AC-27)
  index.ts
```

`src/lib/session/` лежит в `lib/`, а не в `features/auth/`, сознательно: его потребители — корневой
layout и три экрана трёх разных фич; `lib/` не импортирует `features/` (правило 2 `mobile-architecture`),
а `features/auth/api/` остаётся единственной точкой вызова операций аутентификации.

### 1.4 `mobile/src/features/auth/` — фича аутентификации

```
api/authApi.ts     signUp / signIn / requestPasswordReset / verifyRecoveryCodeAndSetPassword / signOut.
                   Каждая возвращает { ok: true, … } | { ok: false, kind: AuthErrorKind } —
                   сырые ошибки бэкенда наружу не проходят (AC-37). Ни одна не логирует тело запроса
                   (AC-39): в лог уходит только имя операции и код ошибки.
                   signUp кладёт имя в options.data.display_name (AC-11).
                   signOut: серверная ошибка не мешает локальной очистке (AC-23).
api/errors.ts      AuthErrorKind = "invalidCredentials" | "emailExists" | "weakPassword" |
                   "otpInvalidOrExpired" | "samePassword" | "rateLimited" | "offline" | "unknown";
                   mapAuthError(unknown): AuthErrorKind — по code/status (AC-16, AC-18, AC-31,
                   AC-32, AC-34, AC-37)
api/index.ts
flowState.ts       Память шага сброса пароля и преднабора email: email между S10 и S10b и между
                   S3 и S2 передаётся модульным состоянием потока, НЕ параметром маршрута (AC-39).
                   Пароль и код в этом состоянии не живут никогда; уход с S10b очищает форму.
hooks/useAuthSubmit.ts  общая механика отправки формы: единственный запрос при двойном нажатии,
                   isSubmitting, сохранение введённого при ошибке, повтор одним нажатием (AC-14, AC-19)
hooks/useResendCountdown.ts  60-секундный отсчёт повторной отправки (AC-33)
SignInScreen.tsx        S2 — переписывается
SignUpScreen.tsx        S3 — переписывается
ForgotPasswordScreen.tsx S10 — переписывается
ResetPasswordScreen.tsx  S10b — новый
components/AuthFormError.tsx  строка общей ошибки над кнопкой (AC-36)
components/{SocialAuthButtons,OrDivider,AuthFooterLink,ConsentText}.tsx  — НЕ ТРОГАТЬ (AC-49)
index.ts           публичная поверхность фичи (4 экрана)
```

### 1.5 `mobile/src/components/` — примитивы

| Файл | Изменение |
|---|---|
| `TextField.tsx` (новый) | Настоящее поле: `label`, `value`, `onChangeText`, `errorText`, `keyboardType`, `textContentType`/`autoComplete`, `secureTextEntry`, `returnKeyType`, `onSubmitEditing`, проброс `ref` для перехода к следующему полю, `autoCapitalize="none"`/`autoCorrect={false}` для email и пароля, видимые состояния фокуса (граница `accent`) и ошибки (граница `danger`) (AC-38). Ошибка попадает в доступное описание поля и объявляется при появлении (AC-40). Не моноширинный — даже поле кода (`design/README.md`) |
| `PrimaryButton.tsx` | Заблокированное состояние: фон `divider`, текст `textTertiary` вместо `opacity` (AC-42). Новый проп `loading`: `ActivityIndicator` **внутри** кнопки, `disabled` на время запроса, без модального спиннера (AC-14) |
| `SecondaryButton.tsx` | Та же правка disabled-стиля (то же правило `design/tokens.md` «Состояния») |
| `PlaceholderField.tsx` | Без изменений (её используют S8/S9) |
| `index.ts` | Экспорт `TextField` |

### 1.6 `mobile/app/` — маршруты

| Файл | Изменение |
|---|---|
| `app/_layout.tsx` | Провайдер сессии в дерево; сплэш удерживается, пока `status === "restoring"` (в дополнение к шрифтам и теме) и ни один экран не рендерится (AC-2); гейтинг групп (AC-20, AC-21) |
| `app/index.tsx` | `<Redirect>` на `/trips` при сессии и на `/onboarding` без неё (AC-1) |
| `app/reset-password.tsx` | Новый тонкий маршрут S10b, push, **без параметров** (AC-39) |

Гейтинг делается **в layout'е**, а не в экранах (`expo-react-native`: «Auth gating in a layout»):
`Stack.Protected guard={…}` вокруг объявлений `Stack.Screen` — группа табов и `trips/*` под
`guard={isSignedIn}`, группа онбординга/аутентификации под `guard={!isSignedIn}`, `legal/*` вне обеих
(AC-21). Структура файлов и URL при этом **не меняются** — новых route-групп не вводится, контракт
маршрутов SPEC-01 сохраняется. Если `Stack.Protected` в установленной версии expo-router недоступен —
fallback в §5 R-3.

### 1.7 `e2e/`

`e2e/flows/auth-email.yaml` — новый поток: регистрация свежим адресом (уникальность за счёт метки
времени, решение C5) → табы → выход → вход тем же адресом → табы.
`e2e/flows/skeleton-smoke.yaml` — обновляется: там, где он жал «Зарегистрироваться» и ждал табы,
теперь вводятся учётные данные. `scripts/e2e.sh` — новые строки-селекторы в таблице локалей.

---

## 2. Изменения зависимостей

Все установки — **одним шагом (Шаг 1)**: тогда `pnpm-lock.yaml`, `mobile/package.json` и
`shared/package.json` принадлежат ровно одному шагу, и списки файлов остальных шагов не пересекаются.

| Пакет | Куда | Зачем | Нативный? |
|---|---|---|---|
| `zod` | `shared` | схемы форм | нет |
| `vitest`, `typescript` | `shared` (dev) | раннер и типы (`TESTING.md`) | нет |
| `@tripplanner/shared` (`workspace:*`) | `mobile` | схемы форм | нет |
| `@supabase/supabase-js` | `mobile` | клиент Auth | нет (чистый JS) |
| `expo-secure-store` | `mobile` | AES-ключ сессии (Keychain) | **да → пересборка dev-клиента** |
| `expo-crypto` | `mobile` | криптостойкие случайные байты для AES-ключа | **да → пересборка dev-клиента** |
| `aes-js` + `@types/aes-js` (dev) | `mobile` | AES-256-CTR для LargeSecureStore (шаблон Supabase для Expo) | нет |

**Команды (версии пинит Expo SDK, руками не указываем):**
```bash
cd mobile
npx expo install expo-secure-store expo-crypto
pnpm add @supabase/supabase-js aes-js @tripplanner/shared@workspace:*
pnpm add -D @types/aes-js
npx expo install --check
```
`react-native-url-polyfill` из старых рецептов Supabase **не добавляем заранее** — сначала проверить,
нужен ли он на RN 0.86 (см. §5 R-4).

**Чего НЕ добавляем:** `@tanstack/react-query` (в этом спеке нет ни одного серверного запроса данных —
только операции аутентификации), `expo-sqlite`, `expo-auth-session`, `expo-apple-authentication`,
`react-native-mmkv`, любые аналитика/крэш-репортинг.

**Связка `shared` ↔ `mobile` (три места, все на Шаге 1):**
1. `shared/package.json` экспортирует TS-исходник (`"exports": { ".": "./src/index.ts" }`) — сборки нет;
2. `mobile/jest.config.js`: `moduleNameMapper` `"^@tripplanner/shared$": "<rootDir>/../shared/src/index.ts"`
   (jest не транспилирует `node_modules`, а pnpm-симлинк ведёт именно туда);
3. `mobile/tsconfig.json`: добавить `paths` для `@tripplanner/shared` **только если** `tsc` не разрешает
   пакет сам. Metro workspace-симлинк и TS-исходник разбирает без настройки — проверить, не угадывать.

**Dev-client rebuild:** ровно один раз после Шага 1 (`cd mobile && npx expo run:ios`) — добавлены два
нативных модуля. `mobile/ios/` генерируется CNG и руками не правится; плагин
`plugins/withIosSceneLifecycle` остаётся на месте (iOS 27, `mobile/insights.md`).

**Privacy manifest (Шаг 5):** `expo-secure-store` и `expo-crypto` — прямые нативные зависимости,
затрагивающие хранилище/устройство, значит `mobile/AGENTS.md` требует свериться с их
`PrivacyInfo.xcprivacy` и продублировать причины в `ios.privacyManifests`. Процедура — из
`docs/release/privacy-manifest-audit.md` (обход `node_modules/.pnpm` по реальным путям, список
слинкованных подов через `npx expo-modules-autolinking resolve --platform apple --json`).
Дополнительно: приложение **начинает собирать данные пользователя** (email + имя, связанные с личностью) —
это фиксируется в документе аудита как вход в декларацию App Store Connect (спек релиза).

**Разрешения:** ни одного нового `NS*UsageDescription`. Появление любого запроса разрешения —
отклонение от спека, остановиться и спросить.

**Секреты и окружение:**
- `mobile/.env.example` — `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` и **ничего больше**.
- Локальный `.env` создаёт разработчик из вывода `supabase start`; корневой `.gitignore` его уже
  игнорирует (`.env`, `.env.*`, `!.env.example`) — проверено.
- `service_role` в `mobile/` отсутствует физически (AC-46, статическая проверка на Шаге 6).

---

## 3. Порядок выполнения

### 3.0 Режим выполнения и правило непересечения

11 шагов, 5 тиров. Списки файлов шагов **не пересекаются** ни в одном месте — это условие и для
параллельной раздачи, и для однозначности одиночного прохода.

| Тир | Шаги | Зависимости |
|---|---|---|
| 0 | 1 | — |
| 1 | 2, 3, 4, 5 (независимы друг от друга) | 1 |
| 2 | 6 | 1, 2 |
| 3 | 7 → 8 → 9 (**строго последовательно**) | 6 |
| 4 | 10, 11 | 8, 9 |

**Единственное осознанное исключение из непересечения:** Шаг 1 создаёт `shared/src/index.ts` как
bootstrap-заглушку (без неё `pnpm --filter @tripplanner/shared typecheck/test` нечего проверять).
Шаг 2 — единственный, кому разрешено этот файл переписать целиком.

**Почему 7 → 8 → 9 нельзя распараллелить** (это и есть главный риск порядка):
- `__tests__/navigation.test.tsx` ломается дважды: гейтингом (Шаг 7) и настоящими формами (Шаг 8).
  Файл принадлежит Шагу 7, который переписывает его так, что сессия задаётся моком, а не нажатием
  «Войти» — после этого Шаг 8 его уже не ломает.
- Шаг 9 (профиль и шапки) читает `useSession`/`displayNameOf`, появляющиеся на Шаге 7.

**Второй риск порядка:** guardrail-правило `no-backend-or-network` падает на первом же упоминании
слова `supabase` и на любом `fetch(`. Поэтому `mobile/__tests__/guardrails.test.ts` принадлежит
**Шагу 6** — тому самому, который вводит клиент, хранилище сессии и `api/`-модуль. Разносить их
по разным шагам нельзя ни при каком режиме выполнения: CI станет красным между шагами.

---

### Шаг 1 — Workspace, зависимости, тестовая обвязка

**Зависит от:** ничего. **Блокирует:** всё.

**Владеет файлами:** `shared/package.json`, `shared/tsconfig.json`, `shared/vitest.config.ts`,
`shared/src/index.ts` (bootstrap-заглушка), `mobile/package.json`, `mobile/tsconfig.json`,
`mobile/jest.config.js`, `mobile/jest.setup.ts`, `mobile/.env.example`, `pnpm-lock.yaml`.

**Что делать:**
1. Создать манифест `shared/` **внутрь существующей папки** (`AGENTS.md`, `CLAUDE.md`, `insights.md`
   не трогать), bootstrap `shared/src/index.ts` с временным экспортом-константой.
2. Установить зависимости по §2 (нативные — только `npx expo install`).
3. `mobile/jest.config.js`: `moduleNameMapper` для `@tripplanner/shared`
   (`transformIgnorePatterns` уже содержит `\\.pnpm` — проверить, что `@supabase/supabase-js`
   не требует транспиляции; если требует — добавить в тот же список).
4. `mobile/jest.setup.ts`: моки `expo-secure-store` (in-memory map `getItemAsync`/`setItemAsync`/
   `deleteItemAsync`) и `expo-crypto` (`getRandomBytes` → детерминированный массив, тесты не должны
   зависеть от случайности).
5. `mobile/.env.example` — две публичные переменные, ни одного секрета.
6. Один раз собрать dev-клиент: `cd mobile && npx expo run:ios`.

**НЕ делать:** не писать код схем (Шаг 2), не создавать `supabase/config.toml` (Шаг 3),
не трогать `mobile/ios/**`.

**Критерии готовности:**
- `pnpm install` в корне проходит; `pnpm -r list --depth -1` показывает `@tripplanner/shared`.
- `pnpm -r typecheck` и `pnpm -r test` зелёные (в `shared` допустим 0 тестов).
- `mobile`: пробный файл, импортирующий `@tripplanner/shared`, резолвится и в `tsc`, и в jest
  (проверить временным тестом, затем удалить).
- `npx expo run:ios` ставит пересобранный dev-клиент, приложение запускается.
- `git status`: `shared/AGENTS.md`, `shared/CLAUDE.md`, `shared/insights.md` не изменены.

---

### Шаг 2 — `shared/`: схемы форм аутентификации *(Тир 1)*

**Зависит от:** Шаг 1. Единственный, кому разрешено переписать `shared/src/index.ts`.

**Владеет файлами:** `shared/src/index.ts`, `shared/src/auth/{errorCodes.ts,schemas.ts,parse.ts,index.ts}`,
`shared/src/auth/__tests__/schemas.test.ts`.

**Что делать:** §1.1. Схема **одновременно** нормализует и проверяет; результат разбора даёт для
каждого невалидного поля стабильный идентификатор, а не готовый текст.

**Критерии готовности (`pnpm --filter @tripplanner/shared test` + `typecheck`):**
- email: `" Anna@Example.COM "` → `anna@example.com`; `"не email"`, `""`, `"a@"` → `email.invalid`.
- пароль: 7 символов → `password.tooShort`, 8 → ок; `"  12345678  "` (12 символов с пробелами) → **ок**
  и значение **не обрезано** (пробел — допустимый символ).
- имя: `"   "` → `name.empty`; 64 символа → ок, 65 → `name.tooLong`; имя с эмодзи проходит.
- код: `"12345"`/`"1234567"` → `code.length`; `"12345a"` → `code.digits`; `"123456"` → ок.
- `parseAuthForm` возвращает ошибки **всех** невалидных полей сразу, а не только первого,
  и никогда не бросает.
- Идентификаторы ошибок зафиксированы литеральным списком в тесте (их читает клиент — это контракт).
- В `shared/src/**` нет ни одного импорта `react-native`, `supabase`, `node:*`.

---

### Шаг 3 — `supabase/`: init, `config.toml`, шаблон письма *(Тир 1)*

**Зависит от:** Шаг 1 (фактически ни от чего). **Предусловие владельца:** установленный Supabase CLI
и работающий Docker (§5 R-1).

**Владеет файлами:** `supabase/config.toml`, `supabase/templates/recovery.html`, `supabase/.gitignore`,
`supabase/README.md`.

**Что делать:**
1. `supabase init` в корне репозитория (папка `supabase/` уже существует — её `*.md` не затирать).
2. Привести `[auth]`-секции к §1.2. **Имена и умолчания ключей проверить по установленной версии CLI**
   (`supabase --version`, шаблон `config.toml` самой CLI): документация и шаблон расходятся, например
   по `max_frequency` (предупреждение спека, раздел Inputs). Каждое значение спека задать **явно**,
   даже если совпадает с умолчанием (AC-48).
3. `[auth.rate_limit].email_sent` поднять до удобного для разработки значения и **пометить комментарием**,
   что продакшен-значение выбирается в спеке релиза вместе с настоящим SMTP (решение C7).
4. `supabase/templates/recovery.html` — минимальное письмо с `{{ .Token }}` и сроком действия;
   подключить через `content_path` в `[auth.email.template.recovery]`.
5. `supabase/README.md` — как поднять стенд и откуда взять значения для `mobile/.env`.

**НЕ делать:** ни одной миграции, таблицы, RLS-политики, Edge Function; ни одного действия против
хостингового проекта (`db push`, `db reset`, дашборд).

**Критерии готовности:**
- `supabase start` поднимается локально; `supabase status` печатает URL и anon-ключ.
- `grep -q '{{ .Token }}' supabase/templates/recovery.html` — успех (AC-51).
- В `config.toml`: `otp_expiry` ≤ 600 и `otp_length = 6` и `minimum_password_length = 8`
  и `enable_confirmations = false` и `max_frequency = "60s"` — проверяется чтением файла (AC-48, AC-52).
- Ручной прогон против стенда: регистрация свежим email даёт сессию сразу; запрос сброса пароля
  кладёт в локальный почтовый ящик (порт `54324`) письмо **с шестизначным кодом** (AC-51).
- В `supabase/migrations/` пусто.

---

### Шаг 4 — Примитивы ввода и состояний кнопки *(Тир 1)*

**Зависит от:** Шаг 1. Тема и токены уже есть — новых токенов не требуется.

**Владеет файлами:** `mobile/src/components/TextField.tsx`, `mobile/src/components/PrimaryButton.tsx`,
`mobile/src/components/SecondaryButton.tsx`, `mobile/src/components/index.ts`,
`mobile/src/components/__tests__/TextField.test.tsx`,
`mobile/src/components/__tests__/buttonStates.test.tsx`.

**Что делать:** §1.5. Ни одной строки интерфейса внутри примитивов — только пропсы (guardrail
«нет кириллицы вне locales»). Клавиатурная безопасность уже обеспечена `Screen`
(`automaticallyAdjustKeyboardInsets`, `mobile/insights.md` 2026-09-19) — **не** вводить
`KeyboardAvoidingView` и тем более `Platform.OS`.

**Критерии готовности:**
- `TextField`: `editable` по умолчанию `true`; email-вариант отдаёт `keyboardType="email-address"`,
  `autoCapitalize="none"`, `autoCorrect={false}`, `textContentType="emailAddress"`; парольный —
  `secureTextEntry` + `textContentType="password"`/`"newPassword"`; код — `keyboardType="number-pad"` +
  `textContentType="oneTimeCode"`; `returnKeyType`/`onSubmitEditing` прокидываются (AC-38).
- `errorText` попадает в доступное описание поля (RNTL: находится через `getByLabelText`
  по составной подписи) и рисуется цветом `danger` (AC-36, AC-40).
- Значение, поставленное программно (автозаполнение из Keychain), вызывает тот же `onChangeText`-путь,
  что и ручной ввод (Edge case «автозаполнение»).
- Заблокированная кнопка: фон `tokens.divider`, текст `tokens.textTertiary`, **без** `opacity`;
  проверяется в обеих темах (`renderWithProviders({ themePreference })`) (AC-42).
- `loading`: индикатор внутри кнопки, `accessibilityState.disabled === true`, `onPress` не вызывается (AC-14).
- Высота/ширина ≥ 44 pt сохраняется (существующие тесты примитивов не краснеют).

---

### Шаг 5 — Privacy manifest и декларация сбора данных *(Тир 1)*

**Зависит от:** Шаг 1 (зависимости установлены).

**Владеет файлами:** `mobile/app.privacy.ts`, `docs/release/privacy-manifest-audit.md`.

**Что делать:** повторить процедуру аудита (`mobile-release` + `mobile/insights.md` 2026-09-19) для
новых нативных зависимостей `expo-secure-store` и `expo-crypto`: обход `node_modules/.pnpm` по реальным
путям с дедупликацией по `pkg@version` + хеш содержимого, список слинкованных подов через
`npx expo-modules-autolinking resolve --platform apple --json`. Найденные `NSPrivacyAccessedAPITypes`
и коды причин **скопировать фактические**, не предполагаемые. Зависимость, трогающая required-reason
API без собственного манифеста, — стоп-сигнал: зафиксировать и сообщить владельцу.
В документе аудита отдельной строкой зафиксировать: **с этого спека приложение собирает email и имя,
связанные с личностью (назначение — аутентификация)** → декларация сбора данных в App Store Connect
перестаёт быть пустой (обязанность спека релиза).

**Критерии готовности:**
- `npx expo config --type public` печатает `ios.privacyManifests`, включающий все фактически найденные
  категории и причины; `ios.infoPlist` по-прежнему без единой `NS*UsageDescription`.
- В `docs/release/privacy-manifest-audit.md` — новая датированная запись с версиями `expo-secure-store`,
  `expo-crypto`, `aes-js` и пометкой про сбор email/имени.

---

### Шаг 6 — Граница бэкенда: клиент, хранилище сессии, `api/`-модуль, переписанные guardrails *(Тир 2)*

**Зависит от:** Шаги 1, 2. **Ломает без обновления в том же шаге:** `__tests__/guardrails.test.ts`.

**Владеет файлами:**
`mobile/src/lib/supabase/{config.ts,client.ts,index.ts}`,
`mobile/src/lib/supabase/__tests__/config.test.ts`,
`mobile/src/lib/storage/{keys.ts,settingsStorage.ts,sessionSecureStorage.ts,freshInstall.ts,index.ts}`,
`mobile/src/lib/storage/__tests__/{settingsStorage.test.ts,sessionSecureStorage.test.ts,freshInstall.test.ts}`,
`mobile/src/features/auth/api/{authApi.ts,errors.ts,index.ts}`,
`mobile/src/features/auth/api/__tests__/{authApi.test.ts,errors.test.ts}`,
`mobile/__tests__/guardrails.test.ts`.

**Что делать:**
1. `config.ts` + `client.ts` по §1.3. Отсутствие URL или ключа — исключение с понятным текстом
   при инициализации, а не молчаливая работа (AC-47). `fetch` с тайм-аутом 15 с — **единственное**
   место `fetch(` во всём `mobile/`.
2. `sessionSecureStorage.ts` — LargeSecureStore: AES-256 ключ в SecureStore
   (`keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY`), шифротекст в AsyncStorage. Любая ошибка
   (нет ключа, мусор, чужой ключ) → «значения нет» + очистка остатков, без исключения наружу (AC-3, AC-7).
3. `freshInstall.ts` — очистка остатков Keychain при первом запуске после установки (AC-6).
4. `keys.ts` — реестр из трёх ключей AsyncStorage с назначением и признаком секретности.
5. `api/authApi.ts` + `api/errors.ts` по §1.4. Никакого `console.log` тела запроса, email, пароля,
   кода и токенов — только имя операции и код ошибки (AC-39).
6. **Переписать `guardrails.test.ts`** (это часть шага, а не следствие):
   - `no-backend-or-network` → `backend-only-behind-the-boundary`: импорт `@supabase/supabase-js`
     разрешён **ровно в одном файле** `src/lib/supabase/client.ts` (AC-8); литерал `fetch(`,
     `XMLHttpRequest`, `axios` — только в `src/lib/supabase/**`; идентификатор/путь `supabase`
     разрешён в `src/lib/supabase/**`, `src/lib/session/**`, `src/features/*/api/**`. Везде
     остальном правило действует как раньше. Негативная часть self-test'а обязана остаться:
     `fetch(` в `src/features/x/X.tsx` по-прежнему нарушение.
   - `ALLOWED_SETTING_KEYS`/«ровно один ключ, ровно один `setItem`» → сверка с реестром `keys.ts`:
     ровно три объявленных ключа, ни одного нового писателя вне `src/lib/storage/**`, и ни один
     ключ, помеченный как секретный, не пишется в открытом виде.
   - **Новые правила:**
     `no-service-role` — строки `service_role`, `SERVICE_ROLE`, `sb_secret` не встречаются нигде в `mobile/` (AC-46);
     `no-secret-env` — из `EXPO_PUBLIC_*` читаются только `EXPO_PUBLIC_SUPABASE_URL` и `EXPO_PUBLIC_SUPABASE_ANON_KEY` (AC-46);
     `no-credentials-in-logs` — в `src/features/auth/api/**` и `src/lib/supabase/**` нет `console.*`
     с объектом запроса (AC-39).
   - Правила SPEC-01 AC-24/26/27/16/17 остаются **без послаблений**.

**Критерии готовности:**
- `config.test.ts`: без URL / без ключа / с пустыми строками → исключение с читаемым сообщением,
  в котором нет значения ключа (AC-47).
- `sessionSecureStorage.test.ts`: запись→чтение возвращает исходное; в AsyncStorage **нет** значения,
  содержащего подстроку токена (AC-7); пусто / мусор / шифротекст без ключа → `null` и очистка (AC-3);
  чтение не делает ни одного сетевого вызова (AC-9).
- `freshInstall.test.ts`: нет флага → очистка вызвана и блоб удалён; флаг есть → очистки нет (AC-6).
- `errors.test.ts`: `invalid_credentials` и «несуществующий email» → **один и тот же** `invalidCredentials`
  (AC-16); 429/`over_email_send_rate_limit` → `rateLimited` (AC-18, AC-34); `otp_expired`/403 →
  `otpInvalidOrExpired` (AC-31); `same_password` → `samePassword` (AC-32); `user_already_exists` →
  `emailExists` (AC-13); сетевая ошибка и тайм-аут → `offline` (AC-19); неизвестный код → `unknown`,
  и в результате **нет** исходной строки сервера (AC-37).
- `authApi.test.ts` (клиент замокан): `signUp` кладёт `display_name` в `options.data` (AC-11);
  `verifyRecoveryCodeAndSetPassword` вызывает проверку кода, затем обновление пароля (AC-30);
  `signOut` при ошибке сервера всё равно отдаёт успех и локальная сессия очищена (AC-23);
  ни один тест не находит email/пароль/код в аргументах `console.*` (AC-39).
- `guardrails.test.ts`: зелёный **и** его self-test по-прежнему ловит нарушения в фича-коде.
- `pnpm --filter @tripplanner/mobile typecheck` и `test` зелёные.

---

### Шаг 7 — Жизненный цикл сессии и гейтинг маршрутов *(Тир 3, первый)*

**Зависит от:** Шаг 6. **Блокирует:** Шаги 8, 9.

**Владеет файлами:**
`mobile/src/lib/session/{SessionProvider.tsx,useSession.ts,displayName.ts,index.ts}`,
`mobile/src/lib/session/__tests__/{SessionProvider.test.tsx,displayName.test.ts}`,
`mobile/app/_layout.tsx`, `mobile/app/index.tsx`,
`mobile/src/test-utils/renderWithProviders.tsx`,
`mobile/__tests__/navigation.test.tsx`.

**Что делать:**
1. `SessionProvider` по §1.3: `restoring → signedIn | signedOut`, подписка `onAuthStateChange`,
   `AppState` → `startAutoRefresh`/`stopAutoRefresh`, очистка первого запуска до первой попытки
   использовать сессию.
2. `app/_layout.tsx`: провайдер в дерево; условие готовности = шрифты И тема И `status !== "restoring"`
   (AC-2); гейтинг групп через `Stack.Protected` (§1.6). `app/index.tsx` — редирект по состоянию (AC-1).
3. `renderWithProviders`: опция `session` (`signedIn`/`signedOut`/`restoring` + подставной пользователь),
   чтобы экранные тесты Шагов 8 и 9 не мокали `supabase-js` руками. Остаётся async (ThemeProvider
   читает хранилище асинхронно — `mobile/insights.md` 2026-09-19).
4. **Переписать `navigation.test.tsx`**: существующий `enterTabs()` (нажатие `sign-in-submit` →
   `/trips`, SPEC-01 AC-7) заменяется на «сессия задана моком» — после этого настоящие формы Шага 8
   этот файл не ломают.

**Критерии готовности:**
- `displayName.test.ts`: `display_name` есть → он; пустой/пробельный/отсутствующий → часть email
  до `@` (AC-26); инициал — первый графемный кластер (эмодзи-инициал допустим); очень длинное имя
  не ломает функцию.
- `SessionProvider.test.tsx`: пустое хранилище → `signedOut` без экрана ошибки (AC-3); ошибка
  обновления токена → `signedOut` + локальная очистка (AC-4); событие «сессия завершена» во время
  работы → `signedOut` (AC-24); `AppState` `active`/`background` → старт/стоп автообновления (AC-5);
  пока `restoring`, дерево навигации не рендерится (AC-2); восстановление не делает сетевых вызовов (AC-9).
- `navigation.test.tsx`: с сессией стартовый экран — `/trips`, без вспышки других экранов (AC-1);
  без сессии `/trips`, `/history`, `/profile`, `/trips/x` (в т.ч. как initialUrl — имитация ссылки
  `tripplanner://`) → `/onboarding` (AC-20); с сессией `/onboarding`, `/sign-in`, `/sign-up`,
  `/forgot-password`, `/reset-password` → `/trips`, а `/legal/terms` и `/legal/privacy` открываются
  в **обоих** состояниях (AC-21).
- `pnpm --filter @tripplanner/mobile typecheck` и `test` зелёные.

---

### Шаг 8 — Экраны форм S2, S3, S10, S10b и их строки *(Тир 3, второй)*

**Зависит от:** Шаги 2, 4, 6, 7.

**Владеет файлами:**
`mobile/src/features/auth/{SignInScreen.tsx,SignUpScreen.tsx,ForgotPasswordScreen.tsx,ResetPasswordScreen.tsx,index.ts,flowState.ts}`,
`mobile/src/features/auth/hooks/{useAuthSubmit.ts,useResendCountdown.ts}`,
`mobile/src/features/auth/components/AuthFormError.tsx`,
`mobile/src/features/auth/__tests__/*` (существующий `auth.test.tsx` + новые файлы на экран),
`mobile/app/reset-password.tsx`,
`mobile/src/lib/i18n/locales/ru/auth.ts`, `mobile/src/lib/i18n/locales/en/auth.ts`,
`mobile/__tests__/routes.contract.test.ts`.

**Что делать:**
1. Переписать четыре экрана на `TextField` + `useAuthSubmit` + схемы из `@tripplanner/shared`.
   Валидация — **до** запроса; ошибки полей под полями, прочие (сеть, rate limit, неизвестная) —
   одной строкой над кнопкой (AC-36). Никаких `Alert`/модалок.
2. Привести тексты и плейсхолдеры к дизайну (решение Q16): подзаголовки S2/S3, плейсхолдеры полей,
   подсказка «Минимум 8 символов», «Забыли пароль?» цветом `textSecondary` с зоной ≥ 44 pt (AC-41).
   Текст S10 меняется со «ссылки» на «код». **Apple/Google/разделитель не трогать** (AC-49).
3. S10b: неизменяемый показ email из `flowState`, поле кода (6 цифр, цифровая клавиатура, кнопка
   неактивна до 6 цифр), поле нового пароля, «Отправить код ещё раз» с отсчётом 60 с (AC-29, AC-33).
   Уход с экрана очищает введённое (AC-39).
4. Преднабор email при «email уже занят» (AC-13) — через `flowState`, **не** через параметр маршрута
   (см. §5 Q-A).
5. Полные ru/en строки для всего нового (подписи, плейсхолдеры, сообщения валидации, сопоставленные
   серверные ошибки, тексты шагов сброса) — паритет проверяет существующий `parity.test.ts` (AC-43).
6. Добавить `/reset-password` в `SPEC_ROUTES` контрактного теста; файл маршрута — тонкий, без параметров.

**Критерии готовности:**
- S3: корректная форма → вызван `signUp`, затем `/trips` (AC-10); пароль 7 символов / «не email» /
  имя из пробелов → сообщение под полем и **ни одного** вызова api (AC-12); `emailExists` → сообщение
  под email + действие «Войти», ведущее на S2 с подставленным email (AC-13).
- S2: успех → `/trips` (AC-15); неверная пара и несуществующий email → **идентичный** текст, email
  в поле сохранён (AC-16); 429 → отдельный текст (AC-18); сетевая ошибка → сообщение о соединении,
  введённое сохранено, повтор одним нажатием (AC-19); двойное/тройное нажатие → **ровно один** вызов
  api (AC-14).
- S10: существующий и несуществующий email дают один и тот же нейтральный экран и текст (AC-28);
  rate limit → «слишком часто», не ошибка поля (AC-34).
- S10b: `<6` цифр → кнопка неактивна, запроса нет (AC-29); успех → `/trips` с сохранённой сессией
  (AC-30); `otpInvalidOrExpired` → одно сообщение + «Отправить код ещё раз», новый пароль сохранён (AC-31);
  `samePassword` → своё сообщение, остаёмся на шаге 2 (AC-32); отсчёт 60 с блокирует повтор и
  показывает остаток (AC-33, фейковые таймеры); пароль < 8 → ошибка под полем без запроса (AC-35);
  неизвестный код ошибки → общий текст, исходной строки сервера в выводе нет (AC-37).
- Существующие тесты S2/S3 на Apple/Google/разделитель («скоро») остаются зелёными без правок
  по существу (AC-49).
- `parity.test.ts` зелёный, пустых значений и «ключ-как-значение» нет (AC-43).
- `routes.contract.test.ts`: множество маршрутов = карта SPEC-01 + `/reset-password`; у маршрутов
  аутентификации нет динамических сегментов и параметров (AC-39).
- Статически: ни `password`, ни `code`, ни `newPassword` не встречаются в аргументах `router.push`/
  `replace`/`navigate` (AC-39).

---

### Шаг 9 — Профиль и шапки: настоящие имя и email *(Тир 3, третий)*

**Зависит от:** Шаги 6 (signOut), 7 (`useSession`, `displayNameOf`).

**Владеет файлами:** `mobile/src/features/profile/**` (экран, `components/ProfileHeader.tsx`, тесты),
`mobile/src/features/trips/TripsScreen.tsx`, `mobile/src/features/history/HistoryScreen.tsx`,
`mobile/src/features/trips/__tests__/TripsScreen.test.tsx`,
`mobile/src/features/history/__tests__/HistoryScreen.test.tsx`,
`mobile/src/mocks/user.ts`, `mobile/src/mocks/index.ts`.

**Что делать:**
1. `ProfileScreen`: имя и email — из `useSession` + `displayNameOf`; «Выйти» вызывает `signOut`
   из `features/auth/api` и завершает сессию (переход обеспечивает гейтинг Шага 7, а не
   `router.dismissAll()` — старый код удаляется) (AC-22, AC-23).
2. `TripsScreen`/`HistoryScreen`: инициал аватара — из того же `displayNameOf`/`initialOf` (AC-27).
3. `MOCK_USER`: удалить поля `name` и `email`, оставить `connectedAccount` и `currency` (они остаются
   статичными заглушками строк профиля). Удаление полей делает AC-25 **проверяемым компилятором**.
4. Строки «Уведомления», «Подключённые аккаунты», «Валюта», переключатель темы — без изменений;
   строка «Удалить аккаунт» **не появляется** (решение C6).

**Критерии готовности:**
- Профиль с сессией показывает имя и email аккаунта (AC-25); аккаунт без `display_name` → часть email
  до `@` и непустой инициал, пустого кружка нет (AC-26).
- Все три экрана при одной и той же сессии показывают один и тот же инициал (AC-27).
- «Выйти» вызывает `signOut` ровно один раз; при ошибке сервера пользователь всё равно оказывается
  разлогиненным (AC-22, AC-23).
- `MOCK_USER` не содержит `name`/`email`; ни один исходник вне `src/mocks/` их не читает (AC-25).
- Набор строк настроек по-прежнему без выбора языка и без «Удалить аккаунт».

---

### Шаг 10 — Maestro: обновлённый smoke и новый поток аутентификации *(Тир 4)*

**Зависит от:** Шаги 8, 9. **Запустить сейчас нельзя** (Maestro не установлен, dev-клиент на iOS 27 —
см. `e2e/AGENTS.md`); поток авторуется «вслепую», допущения фиксируются в `e2e/insights.md`.

**Владеет файлами:** `e2e/flows/skeleton-smoke.yaml`, `e2e/flows/auth-email.yaml`, `scripts/e2e.sh`,
`e2e/insights.md`.

**Что делать:**
1. `auth-email.yaml`: `clearState: true` → регистрация свежим адресом (`${RUN_ID}` из `e2e.sh`,
   метка времени — решение C5) → табы → Профиль → «Выйти» → онбординг → вход тем же адресом → табы.
   Селекторы — только текст/accessibility-подпись, строки из env (правило `e2e/AGENTS.md`).
2. `skeleton-smoke.yaml`: шаг «нажать `${SIGNUP_SUBMIT}` → табы» заменить на ввод свежих учётных
   данных перед нажатием; остальной обход 12 экранов сохранить.
3. `scripts/e2e.sh`: добавить в таблицу локалей новые строки (подписи полей, тексты кнопок S10/S10b,
   сообщения) и генерацию `RUN_ID`/уникального email.
4. `e2e/insights.md`: зафиксировать непроверенные допущения (ввод в настоящее поле через `inputText`,
   автозаполнение Keychain может перехватить фокус, письмо с кодом в e2e не читается — поэтому
   поток сброса пароля в e2e **не** автоматизируется, он остаётся в ручном чек-листе).

**Критерии готовности (когда Maestro и рабочий симулятор появятся):**
- `./scripts/e2e.sh auth-email` и `./scripts/e2e.sh skeleton-smoke` зелёные в обеих локалях.
- Ни одного `id:`/testID-селектора и ни одного литерала интерфейса в YAML.
- До появления Maestro: `bash -n scripts/e2e.sh` и сверка имён переменных потока с таблицей скрипта
  (каждая `${VAR}` в YAML имеет строку в `e2e.sh`).

---

### Шаг 11 — Синхронизация документации и статусов *(Тир 4)*

**Зависит от:** Шаги 1–10.

**Владеет файлами:** `shared/AGENTS.md` (Status), `supabase/AGENTS.md` (Status), `mobile/AGENTS.md`
(Status), `e2e/AGENTS.md` (Status), `AGENTS.md` (секция Commands — команды `supabase start`,
`shared` тесты), `specs/SPEC-02-email-auth.md` (только строка `Implementation Plan:`),
`mobile/insights.md`, `shared/insights.md`, `supabase/insights.md` (append по
`engineering-insights`, только существенное и неочевидное).

**Критерии готовности:** ни одна строка Status не утверждает «Not scaffolded yet» про `shared/`
и `supabase/`; команды корневого `AGENTS.md` исполняются как написано; строка
`Implementation Plan:` спека указывает на этот файл.

---

## 4. Definition of Done (вся фича)

**Автоматика (зелёное одной серией из корня):**
```bash
pnpm install
pnpm -r typecheck                       # mobile: tsc --noEmit; shared: tsc --noEmit
pnpm -r test                            # mobile: jest (вкл. переписанные guardrails); shared: vitest
cd mobile && npx expo config --type public
grep -q '{{ .Token }}' supabase/templates/recovery.html
./scripts/e2e.sh auth-email             # когда Maestro и рабочий симулятор доступны
./scripts/e2e.sh skeleton-smoke
```
Без единой подавляющей директивы (`@ts-ignore`, `@ts-expect-error`, `eslint-disable`) — AC-50, AC-26 SPEC-01.

**Локальный стенд:** `supabase start` поднят, `mobile/.env` заполнен из `supabase status`;
сценарии AC-10, AC-15, AC-28…AC-34 прогнаны против него вручную (AC-48).

**Ручной чек-лист владельца (iOS-устройство/симулятор).** Отмечено, какой AC закрывает.

| # | Проверка | ACs |
|---|---|---|
| M1 | Вход → убить приложение → холодный старт: сразу `/trips`, без вспышки онбординга (запись экрана) | AC-1, AC-2 |
| M2 | Авиарежим + сохранённая сессия → приложение открывается авторизованным, без ошибки сети | AC-9 |
| M3 | Установить → войти → удалить приложение → установить заново → онбординг (Keychain не даёт автовхода) | AC-6 |
| M4 | Осмотр контейнера приложения после входа: в AsyncStorage нет токена в открытом виде, ключ — в Keychain | AC-7 |
| M5 | Фон дольше времени жизни access-токена → возврат работает без повторного входа; отзыв сессии на сервере → онбординг | AC-4, AC-5, AC-24 |
| M6 | Регистрация со свежим email → сразу табы; профиль показывает введённое имя | AC-10, AC-11 |
| M7 | Настоящее письмо со стенда: содержит шестизначный код; код спустя 11 минут отвергается | AC-51, AC-52 |
| M8 | Автозаполнение пароля из Keychain на S2 и предложение «сохранить пароль» после регистрации | AC-38 |
| M9 | Авиарежим на S2: сообщение о соединении, повтор одним нажатием, введённое сохранено | AC-19 |
| M10 | VoiceOver на S2 с неверным паролем: ошибка произносится и связана с полем | AC-40 |
| M11 | Accessibility Inspector: «Забыли пароль?» и «Отправить код ещё раз» ≥ 44×44 pt | AC-41 |
| M12 | Обход S2, S3, S10, S10b, S6 в светлой и тёмной теме: текст ошибки `danger` ≥ 4.5:1, заблокированная кнопка читаема | AC-42, AC-44, AC-36 |
| M13 | Клавиатура открыта на каждом из S2/S3/S10/S10b: активное поле и кнопка отправки доступны прокруткой | AC-45 |
| M14 | Логи dev-клиента при неуспешном входе: код ошибки и имя операции, без email/пароля/кода/токена | AC-39 |
| M15 | Осмотр конфигурации сборки: только URL и anon-ключ в `EXPO_PUBLIC_*`, `service_role` отсутствует | AC-46 |
| M16 | Выход → жест «назад» и перезапуск не возвращают в табы | AC-22 |
| M17 | Обход изменённых экранов на русском и английском: непереведённых строк и ключей нет | AC-43 |
| M18 | Кнопки Apple/Google и разделитель выглядят и ведут себя ровно как раньше («скоро») | AC-49 |

---

## 4a. Трассируемость AC → шаг → проверка (обязательная таблица)

Автоматической проверки покрытия в репозитории нет — эта таблица и есть механизм контроля.
**Проверено при составлении плана: все 52 AC (AC-1…AC-52) имеют минимум один шаг и минимум один
критерий проверки. Непокрытых нет.**

| AC | Шаг(и) | Чем именно проверяется |
|---|---|---|
| AC-1 | 7 | `navigation.test.tsx` (сессия → стартовый `/trips`); `auth-email.yaml`; M1 |
| AC-2 | 7 | `SessionProvider.test.tsx` (дерево навигации не рендерится в `restoring`); M1 |
| AC-3 | 6, 7 | `sessionSecureStorage.test.ts` (пусто/мусор/чужой ключ → `null` + очистка); `SessionProvider.test.tsx` |
| AC-4 | 7 | `SessionProvider.test.tsx` (ошибка обновления токена → `signedOut`); M5 |
| AC-5 | 7 | `SessionProvider.test.tsx` (AppState → start/stopAutoRefresh); M5 |
| AC-6 | 6, 7 | `freshInstall.test.ts`; вызов до восстановления в `SessionProvider.test.tsx`; M3 |
| AC-7 | 6 | `sessionSecureStorage.test.ts` (в AsyncStorage нет токена в открытом виде); M4 |
| AC-8 | 6 | `guardrails.test.ts` — импорт `@supabase/supabase-js` ровно в `src/lib/supabase/client.ts` |
| AC-9 | 6, 7 | `sessionSecureStorage.test.ts` + `SessionProvider.test.tsx` (восстановление без сети); M2 |
| AC-10 | 6, 8 | `authApi.test.ts`; тест S3 (успех → `/trips`); `auth-email.yaml`; M6 |
| AC-11 | 6 | `authApi.test.ts` (`options.data.display_name`); M6 |
| AC-12 | 2, 8 | `schemas.test.ts`; тест S3 (ошибка под полем, api не вызван) |
| AC-13 | 6, 8 | `errors.test.ts` (`emailExists`); тест S3 (сообщение + переход на S2 с email) |
| AC-14 | 4, 8 | `buttonStates.test.tsx` (`loading`); тест S2 (двойное нажатие → один вызов) |
| AC-15 | 8 | тест S2 (успех → `/trips`); `auth-email.yaml` |
| AC-16 | 6, 8 | `errors.test.ts` (оба случая → один kind); тест S2 (идентичный текст, email сохранён) |
| AC-17 | 2 | `schemas.test.ts` (trim + нижний регистр во всех трёх формах) |
| AC-18 | 6, 8 | `errors.test.ts` (429 → `rateLimited`); тест S2 (отдельный текст) |
| AC-19 | 6, 8 | `errors.test.ts` (сеть/тайм-аут → `offline`); тест S2 (сохранение ввода, повтор); M9 |
| AC-20 | 7 | `navigation.test.tsx` (табы и `/trips/*` без сессии → `/onboarding`, в т.ч. по ссылке) |
| AC-21 | 7 | `navigation.test.tsx` (5 маршрутов с сессией → `/trips`; `legal/*` в обоих состояниях) |
| AC-22 | 9 | тест `ProfileScreen` (вызван `signOut`, состояние `signedOut`); `auth-email.yaml`; M16 |
| AC-23 | 6, 9 | `authApi.test.ts` (ошибка сервера → локальная очистка); тест `ProfileScreen` |
| AC-24 | 7 | `SessionProvider.test.tsx` (событие завершения сессии во время работы); M5 |
| AC-25 | 9 | тест `ProfileScreen` (имя/email из сессии); `MOCK_USER` без этих полей — ошибка компиляции у любого потребителя |
| AC-26 | 7, 9 | `displayName.test.ts` (fallback до `@`, инициал); тест `ProfileScreen` |
| AC-27 | 9 | тесты `ProfileScreen`/`TripsScreen`/`HistoryScreen` — один инициал из одного источника |
| AC-28 | 8 | тест S10 (существующий и несуществующий email → один экран и текст) |
| AC-29 | 2, 8 | `schemas.test.ts` (6 цифр); тест S10b (клавиатура `number-pad`, кнопка неактивна до 6 цифр) |
| AC-30 | 6, 8 | `authApi.test.ts` (verify → updateUser); тест S10b (успех → `/trips`); ручной прогон против стенда |
| AC-31 | 6, 8 | `errors.test.ts` (`otp_expired`); тест S10b (одно сообщение + «отправить ещё раз», пароль сохранён) |
| AC-32 | 6, 8 | `errors.test.ts` (`same_password`); тест S10b (сообщение под полем пароля) |
| AC-33 | 8 | тест `useResendCountdown` (фейковые таймеры: блокировка 60 с, остаток, разблокировка) |
| AC-34 | 6, 8 | `errors.test.ts` (rate limit письма); тест S10 (текст «слишком часто») |
| AC-35 | 2, 8 | `schemas.test.ts` (граница 7/8); тест S10b (ошибка без запроса) |
| AC-36 | 4, 8 | `TextField.test.tsx` (ошибка под полем, цвет `danger`); `AuthFormError` над кнопкой; ни одного `Alert` в фича-коде; M12 |
| AC-37 | 6, 8 | `errors.test.ts` (неизвестный код → `unknown`, исходной строки нет); тест экрана (общий текст) |
| AC-38 | 4, 8 | `TextField.test.tsx` (тип клавиатуры, автокапитализация, автозаполнение, маскирование, переход по полям); M8 |
| AC-39 | 6, 8 | `guardrails.test.ts` (`no-credentials-in-logs`); `routes.contract.test.ts` (нет параметров у auth-маршрутов); `authApi.test.ts`; тест S10b (уход и возврат → форма пуста); M14 |
| AC-40 | 4 | `TextField.test.tsx` (ошибка в доступном описании поля, объявление при появлении); M10 |
| AC-41 | 4, 8 | тест S2 («Забыли пароль?» цвет `textSecondary`); `PressableRow` ≥ 44 pt; M11 |
| AC-42 | 4 | `buttonStates.test.tsx` (фон `divider`, текст `textTertiary`, без `opacity`, обе темы); M12 |
| AC-43 | 8 | существующий `parity.test.ts` (ключи ru/en совпадают, нет пустых и «ключ-как-значение»); M17 |
| AC-44 | — (ручная) | M12 |
| AC-45 | — (ручная) | M13 |
| AC-46 | 6 | `guardrails.test.ts` (`no-service-role`, `no-secret-env`); M15 |
| AC-47 | 6 | `config.test.ts` (нет URL/ключа → понятная ошибка при инициализации) |
| AC-48 | 3 | чтение `config.toml` (все перечисленные ключи заданы явно) + ручной прогон сценариев против стенда |
| AC-49 | 8 | существующие тесты S2/S3 на Apple/Google/«скоро» остаются зелёными; M18 |
| AC-50 | все | `pnpm -r typecheck`, `pnpm -r test` из §4, включая переписанные guardrails |
| AC-51 | 3 | `grep -q '{{ .Token }}' supabase/templates/recovery.html`; M7 |
| AC-52 | 3 | `otp_expiry` ≤ 600 в `config.toml` (проверка чтением файла); M7 |

---

## 4b. Чего делать НЕЛЬЗЯ (стоп-лист implementer'а)

1. Никаких таблиц, миграций, RLS-политик, pgTAP, Edge Functions, генерации типов БД — их нет в спеке.
2. Никаких действий против **хостингового** Supabase: ни `db push`, ни `db reset`, ни дашборда.
   Только локальный `supabase start`.
3. `service_role` в `mobile/` — ни в коде, ни в `.env`, ни в примере. В `EXPO_PUBLIC_*` — только URL
   и анонимный ключ.
4. Никакого `@supabase/supabase-js` вне `src/lib/supabase/client.ts` и никакого `fetch(` вне
   `src/lib/supabase/**`. Экраны и компоненты не знают о сети.
5. Никакого удаления guardrail-правил «чтобы прошло»: `no-backend-or-network` **переписывается**
   в «только за границей», а не выбрасывается; правила SPEC-01 AC-16/17/24/26/27 остаются как есть.
6. Никакого `Platform.OS` / `.ios.*` / `.android.*` вне `src/platform/**`; `src/platform/` этим планом
   не пополняется.
7. Никакой правки `mobile/ios/**` и `mobile/android/**` руками (CNG).
8. Никаких пароля, нового пароля и кода в параметрах маршрутов, в хранилище и в логах — включая
   отладочный вывод dev-клиента.
9. Никаких новых `NS*UsageDescription` и ни одного запроса системного разрешения.
10. Никаких `@ts-ignore` / `@ts-expect-error` / `eslint-disable`.
11. Никаких литеральных пользовательских строк вне `src/lib/i18n/locales/**`; никаких hex-цветов
    и имён шрифтов вне `src/lib/theme/**`.
12. Не трогать кнопки Apple/Google, разделитель «или по email» и их пометку «скоро» (AC-49).
13. Не добавлять строку «Удалить аккаунт», подтверждение email, социальные входы, смену пароля
    из профиля, флаг «онбординг показан один раз» — всё это Follow-up-спеки.
14. Не менять имена существующих маршрутов: это контракт для следующих спеков. Добавляется ровно один —
    `/reset-password`.
15. Не удалять `PlaceholderField` — её продолжают использовать S8/S9.

---

## 5. Риски, допущения, расхождения и вопросы

**Допущения (если неверны — остановиться и спросить):**
- A-1. Разработка и приёмка — на **локальном** Supabase; хостинговый проект не создаётся (решение Q15).
- A-2. `shared/` создаётся минимально: только схемы форм. Никакой доменной логики поездок.
- A-3. Приёмка на iOS; код кросс-платформенный, Android не проверяется.
- A-4. TanStack Query не вводится: в этом спеке нет серверного состояния данных, только операции.

**Риски:**
- **R-1 (предусловие).** Supabase CLI на машине **не установлен** (`supabase: command not found`),
  Docker — Rancher Desktop. Шаг 3 и все ручные прогоны требуют установки CLI владельцем; план её
  не выполняет.
- **R-2 (технический, высокий).** Имена и умолчания ключей `config.toml` расходятся между
  документацией и шаблоном CLI (предупреждение самого спека, раздел Inputs). Шаг 3 обязан сверить
  каждое имя с установленной версией, а не копировать из спека вслепую. То же — про имя локального
  почтовика (Inbucket/Mailpit, порт `54324` в обоих случаях).
- **R-3 (технический).** `Stack.Protected` в установленной версии expo-router (57.0.22) не проверен
  чтением исходников. **Fallback:** `<Redirect>` в корневом layout'е по состоянию сессии (без
  введения новых route-групп, чтобы не сломать контракт маршрутов и `routes.contract.test.ts`).
  Что бы ни выбралось — гейтинг остаётся **в layout'е**, не в экранах.
- **R-4 (технический).** Нужен ли `react-native-url-polyfill` и есть ли в Hermes/RN 0.86 рабочий
  `crypto.getRandomValues` — не проверено. План берёт случайные байты из `expo-crypto`; если
  `supabase-js` потребует глобальный полифил, добавить его **на Шаге 6** и зафиксировать в
  `mobile/insights.md` (это единственное допустимое отклонение от «все зависимости на Шаге 1»,
  и оно меняет `mobile/package.json` — согласовать, чтобы не сломать владение файлами).
- **R-5 (тестовый).** `@supabase/supabase-js` может потребовать транспиляции под jest-expo
  (`transformIgnorePatterns`). Проверить на Шаге 1 временным тестом, а не на Шаге 6.
- **R-6 (инструментальный).** Maestro не установлен, dev-клиент падает на симуляторе iOS 27
  (`mobile/insights.md`, исправлено плагином — проверить, что после пересборки с новыми нативными
  модулями запуск по-прежнему работает). Поток `auth-email.yaml` авторуется вслепую.
- **R-7 (продуктовый, не блокирует).** Поток сброса пароля не автоматизируется в e2e: письмо с кодом
  читать неоткуда, а встроенный почтовик Supabase ограничивает частоту писем (решение C7). Остаётся
  в ручном чек-листе (M7).
- **R-8 (технический).** Экспорт TS-исходника из `shared/` (без сборки) удобен для Metro/Deno,
  но ломается, если какой-то потребитель ждёт скомпилированный JS. **Fallback:** добавить сборку
  (`tsc -p tsconfig.build.json`) и `exports` на `dist/` — правка только `shared/package.json`.

**Расхождения спека и кода, найденные при планировании (не «чинятся молча», выносятся наверх):**
- **N-1.** Плейсхолдеры в коде: ru `Имя → «Анна Иванова»`, `Email → «name@example.com»`; дизайн
  (`design/screens/auth.md` + скриншоты, решение Q16) требует «Andrew» и «you@example.com».
  «Andrew» — английское имя в русском интерфейсе; см. вопрос Q-B.
- **N-2.** `ProfileHeader.tsx` задаёт `AVATAR_SIZE = 72` локальной константой, тогда как
  `design/tokens.md` определяет `layout.avatarProfile = 56`. Это **дефект SPEC-01**, а не предмет
  SPEC-02; Шаг 9 файл трогает, но размер **не меняет** без указания владельца.
- **N-3.** `PrimaryButton` и `SecondaryButton` используют `opacity: 0.4` для disabled — прямое
  нарушение `design/tokens.md` «Состояния». Спек требует починки только для кнопки отправки (AC-42);
  план чинит оба примитива (одно правило, один компонент-источник) — это расширение реализации,
  а не продуктового скоупа.
- **N-4.** Спек (со ссылкой на PLAN-01 §0) говорит, что в `supabase/` есть пустые `functions/`,
  `migrations/`, `tests/`. Фактически на диске только три `*.md`. На план не влияет (`supabase init`
  создаст нужное), но факт зафиксирован.
- **N-5.** Спек называет проверку AC-49 «существующие тесты S2/S3» — они существуют
  (`src/features/auth/__tests__/auth.test.tsx`), но проверяют и поведение SPEC-01 AC-7
  («Войти» → табы без проверки), которое этим спеком отменяется. Файл переписывается на Шаге 8;
  часть про Apple/Google/«скоро» обязана сохраниться дословно.

**Вопросы владельцу — решены 2026-09-21: Q-A подставлять email через `flowState`; Q-B «Andrew» в обеих локалях; Q-C single-agent по порядку:**
- **Q-A.** AC-13 требует перехода на S2 «с уже подставленным email», а AC-39 запрещает передавать
  чувствительные значения параметрами маршрута и прямо говорит, что email между шагами сброса
  передаётся внутренним состоянием потока. Про переход S3 → S2 спек этого не уточняет.
  *По умолчанию в плане:* тот же механизм — модульное состояние потока (`flowState`), без параметра
  маршрута. Подтвердить или выбрать параметр маршрута.
- **Q-B.** Плейсхолдер имени: дизайн даёт «Andrew». Оставить «Andrew» в обеих локалях (буквально
  по дизайну) или в ru подставить русское имя? *По умолчанию в плане:* как в дизайне, «Andrew»
  в обеих локалях.
- **Q-C.** Режим выполнения: тир 1 (шаги 2–5) допускает параллельную раздачу четырём implementer'ам;
  тиры 2–3 — строго последовательны. Подтвердить single-agent (по умолчанию) или multi-agent для тира 1.
