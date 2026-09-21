# Insights

Append-only. Managed by the `engineering-insights` skill. Add only substantive, non-obvious learnings.

## What Works
## What Doesn't Work
## Codebase Patterns
- 2026-09-21: Auth form schemas (`src/auth`) return STABLE error ids (`errorCodes.ts`), never messages — clients map id → i18n string, so a wording change never touches `shared/`. Pipeline order is `trim → lowercase → email` via `pipe` (so ` A@B.com ` validates and normalises); the password is NEVER trimmed (leading/trailing spaces are legitimate); `displayName` length is counted in code points (`[...s].length`), so an emoji counts once, matching what users see.
## Tool & Library Notes
- 2026-09-21: zod 4: read field errors with `z.flattenError(result.error)` (`error.flatten()` is deprecated in v4). With `types: []` in tsconfig (no `vite/client`), a vitest `import.meta.glob` does not typecheck — declare a local `ImportMeta` interface in the test (`src/auth/__tests__/schemas.test.ts`).
## Recurring Errors & Fixes
## Session Notes
## Open Questions
