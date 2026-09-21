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
`@tripplanner/shared` exists (SPEC-02 / PLAN-02): `package.json` exports TS source directly (no build step), `tsc --noEmit` + vitest (`pnpm --filter @tripplanner/shared test`, 41 tests).
- `src/auth/`: Zod form schemas for email / password / display name / OTP code (`schemas.ts`), the stable error-id contract that clients map to i18n strings (`errorCodes.ts`), and `parseAuthForm` (`parse.ts`). Used by `mobile/src/features/auth`.
- Not there yet: generated DB types (`src/db/`) and any domain logic (conflict rules, timezone/money helpers) — no tables exist yet (see `supabase/AGENTS.md`).
