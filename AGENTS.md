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
- Install: `pnpm install`. All packages from root: `pnpm -r typecheck` / `pnpm -r test`; per package: `pnpm typecheck` / `pnpm test`.
- Mobile: `cd mobile && npx expo config --type public` (config check) · `npx expo start` (dev client) · builds via `eas build`.
- E2E: `./scripts/e2e.sh <flow> [--locale ru|en] [--metro-url URL]` (needs Maestro + booted iOS sim; not yet run — see `e2e/AGENTS.md`).
- Backend: `supabase start` · `supabase migration new <name>` · `supabase db reset` · `supabase test db`.
- Types: `supabase gen types typescript --local > shared/src/db/database.types.ts` after each migration.

## Where things live
- `mobile/`   — `@tripplanner/mobile`: Expo app. Screens in `app/`, features in `src/features/`.
- `supabase/` — SQL migrations, RLS policies, Edge Functions (Deno), pgTAP tests. Not a pnpm package.
- `shared/`   — `@tripplanner/shared`: Zod schemas, generated DB types, pure domain logic
  (conflict rules, timezone/money helpers). Runtime-neutral: Hermes, browser, Deno AND Node.
- `e2e/`      — Maestro flows. `specs/` SPEC-NN + plans. `docs/features/`, `docs/release/`, `docs/decisions/`.
- `ideas/`    — product brief and design canvas (source of truth for product intent, not code).

## Non-default rules (the agent can't guess these)
- Every table has RLS + a policy test. `service_role` key ONLY in Edge Functions/CI — never in a client.
- Schema changes only via `supabase/migrations/` (never the dashboard); don't edit applied migrations.
- Clients call Supabase only through `lib/supabase` + feature `api/` modules; map rows with `shared/` Zod schemas.
- Product logic identical on every client (conflict detection, date/money math) lives in `shared/`, not in a client.
- Time = UTC + IANA tz id. Currency per record. Every booking has `source` (manual/imported_*).
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
