# Engineering Insights — examples & the capture bar

Concrete patterns for writing entries that earn their place in an `insights.md`.
The governing test: **if it would be obvious to anyone reading the code, don't write it.**

## Vague vs useful

Each entry must be actionable *cold* — an agent reading it with no other context knows exactly
what to do or avoid.

| ❌ Vague (noise — don't write) | ✅ Useful (actionable cold) |
|---|---|
| "Promises can be tricky." | "Geocoding all stops with `Promise.all()` trips the places API rate limit after ~10 items — batch with `Promise.allSettled()` in groups of 5 (`supabase/functions/geocode/index.ts`)." |
| "Be careful with async." | "Draft-trip state must go through the trip store (`mobile/src/features/trips/store`) — 3 screens share it; local React state silently desyncs them." |
| "Tests are flaky." | "Maestro flows assume the seeded test account has exactly one trip; a dev DB with more trips lands them on the wrong screen — use `./scripts/e2e.sh`." |
| "RLS is confusing." | "A policy using `auth.uid()` unwrapped is re-evaluated per row — write `(select auth.uid())`; and a new table with RLS on but no policy returns zero rows to clients, not an error (`supabase/migrations/…_trips.sql`)." |

Lead with the fact, then the *why / evidence* as `file:line`. Keep it one declarative line.

## A good entry per section (TripPlanner-flavored)

- **What Works** — "Storing itinerary times as UTC + an IANA timezone id (not a local string) made
  cross-timezone trips sort correctly (`shared/src/trip.ts`)."
- **What Doesn't Work** — "Requesting location permission at app launch — App Review rejected it and
  users denied it; ask in context on the 'add nearby stop' action."
- **Codebase Patterns** — "A backend feature = ONE migration (table + RLS + policies) + a pgTAP test + regenerated
  `shared` DB types; never dashboard edits."
- **Tool & Library Notes** — "`supabase-js` returns `{ data, error }` and does NOT throw on RLS/constraint failures — every call
  site must check `error`; wrap in the feature's `api/` module so components never see it."
- **Recurring Errors & Fixes** — "Metro can't resolve `@tripplanner/shared` after adding a dep →
  clear cache: `npx expo start -c`; check `metro.config.js` watchFolders."
- **Session Notes** — "- 2026-06-20: traced why the map screen re-rendered on every GPS tick — the
  location hook returned a new object each time; memoized in `useUserLocation`."
- **Open Questions** — "Does the offline mutation queue replay in order after an app kill/restart on
  iOS background-fetch limits? Untested on a real device."

## Capture / don't-capture

**Capture** (durable, non-obvious, reusable):
- A gotcha that cost real time to diagnose.
- An env/tooling quirk + the *exact* flag or command that fixes it.
- An error seen more than once, with its fix.
- A decision made with a tradeoff — and the reason.
- An undocumented dependency, service, or env var.
- A cross-module invariant the code doesn't make obvious.

**Don't capture** (noise — leave it out):
- One-time edits or task-specific decisions that won't recur.
- Anything already obvious from the code or stated in `CLAUDE.md` / `README.md`.
- Facts about code that's still actively changing (not stable knowledge yet).
- Restatements of documentation.
- Meta-notes about this skill itself.
