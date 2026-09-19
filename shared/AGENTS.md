# shared/ — contracts and domain logic (`@tripplanner/shared`)

Zod schemas, generated DB types (`src/db/database.types.ts`), and pure domain logic used by `mobile/`,
the future `web/`, and Supabase Edge Functions. Real workspace package (not vendored).

## Rules
- Runtime-neutral: must run in Hermes (React Native), browsers, Deno (Edge Functions) and Node.
  No `react-native`, no `supabase-js`, no Node-only or DOM-only APIs, no I/O. Pure TS + Zod.
- Home of logic that must behave the same on every client: conflict detection between bookings,
  timezone/date math, money totals. Don't re-implement it in a client or a function.
- Dates over the wire: ISO-8601 UTC strings + IANA timezone id where local time matters.
- A contract change updates every consumer (mobile, functions, later web) in the same plan.
- Tests: vitest, pure unit tests (always cover day/timezone boundaries).

## Status
Not scaffolded yet (no `package.json` or `src/`) — not touched by SPEC-01; the app skeleton has no Zod/domain logic.
