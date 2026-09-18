# Insights

Append-only. Managed by the `engineering-insights` skill. Add only substantive, non-obvious learnings.

## What Works
## What Doesn't Work
## Codebase Patterns
- `@tripplanner/shared` is a real pnpm workspace package (`shared/`), not a vendored copy per consumer as in dev-digest — mobile (Hermes) and server (Node) import the same Zod schemas, so there is no hand-sync step and no drift to police; this is why `shared/` must stay runtime-neutral (`shared/AGENTS.md`).
## Tool & Library Notes
- 2026-09-18: This machine has two `gh` logins (github.com personal + github.ibm.com work), both "active" — always pass `--repo bagriy-andrey/trip-planner` / `--owner bagriy-andrey` so commands hit github.com. The github.com token lacks the `project` scope by default; GitHub Projects (`gh project …`) needs an interactive `gh auth refresh -h github.com -s project`, which an agent can't do itself. Task capture is driven by the `task-board` skill; board items in Ready feed `spec-creator`.
- 2026-09-18: `gh` has no command to rename/replace a Project's Status options — use GraphQL `updateProjectV2Field(input:{fieldId, singleSelectOptions:[…]})` (done for project 1). It REPLACES the whole option set, so option ids change: re-read them via `gh project field-list` before any `item-edit`. `task-board` sets Status explicitly after `item-add` because `gh project item-add` itself doesn't take a status; whether a status-less item is hidden from board views was NOT verified.
## Recurring Errors & Fixes
## Session Notes
## Open Questions
