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
`@tripplanner/shared` exists (SPEC-02 / PLAN-02, extended by SPEC-03 / PLAN-03): `package.json` exports TS source directly (no build step), `tsc --noEmit` + vitest (`pnpm --filter @tripplanner/shared test`, 266 tests in 10 files).
- `src/auth/`: Zod form schemas for email / password / display name / OTP code (`schemas.ts`), the stable error-id contract that clients map to i18n strings (`errorCodes.ts`), and `parseAuthForm` (`parse.ts`). Used by `mobile/src/features/auth`.
- `src/places/`: the offline place directory (`directory.ts`: 267 records = 197 countries + 70 cities, ids like `country-pt` / `city-porto` are persisted in `trips.place_id` and never renumbered), `searchPlaces` (prefix match, ru + en, case/diacritics folded with an explicit table, no transliteration, max 4), IANA-zone validation, `findPlaceById`.
- `src/trips/`: trip form schema and `parseTripForm` (one validation for create and edit, stable field-error ids in `errorCodes.ts`), the row/write mappers (`tripFromRowSchema`, `toTripWrite`), calendar-date helpers, `deriveTripStatus` / active + history selectors / `pickUpcomingTripId`, `coverIndexOf` (cover colour from the trip id), `resolveDestinationName`. `src/forms/parse.ts` is the shared form-parse helper.
- `src/db/database.types.ts`: generated Supabase types (only `public.trips` so far), exported type-only from `src/index.ts`; regenerate after each migration.
- Not there yet: conflict rules between bookings and money helpers (no bookings tables exist yet, see `supabase/AGENTS.md`).
