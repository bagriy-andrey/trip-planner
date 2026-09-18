# TripPlanner — project map (a map, NOT documentation)

Mobile trip-planning app. iOS first (App Store), Android later — one codebase.
This file loads every session: keep it ≤100 lines. Depth lives in linked docs.

## Session protocol — insights loop (run the `engineering-insights` skill)
- START: the moment a request names or implies a module, READ that module's `insights.md`
  (`mobile/`, `server/`, `shared/`, `e2e/`, or root for cross-cutting) BEFORE any work;
  treat it as high-confidence guidance unless told otherwise.
- END: run `/engineering-insights`. Append ONLY a substantive, non-obvious learning that isn't
  already there (read first, dedup). If nothing qualifies, write nothing — don't skip the check.

## Stack (decided 2026-09-18)
Node ≥22 · pnpm ≥10 (workspace) · TypeScript strict.
Mobile: Expo (managed + dev client) · React Native · expo-router · TanStack Query · EAS Build/Submit.
Server: Fastify · Drizzle ORM · Postgres · Zod. Contracts: `shared/` (Zod). E2E: Maestro.

## Commands (fill in as the packages get scaffolded)
- Install: `pnpm install` (root). Per package: `pnpm typecheck` / `pnpm test`.
- Mobile: `cd mobile && npx expo start` (dev client) · builds via `eas build`.
- Server: `cd server && pnpm dev` · DB: `pnpm db:generate && pnpm db:migrate`.

## Where things live (pnpm workspace)
- `mobile/` — `@tripplanner/mobile`: Expo app. Screens in `app/`, features in `src/features/`.
- `server/` — `@tripplanner/api`: Fastify + Drizzle, onion architecture.
- `shared/` — `@tripplanner/shared`: Zod schemas + types. Runtime-neutral (Hermes AND Node).
- `e2e/`    — `@tripplanner/e2e`: Maestro flows (deterministic).
- `specs/`  — cross-package SPEC-NN-*.md and `specs/plans/`. `docs/features/`, `docs/release/`.

## Non-default rules (the agent can't guess these)
- mobile ↔ server talk ONLY over HTTP; every request/response type comes from `@tripplanner/shared`.
- iOS-first, Android-ready: no `Platform.OS` forks in feature code; platform code lives in
  `mobile/src/platform/` with an Android fallback. Each SPEC declares `Platforms:`.
- Never put secrets in `EXPO_PUBLIC_*` (bundled into the app). Tokens: `expo-secure-store` only.
- Native deps: install with `npx expo install`; a new native module = new dev-client build.
- Server tests split by filename: `*.it.test.ts` = real Postgres (testcontainers); rest hermetic.
- Migrations: `pnpm db:generate` then `pnpm db:migrate`; never hand-edit generated migrations.

## Do NOT touch
- Generated `mobile/ios/` and `mobile/android/` (Continuous Native Generation) — change `app.config.ts`.
- `docker compose down -v` once a dev DB volume exists — it deletes local data.

## Multi-agent workflow (SDD) — see `.claude/agents/README.md`
`spec-creator` → `implementation-planner` → `/sdd-build <plan>` → `/pr-self-review`.
Release: `release-manager` agent + `mobile-release` skill.

## AGENTS.md rules (for whoever edits these files)
- Map, not manual: stack, commands, layout, non-default conventions, do-not-touch. ≤100 lines.
- Test each line: "remove it — would the agent start erring?" No → cut it.
- Per-module conventions go in `<module>/AGENTS.md`. `CLAUDE.md` is a 1-line stub: `@AGENTS.md`.

## Pointers — read these on demand
- `mobile/AGENTS.md` · `server/AGENTS.md` · `shared/AGENTS.md` · `e2e/AGENTS.md` — read first when inside that package.
- `.claude/skills/README.md` — skill catalog. `TESTING.md` — test split and CI.
