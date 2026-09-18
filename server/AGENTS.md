# server/ — Fastify API (`@tripplanner/api`)

Onion architecture: see `.claude/skills/onion-architecture`. Fastify: `fastify-best-practices`. DB: `drizzle-orm-patterns`, `postgresql-table-design`.

## Rules
- Feature = `src/modules/<name>/{routes,service,repository}.ts`, registered statically.
- Route schemas come from `@tripplanner/shared` (Zod). Never redeclare a contract.
- Third-party APIs (places, weather, push, email) sit behind ports/adapters; mocked in unit tests.
- Tests: vitest. DB-backed tests MUST be `*.it.test.ts` (testcontainers); everything else hermetic.
- Auth/secrets: see `security` skill; secrets via env, never committed.

## Status
Not scaffolded yet.
