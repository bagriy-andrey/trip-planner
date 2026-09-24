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
`@tripplanner/shared` exists (SPEC-02 / PLAN-02, extended by SPEC-03 / PLAN-03 and SPEC-04 / PLAN-04): `package.json` exports TS source directly (no build step), `tsc --noEmit` + vitest (`pnpm --filter @tripplanner/shared test`, 594 tests in 28 files).
- `src/auth/`: Zod form schemas for email / password / display name / OTP code (`schemas.ts`), the stable error-id contract that clients map to i18n strings (`errorCodes.ts`), and `parseAuthForm` (`parse.ts`). Used by `mobile/src/features/auth`.
- `src/places/`: the offline place directory (`directory.ts`: 297 records = 197 countries + 100 cities, ids like `country-pt` / `city-porto` are persisted in `trips.place_id` and never renumbered), `searchPlaces` (prefix match, ru + en, case/diacritics folded with an explicit table, no transliteration, max 4), IANA-zone validation, `findPlaceById`. `airports.ts` adds a separate `AirportRecord` directory (388 airports, multiple per multi-airport city e.g. `BCN`/`GRO`) and `airlines/airlines.ts` a flight-number-designator directory (460 airlines) — both offline, next to (not merged into) the place directory.
- `src/trips/`: trip form schema and `parseTripForm` (one validation for create and edit, stable field-error ids in `errorCodes.ts`), the row/write mappers (`tripFromRowSchema`, `toTripWrite`), calendar-date helpers, `deriveTripStatus` / active + history selectors / `pickUpcomingTripId`, `coverIndexOf` (cover colour from the trip id), `resolveDestinationName`. `src/forms/parse.ts` is the shared form-parse helper.
- `src/segments/`: the `trip_segments` form schema (`schemas.ts`, mandatory-directory airports, arrival whole-or-nothing, 48h max duration, passengers 1–9) and DB row/write mappers, the pure route/gap builder `buildRoute` (`route.ts` — layover vs. stopover by an 8h threshold, risky layover under 90min, airport-mismatch/overlap/outside-trip-dates/not-closed warnings; the ONLY place these thresholds and the airport-code comparison live, `mobile/` never re-derives them), local-time↔UTC-instant conversion (`time.ts`, DST-safe on both offset signs).
- `src/hotels/`: the `trip_hotels` form schema (`schemas.ts`, stable error ids in `errorCodes.ts`, lengths in code points, cost pair, 365-night cap), `nightsBetweenDates` (calendar dates, no zone; `countNights` was removed 2026-09-24; `nights.ts`), `breakfastDaysRange` (`breakfast.ts`), `parseMapsUrl` (`mapsUrl.ts`, https + Google Maps host whitelist, hand-rolled ASCII parsing), row/write mappers (`rows.ts`; `time` columns arrive as `HH:MM:SS` and are normalised to `HH:MM`). Hotels no longer hold UTC instants: `Hotel`/`HotelFormValue` carry `checkInDate`/`checkOutDate` (`CalendarDate`, required) and `checkInTime`/`checkOutTime` (`ClockTime | null`, optional, never defaulted); `HotelWrite` uses `check_in_date`/`check_out_date`/`check_in_time`/`check_out_time`; the `checkIn.timeRequired`/`checkOut.timeRequired` error ids are gone (`checkOut.notAfterCheckIn` fires only for the same date with both times set).
- `src/db/database.types.ts`: generated Supabase types (`public.trips`, `public.trip_segments`, `public.trip_hotels`), exported type-only from `src/index.ts`; regenerate after each migration.
- Not there yet: conflict rules between bookings and money helpers (only booking tables exist now; conflict rules stay a future spec).
