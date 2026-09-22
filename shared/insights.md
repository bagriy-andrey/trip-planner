# Insights

Append-only. Managed by the `engineering-insights` skill. Add only substantive, non-obvious learnings.

## What Works
## What Doesn't Work
## Codebase Patterns
- 2026-09-21: Auth form schemas (`src/auth`) return STABLE error ids (`errorCodes.ts`), never messages — clients map id → i18n string, so a wording change never touches `shared/`. Pipeline order is `trim → lowercase → email` via `pipe` (so ` A@B.com ` validates and normalises); the password is NEVER trimmed (leading/trailing spaces are legitimate); `displayName` length is counted in code points (`[...s].length`), so an emoji counts once, matching what users see.
- 2026-09-21: Trip status is NOT a stored column and NOT purely a per-trip function (SPEC-03, not yet implemented): `deriveTripStatus(trip, today)` yields only `archived | draft | completed | planned`; "upcoming" (the accent "in N days" pill) means "the nearest future trip" and is a property of the LIST, so it is picked at list level (AC-23), never inside the pure function. A trip whose end date is today is still active. `today` is an injected calendar date, so tests stay deterministic without `MOCK_NOW`.
- 2026-09-22: Place ids (`country-pt`, `city-porto`, ...) are persisted in `trips.place_id`: the directory may gain records but an existing id must never be renumbered or reused, or saved trips point at the wrong place. The fold behind prefix search is an EXPLICIT character table (no `normalize("NFD")`, no `\p{}`) because Hermes' support for both is unverified; a test cross-checks the table against NFD in Node so the two cannot drift.
- 2026-09-22: `pickUpcomingTripId` counts a trip that is already under way (start in the past, end not yet passed) as the upcoming one: the literal AC-23, "the nearest active trip". Clients must handle a non-positive "in N days" (`TripStatusPill` in mobile shows "today" instead of a negative count).
## Tool & Library Notes
- 2026-09-21: zod 4: read field errors with `z.flattenError(result.error)` (`error.flatten()` is deprecated in v4). With `types: []` in tsconfig (no `vite/client`), a vitest `import.meta.glob` does not typecheck — declare a local `ImportMeta` interface in the test (`src/auth/__tests__/schemas.test.ts`).
- 2026-09-22: zod 4 skips object-level `.check` / `.refine` once ANY property has an issue, so cross-field rules ("only one date", "end before start") vanish exactly when the user has also made a field mistake. `parseTripForm` therefore validates everything in ONE `.transform((raw, ctx) => ...)` with explicit issue `path`s, which reports all fields at once.
- 2026-09-22: In zod 4 a key whose schema is `nullish().transform().pipe()` is NOT optional in an object type. For optional form keys use `z.unknown().optional()` and validate/normalise inside the transform.
- 2026-09-22: `Intl.DateTimeFormat` resolves `Asia/Ho_Chi_Minh` to `Asia/Saigon` and accepts any letter case (`europe/lisbon`). Validate an IANA zone by the `Area/Location` shape plus Intl acceptance; never assert that the canonical spelling equals the input (a correct directory record would fail).
- 2026-09-22: Prefix search has no transliteration, but "Порту" is a prefix of "Португалия" as well as of "Порту" (Porto): tests of the "no transliteration" rule must expect both records, not just the city.
## Recurring Errors & Fixes
## Session Notes
## Open Questions
- 2026-09-22: `places` city records model exactly ONE `airportCode` per city (the "main" airport). SPEC-04 (flight segments/route) needs multi-airport cities to be distinguishable (e.g. Barcelona El Prat `BCN` vs Girona `GRO`) so the "wrong airport" route warning can compare by airport code, not city — the directory schema/data will need an airport-per-city model before that AC can be implemented.
