# Agents

Custom subagents for TripPlanner, adapted from the DevDigest multi-agent system
(github.com/bagriy-andrey/dev-digest) for a mobile product: Expo/React Native app
(`mobile/`) + Fastify API (`server/`) + shared Zod contracts (`shared/`) + Maestro e2e (`e2e/`).
Canonical location is `.claude/agents/` — one Markdown file per agent (YAML frontmatter +
system prompt), checked into version control.

## Catalog

| Agent | Description | Tools |
|-------|--------------|-------|
| [researcher](researcher.md) | Read-only research agent — codebase and/or web, cited findings. Never modifies anything. | `Read, Grep, Glob, WebSearch, WebFetch` |
| [spec-creator](spec-creator.md) | Writes `SPEC-NN-<slug>.md` (Problem/Goals/EARS acceptance criteria/Edge cases/Mobile considerations/Contracts). Never writes code or plans. Mobile additions: `Platforms:` line, offline behavior, permissions, App Store impact. | `Read, Grep, Glob, Write, Edit, Agent` (`disallowedTools: Bash`) |
| [implementation-planner](implementation-planner.md) | Turns a spec into a file-by-file plan with non-overlapping steps, order shared → server → mobile, platform scope per mobile step. Writes only the plan. | `Read, Grep, Glob, Bash, Write` |
| [implementer](implementer.md) | Implements ONE plan step (mobile / server / shared) in an isolated worktree; launched in parallel per non-overlapping step. | `Read, Write, Edit, Bash, Grep, Glob` |
| [test-writer](test-writer.md) | Tests for existing code: Jest + RNTL (mobile), vitest (+ testcontainers) (server/shared), Maestro (e2e). Runs what it writes. | `Read, Write, Edit, Bash, Grep, Glob` |
| [architecture-reviewer](architecture-reviewer.md) | Read-only. Onion layering (server), mobile placement + iOS/Android parity, shared-contract integrity, package boundaries. CRITICAL/WARNING/INFO + BLOCKED/PASS. | `Read, Grep, Glob, Bash` (`disallowedTools: Write, Edit`) |
| [plan-verifier](plan-verifier.md) | Read-only. Checks every plan step / test criterion / DoD item against the real git diff and by running the declared commands. | `Read, Grep, Glob, Bash` (`disallowedTools: Write, Edit`) |
| [doc-writer](doc-writer.md) | Human-readable docs in `docs/features/` (implemented code / plan-to-docs / arbitrary material). | `Read, Grep, Glob, Bash, Write` |
| [release-manager](release-manager.md) | **New for mobile.** App Store / Play readiness audit (permissions, privacy manifest, account rules, EAS config, versioning) + store copy drafts in `docs/release/`. Writes no app code. | `Read, Grep, Glob, Bash, Write` |

## Recommended pipeline order

```
1. spec-creator            → SPEC-NN-*.md (user reviews/approves)
2. implementation-planner  → Implementation Plan (asks multi-agent vs single-agent)
3. /sdd-build <plan>       → implementer(s), parallel per non-overlapping step
4. plan-verifier (pass 1)  → in parallel with architecture-reviewer
5. test-writer             → targeted at gaps plan-verifier found (disabled inside sdd-build for cost; run manually)
6. plan-verifier (pass 2)  → final confirmation
7. /pr-self-review         → final manual gate before opening a PR
8. release-manager         → before each TestFlight / App Store submission
```

Why `plan-verifier` runs before `test-writer`: it checks the plan's own declared test criteria
against the real diff, so it is the cheapest gate and gives `test-writer` a precise gap list;
`architecture-reviewer` is independent of tests and can run in parallel with it.

## Agents vs Skills

An **agent** is a subagent with its own context window, invoked via the Agent
tool for a self-contained job (research, planning, implementing). A **skill**
is reference/procedural knowledge loaded into whichever agent is already
running (see `.claude/skills/README.md`). Agents use skills, not the other
way around — e.g. `planner` and `implementer` both apply `onion-architecture`,
`mobile-architecture`, and the rest of the skill catalog depending on what
they're working on.

## Design basis

The plan-then-execute pair (`implementation-planner` + `implementer`), read-only reviewers
(`disallowedTools: Write, Edit` as defense-in-depth), non-overlapping file lists as the parallel-safety
mechanism, and the "no over-mocking / no tautological assertions / no self-deception" rules for
`test-writer` are carried over unchanged from DevDigest, where they were researched against the Claude Code
subagent docs, GitHub spec-kit, and plan-and-execute literature (see that repo's `.claude/agents/README.md`
for the full source table). Changes for TripPlanner:

- Package set is `mobile/ server/ shared/ e2e/`; skill-routing tables in `implementation-planner`,
  `implementer`, `pr-self-review` and `architecture-reviewer` share one bucket classification.
- `shared/` is a real pnpm workspace package, so DevDigest's "vendored copy drift" check became a
  "contract duplicated instead of imported from `@tripplanner/shared`" check.
- Added the platform-parity rule (iOS first, Android later) to specs, plans and the architecture review.
- Added `release-manager` and the `mobile-release` skill; dropped DevDigest's product-review-agent prompts.
