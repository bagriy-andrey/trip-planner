# Testing

Typological, not exhaustive: per seam, one happy path plus the edge that matters.

| Package | Runner | Notes |
|---|---|---|
| `mobile/` | Jest (`jest-expo`) + React Native Testing Library | pure logic first; mock native modules in `jest.setup.ts` |
| `server/` | vitest | `*.it.test.ts` = real Postgres (testcontainers); everything else hermetic |
| `shared/` | vitest | schema parse/reject tests |
| `e2e/` | Maestro | core journeys only, seeded data, platform-neutral |

CI (to add): typecheck + unit lanes on every PR; integration lane needs Docker; Maestro on release branches.
