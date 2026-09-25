# Insights

Append-only. Managed by the `engineering-insights` skill. Add only substantive, non-obvious learnings.

## What Works
## What Doesn't Work
- 2026-09-18: The initial Fastify + Drizzle `server/` scaffold was dropped for Supabase before any code existed (ADR-001): with iOS → web → Android clients on one backend, a custom API would re-implement auth/storage/ops for no product value. The `shared/` runtime-neutrality note above still holds but now targets Hermes, browser, Deno (Edge Functions) and Node; "server (Node)" there means the old plan.
## Codebase Patterns
- `@tripplanner/shared` is a real pnpm workspace package (`shared/`), not a vendored copy per consumer as in dev-digest — mobile (Hermes) and server (Node) import the same Zod schemas, so there is no hand-sync step and no drift to police; this is why `shared/` must stay runtime-neutral (`shared/AGENTS.md`).
- 2026-09-20: `design/` (README, `theme.ts`, `screens/*.md`) is a second, unconnected source of style truth: nothing imports it, it was untracked in git, and `mobile/src/lib/theme/` already ships its own tokens under different names (`background/glass/glassBorder/textMuted/pill` vs `bg/surface/surfaceBorder/textSecondary/divider`), other values (`onAccent`, light `textMuted`, `pill`≠`divider`, spacing scale 4–32 vs `screenX 20`), other type scale (32/20/16/13 vs 26/17/15/13) and a Manrope 600 weight the design lacks. Its `useTheme()` follows the system scheme only, so it can't replace the app's `ThemeProvider` — adopt `getTheme()`/constants, keep the provider. Its specs also require sizes `theme.ts` has no token for (28/32/24 headings, avatars 38/56, 28 "+", 36×4 sheet handle, 104 sheet offset); add them there first or screens fall back to literals. The rules (no emoji, mono only for ticket data, 44pt touch) live in `design/README.md`/`theme.ts`, not in `CLAUDE.md`/`AGENTS.md`. Gap analysis: `mobile/` has no icon library, so `+ − ‹ … →` text glyphs stand in for icons, and every screen except the theme switch is a `PlaceholderField` stub.
  - 2026-09-20 correction: design kit v2 (commit 695fe1c) removed `design/theme.ts` — `mobile/src/lib/theme` is now the only theme, and `design/tokens.md` holds the canonical values/meaning it must match. The design rules now live in `AGENTS.md` between `<!-- design-kit:start/end -->` markers (re-importing a kit replaces that block, never appends a second one); v1 rules had landed in the wrong place (kit's CLAUDE.md, which never loaded — CLAUDE.md is only a `@AGENTS.md` stub). The theme-vs-design mismatches above are still to be reconciled by `design/PROMPT.md`.
## Tool & Library Notes
- 2026-09-18: This machine has two `gh` logins (github.com personal + github.ibm.com work), both "active" — always pass `--repo bagriy-andrey/trip-planner` / `--owner bagriy-andrey` so commands hit github.com. The github.com token lacks the `project` scope by default; GitHub Projects (`gh project …`) needs an interactive `gh auth refresh -h github.com -s project`, which an agent can't do itself. Task capture is driven by the `task-board` skill; board items in Ready feed `spec-creator`.
- 2026-09-18: `gh` has no command to rename/replace a Project's Status options — use GraphQL `updateProjectV2Field(input:{fieldId, singleSelectOptions:[…]})` (done for project 1). It REPLACES the whole option set, so option ids change: re-read them via `gh project field-list` before any `item-edit`. `task-board` sets Status explicitly after `item-add` because `gh project item-add` itself doesn't take a status; whether a status-less item is hidden from board views was NOT verified.
- 2026-09-18: The design canvas `ideas/Travel Tracker — вариант A.html` is a nested bundle: a `<script type="__bundler/manifest">` of base64+gzip assets and a `__bundler/template` (JSON string); each of the 11 screens is itself such a bundle. To read screen text/markup, decode manifest entries (gunzip) recursively — plain text extraction of the outer HTML only yields "Loading…". Sample data in mockups (dates, names) is placeholder.
- 2026-09-18: The Claude-in-Chrome extension refused to open the design canvas via both `file://` and a temporary `python3 -m http.server` on 127.0.0.1 ("Can't interact with browser-internal or unparseable URLs") — don't retry; design review is text/markup-only unless the user opens it themselves. `spec-creator` has no Bash, so the decoded design digest (screens, tokens, mockup defects) must be passed to it inline in the prompt; it cannot decode the HTML canvas itself.
## Recurring Errors & Fixes
- 2026-09-18: New files can show up already staged (`A` in `git status`) before any `git add` by the agent — seen with `ideas/`; cause not verified (possibly the JetBrains IDE auto-adding). The repo is PUBLIC, so before every commit run `git status` and unstage anything the user hasn't approved for publication (`git restore --staged <path>`); don't rely on `git add -A -- . ':!path'` alone to keep a path out.
- 2026-09-25: an agent worktree can be cut from a stale `main`; before any step run `git merge --ff-only <integration-branch>` (e.g. `profile-about-me`) or the step's files will be missing.

## Session Notes
- 2026-09-19: A background subagent can die with an API error (here `implementation-planner`, HTTP 429 session limit) AFTER it already wrote its deliverable — the failure notice only showed "Now I have everything I need. Writing the plan." but `specs/plans/PLAN-01-app-skeleton.md` was complete on disk. Before re-running a failed agent, check the target file (size, section headers, e.g. all AC ids referenced); resuming via `SendMessage` is only needed if the file is missing or truncated.
- 2026-09-19: `/sdd-build` gotchas (PLAN-01, 12 steps): (1) `implementer` worktrees start from `main`, NOT the integration branch, so a later step silently lacks earlier tiers — tell each implementer to `git reset --hard <integration-branch>` (fresh worktree, nothing to lose) + `pnpm install` first. (2) An implementer can finish with everything uncommitted (Step 11) and the merge then has nothing to take: check `git status` in its worktree, commit only the declared files, then `git merge --no-ff`. (3) Implementers need explicit permission to append to their module's `insights.md`, else they skip it or edit it outside the declared file list. (4) The Stop hook re-fires every time the orchestrator ends a turn while a background agent runs, producing a loop of "still waiting" messages; there is no way to poll the agent, so wait for its completion notification.
- 2026-09-21: Same worktree issue seen again in PLAN-02 (`isolation: "worktree"` cuts from the default branch, so each implementer starts with `git merge <integration-branch>`), plus a side effect: worktrees live under `.claude/worktrees/`, which shows as untracked (`?? .claude/worktrees/`) in the main checkout's `git status` — never `git add -A` there (the repo is public); stage declared files by path.
- 2026-09-23: Across PLAN-04's 13 steps, at least three unrelated steps (6/7, 9, 10 — see
  `mobile/insights.md`) each independently hit the same shape of gap: an EARLIER step's declared
  file list covered the module it added (a hook directory, an i18n namespace) but not every leaf
  file a LATER step would need from it (a specific hook, specific screen-chrome locale keys), so the
  later step had to add the missing piece itself, outside its own step's original file list, by
  reasoning about "where the plan implies it belongs" rather than expanding scope silently. One
  occurrence is implementer error; three independent ones in one plan is a planning-granularity
  pattern: a step that "adds a hooks/ dir" or "adds an i18n namespace" for a feature spanning many
  steps should be read as owning that file for the WHOLE feature's later additions too, not just its
  own step's immediate needs — a future plan can make this explicit rather than relying on each
  later step to notice and fill the gap without permission to touch a file outside its own list.
