# TripPlanner — project map (a map, NOT documentation)

Travel wallet for bookings (flights, hotels, cars). iOS first (App Store), then a web UI, then
Android — all clients share ONE backend. Working codename; product name is undecided (`ideas/`).
This file loads every session: keep it ≤100 lines. Depth lives in linked docs.

## Session protocol — insights loop (run the `engineering-insights` skill)
- START: the moment a request names or implies a module, READ that module's `insights.md`
  (`mobile/`, `supabase/`, `shared/`, `e2e/`, or root for cross-cutting) BEFORE any work;
  treat it as high-confidence guidance unless told otherwise.
- END: run `/engineering-insights`. Append ONLY a substantive, non-obvious learning that isn't
  already there (read first, dedup). If nothing qualifies, write nothing — don't skip the check.

## Stack (backend decided 2026-09-18 — `docs/decisions/ADR-001-backend-supabase.md`)
Node ≥22 · pnpm ≥10 (workspace) · TypeScript strict.
Clients: Expo (managed + dev client) · React Native · expo-router · TanStack Query · EAS Build/Submit;
later `web/` (Next.js) — a separate UI on the same backend.
Backend: Supabase (Postgres + Auth + Storage + Edge Functions). Contracts + domain logic: `shared/` (Zod, pure TS).
E2E: Maestro.

## Commands (fill in as packages get scaffolded)
- Install: `pnpm install`. All packages from root: `pnpm -r typecheck` / `pnpm -r test`; per package: `pnpm typecheck` / `pnpm test` (e.g. `pnpm --filter @tripplanner/shared test`).
- Mobile: `cd mobile && npx expo config --type public` (config check) · `npx expo start` (dev client) · builds via `eas build`.
- E2E: `./scripts/e2e.sh <flow> [--locale ru|en] [--metro-url URL]` (needs Maestro + booted iOS sim; not yet run — see `e2e/AGENTS.md`).
- Backend: `supabase start -x vector` (`-x vector` needed on Rancher Desktop; app env from `supabase status` → `mobile/.env`, see `supabase/README.md`) · `supabase migration new <name>` · `supabase db reset` · `supabase test db`.
- Types: `supabase gen types typescript --local > shared/src/db/database.types.ts` after each migration.
- Claude Design: changed `mobile/src/lib/theme` or `design/` → `node .design-sync/build.mjs`, then `/design-sync` (pinned project, tokens-only; see `.design-sync/NOTES.md`).

## Where things live
- `mobile/`   — `@tripplanner/mobile`: Expo app. Screens in `app/`, features in `src/features/`.
- `supabase/` — SQL migrations, RLS policies, Edge Functions (Deno), pgTAP tests. Not a pnpm package.
- `shared/`   — `@tripplanner/shared`: Zod schemas, generated DB types, pure domain logic
  (conflict rules, timezone/money helpers). Runtime-neutral: Hermes, browser, Deno AND Node.
- `e2e/`      — Maestro flows. `specs/` SPEC-NN + plans. `docs/features/`, `docs/release/`, `docs/decisions/`.
- `ideas/`    — product brief and design canvas (source of truth for product intent, not code).
- `design/`   — `tokens.md` (token values), `README.md` (design system), `screens/*.md` (per-screen specs).

## Non-default rules (the agent can't guess these)
- Every table has RLS + a policy test. `service_role` key ONLY in Edge Functions/CI — never in a client.
- Schema changes only via `supabase/migrations/` (never the dashboard); don't edit applied migrations.
- Clients call Supabase only through `lib/supabase` + feature `api/` modules; map rows with `shared/` Zod schemas.
- Product logic identical on every client (conflict detection, date/money math) lives in `shared/`, not in a client.
- Каждая запись (рейс, отель, авто, документ) имеет `source`: `manual` | `imported_pending` | `imported_confirmed`.
- Время — UTC + отдельное поле IANA-таймзоны места. Валюта — на уровне записи; домашняя валюта профиля — лишь умолчание для НОВОЙ записи.
- Поездка принадлежит одному пользователю; попутчиков в первой фазе нет.
- iOS-first, Android-ready: no `Platform.OS` forks in feature code; platform code in `mobile/src/platform/`.
- Never put secrets in `EXPO_PUBLIC_*`. Session/tokens: SecureStore-backed (LargeSecureStore pattern).
- Native deps: `npx expo install`; a new native module = new dev-client build.

