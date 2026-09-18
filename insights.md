# Insights

Append-only. Managed by the `engineering-insights` skill. Add only substantive, non-obvious learnings.

## What Works
## What Doesn't Work
## Codebase Patterns
- `@tripplanner/shared` is a real pnpm workspace package (`shared/`), not a vendored copy per consumer as in dev-digest — mobile (Hermes) and server (Node) import the same Zod schemas, so there is no hand-sync step and no drift to police; this is why `shared/` must stay runtime-neutral (`shared/AGENTS.md`).
## Tool & Library Notes
## Recurring Errors & Fixes
## Session Notes
## Open Questions