- 2026-09-25: Claude Design sync for this React Native repo (project "TripPlanner", id pinned in
  `.design-sync/config.json`). `/design-sync` assumes a web `dist/` and has no RN path, so the
  working route is a hand-built tokens-only bundle: `node .design-sync/build.mjs` reads the theme
  from `mobile/src/lib/theme/{tokens,typography,metrics}.ts` (evaluating the `export const … = {…}`
  literals, so the theme stays the single source) plus `design/`, and writes gitignored `ds-bundle/`
  (`styles.css`, `tokens/*.css`, fonts, README = `.design-sync/conventions.md` + token index,
  `guidelines/`). Facts that aren't obvious: `DesignSync` needs a one-off `/design-login`, sees ONLY
  design-system projects (mockups made as Artifacts are not there — read them with `Artifact read`);
  `metrics.ts` imports `react-native`, so it can't be imported in Node, hence the literal extraction.
  Re-sync = rebuild + `write_files` under one `finalize_plan`; no `_ds_sync.json` is written.
- 2026-09-25: Reading Claude Design artifacts from the repo side: a plain `Artifact read` of a Design
  canvas returns only the type's instructions, NOT the screens — they live in `project/*.dc.html` +
  `project/canvas.json`, fetched with `list` `scope: "files"` then `read` with `paths`. An artifact that
  looks like a mockup can be a Claude Docs document (needs the Docs connector). The earlier mockups
  predate the current design rules (emoji, weight 600, gradients, text-glyph icons, raw hex), so the
  design-system project ships them as `guidelines/mockups/` with a "layout/flow only, not styling"
  README, and specs only as digests (`guidelines/specs/`, ACs stripped: 491 KB → 74 KB) so they fit a
  design agent's context. The mockup copy is a manual snapshot and goes stale (refresh steps in
  `.design-sync/NOTES.md`).
- 2026-09-25: Newer Claude Design handoffs live INSIDE the design-system project as
  `templates/<name>/HANDOFF.md` + `<Name>.dc.html` (uploaded via the Design UI, not by build.mjs), so
  `DesignSync list_files` + `get_file` (256 KiB cap) reads them directly. Do not assume the next free
  SPEC number from a handoff or the request: SPEC-06 was already taken by the profile spec when the
  car-rental one was asked for as "SPEC-06" (it became SPEC-07) — `ls specs/` first.
- 2026-09-25: A spec modelled on the previous one (SPEC-07 on SPEC-05) inherits its STALE rules: a
  hand-written draft cited SPEC-05 currency ACs that SPEC-06 had already replaced (AC-39/40/41), stored
  a per-record time zone copied from `trips.iana_timezone` (NULL for `country`/`custom` trips, so it
  would have blocked rentals there), and gave phone/amounts the mono font (AGENTS.md's mono list is
  only codes, dates, numbers, places, country/currency codes). Before reusing a sibling spec's rule,
  grep the LATER specs' "Что заменяется" and the current `mobile/insights.md`; an independent
  `spec-creator` pass caught these, so run it for any spec that copies from an older one.
- 2026-09-25: `DesignSync get_file` on a binary (the project's `uploads/*.png`) returns base64 truncated
  at 192 KB, spilled to a tool-results file, and the cut PNG is rejected by `Read`. Recover it: decode the
  JSON `content` with python, then Pillow with `ImageFile.LOAD_TRUNCATED_IMAGES = True` and crop to the last
  non-blank row (pip `--target` into the scratchpad; system python has no PIL). You get the top 58-90% of a
  tall screenshot, never the bottom, so say so instead of claiming a full read.
## Open Questions