## Do NOT touch
- Generated `mobile/ios/` and `mobile/android/` (Continuous Native Generation) — change `app.config.ts`.
- Hosted Supabase project: no `db reset` / `db push` / dashboard edits without the user's explicit go-ahead.

## Multi-agent workflow (SDD) — see `.claude/agents/README.md`
`spec-creator` → `implementation-planner` → `/sdd-build <plan>` → `/pr-self-review`.
Release: `release-manager` agent + `mobile-release` skill.
Tasks/ideas live on the GitHub Projects board "TripPlanner" — use the `task-board` skill ("запиши задачу: …").

## AGENTS.md rules (for whoever edits these files)
- Map, not manual: stack, commands, layout, non-default conventions, do-not-touch. ≤100 lines.
- Test each line: "remove it — would the agent start erring?" No → cut it.
- Per-module conventions go in `<module>/AGENTS.md`. `CLAUDE.md` is a 1-line stub: `@AGENTS.md`.

## Pointers — read these on demand
- `mobile/AGENTS.md` · `supabase/AGENTS.md` · `shared/AGENTS.md` · `e2e/AGENTS.md` — read first inside that package.
- `.claude/skills/README.md` — skill catalog. `TESTING.md` — test split.

<!-- design-kit:start -->
## Дизайн и стили

- Все цвета, шрифты, радиусы, отступы и размеры — только из темы приложения
  (`mobile/src/lib/theme`). Hex-литерал или «магическое число» в компоненте —
  ошибка. Нужного токена нет — добавь его в тему, а не пиши значение по месту.
- Канонические значения токенов и их смысл — в `design/tokens.md`.
  Тема приложения обязана им соответствовать; расхождение чинится в теме.
- Тема следует системной по умолчанию, ручной выбор в профиле её перекрывает.
  Любой новый экран обязан выглядеть корректно в светлой и тёмной.
- Шрифт Manrope для всего текста: ExtraBold 800 для заголовков экранов
  и названий городов, Bold 700 для заголовков секций и кнопок, Medium 500
  для основного текста. SemiBold 600 не использовать.
- IBM Plex Mono — только «билетные» данные: коды аэропортов, даты в карточках,
  номера рейсов, билетов, полисов, места, коды стран и валют. Нигде больше. Число пассажиров,
  заголовки и кнопки — не моно.
- Иконки — `@expo/vector-icons`, набор Feather. Текстовые символы вместо
  иконок (`<`, `…`, `+`, `-`, `→`) не использовать. Эмодзи как иконки запрещены.
- Исключение: флаг страны рисуется эмодзи — это данные, а не иконка UI.
  Там, где эмодзи-флаг не рендерится, показывается двухбуквенный код
  страны моношрифтом.
- Зона нажатия минимум 44pt, включая ссылки внутри текста. Контраст текста
  минимум 4.5:1 в обеих темах.
- Стеклянная панель = `BlurView` + полупрозрачный фон + граница 1px из темы.
  Все три части обязательны.
- Не рисовать фальшивый статус-бар и фальшивую клавиатуру.

## Экраны

- Спека каждого экрана — в `design/screens/*.md`. Перед тем как писать или
  править экран, прочитай его спеку и `specs/SPEC-01`.
- Расхождение кода со спекой — баг, кроме случаев, когда это сознательная
  заглушка скелета. Если спека кажется неправильной, скажи об этом,
  но не меняй поведение молча.

## Данные

- У каждой записи (рейс, отель, авто, документ) есть поле `source`:
  `manual` | `imported_pending` | `imported_confirmed`.
- Время хранится в UTC плюс отдельным полем таймзона места.
- Валюта — на уровне записи. Домашняя валюта профиля — только умолчание для НОВОЙ записи; конвертации нет.
- Поездка принадлежит одному пользователю, попутчиков в первой фазе нет.

## Чего не делать в первой фазе

Мультивалютной конвертации, полного офлайн-sync с разрешением конфликтов,
гостевого режима, импорта из Booking, шаринга поездки, Live Activity,
экспорта в Apple Wallet. Если задача тянет туда — остановись и спроси.

## Блокеры релиза

Удаление аккаунта прямо в приложении (App Store Guideline 5.1.1(v)),
восстановление пароля, ссылки на условия и политику с зоной нажатия 44pt.
<!-- design-kit:end -->
