# Testing

Typological, not exhaustive: per seam, one happy path plus the edge that matters.

| Package | Runner | Notes |
|---|---|---|
| `mobile/` | Jest (`jest-expo`) + React Native Testing Library | pure logic first; mock native modules in `jest.setup.ts` |
| `supabase/` | pgTAP (`supabase test db`) + Deno tests | every RLS policy tested (owner ok / other user denied / anon denied); Edge Functions with mocked outbound HTTP |
| `shared/` | vitest | schema parse/reject, conflict-detection and timezone/date/money logic |
| `e2e/` | Maestro | core journeys only, seeded data, platform-neutral |

CI (to add): typecheck + unit lanes on every PR; `supabase test db` needs Docker; Maestro on release branches.
