# Insights

Append-only. Managed by the `engineering-insights` skill. Add only substantive, non-obvious learnings.

## What Works
## What Doesn't Work
- 2026-09-18: The initial Fastify + Drizzle `server/` scaffold was dropped for Supabase before any code existed (ADR-001): with iOS → web → Android clients on one backend, a custom API would re-implement auth/storage/ops for no product value. The `shared/` runtime-neutrality note above still holds but now targets Hermes, browser, Deno (Edge Functions) and Node; "server (Node)" there means the old plan.
## Codebase Patterns
- `@tripplanner/shared` is a real pnpm workspace package (`shared/`), not a vendored copy per consumer as in dev-digest — mobile (Hermes) and server (Node) import the same Zod schemas, so there is no hand-sync step and no drift to police; this is why `shared/` must stay runtime-neutral (`shared/AGENTS.md`).
## Tool & Library Notes
- 2026-09-18: This machine has two `gh` logins (github.com personal + github.ibm.com work), both "active" — always pass `--repo bagriy-andrey/trip-planner` / `--owner bagriy-andrey` so commands hit github.com. The github.com token lacks the `project` scope by default; GitHub Projects (`gh project …`) needs an interactive `gh auth refresh -h github.com -s project`, which an agent can't do itself. Task capture is driven by the `task-board` skill; board items in Ready feed `spec-creator`.
- 2026-09-18: `gh` has no command to rename/replace a Project's Status options — use GraphQL `updateProjectV2Field(input:{fieldId, singleSelectOptions:[…]})` (done for project 1). It REPLACES the whole option set, so option ids change: re-read them via `gh project field-list` before any `item-edit`. `task-board` sets Status explicitly after `item-add` because `gh project item-add` itself doesn't take a status; whether a status-less item is hidden from board views was NOT verified.
- 2026-09-18: The design canvas `ideas/Travel Tracker — вариант A.html` is a nested bundle: a `<script type="__bundler/manifest">` of base64+gzip assets and a `__bundler/template` (JSON string); each of the 11 screens is itself such a bundle. To read screen text/markup, decode manifest entries (gunzip) recursively — plain text extraction of the outer HTML only yields "Loading…". Sample data in mockups (dates, names) is placeholder.
- 2026-09-18: The Claude-in-Chrome extension refused to open the design canvas via both `file://` and a temporary `python3 -m http.server` on 127.0.0.1 ("Can't interact with browser-internal or unparseable URLs") — don't retry; design review is text/markup-only unless the user opens it themselves. `spec-creator` has no Bash, so the decoded design digest (screens, tokens, mockup defects) must be passed to it inline in the prompt; it cannot decode the HTML canvas itself.
## Recurring Errors & Fixes
- 2026-09-18: New files can show up already staged (`A` in `git status`) before any `git add` by the agent — seen with `ideas/`; cause not verified (possibly the JetBrains IDE auto-adding). The repo is PUBLIC, so before every commit run `git status` and unstage anything the user hasn't approved for publication (`git restore --staged <path>`); don't rely on `git add -A -- . ':!path'` alone to keep a path out.
## Session Notes
## Open Questions
