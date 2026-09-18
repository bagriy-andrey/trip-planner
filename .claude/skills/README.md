# Skills

Reusable AI skills that provide specialized knowledge and workflows. Canonical location is `.claude/skills/`. Shared with the team via version control.

## Catalog

| Skill | Scope | Description |
|-------|-------|-------------|
| [expo-react-native](expo-react-native/SKILL.md) | Mobile | Expo/RN best practices: expo-router, performance, permissions, secure storage, notifications, maps |
| [mobile-architecture](mobile-architecture/SKILL.md) | Mobile | `mobile/` folder structure, feature modules, iOS-first/Android-ready platform-parity rule |
| [react-native-testing](react-native-testing/SKILL.md) | Mobile | Jest + jest-expo + RNTL, mocking native modules, Maestro e2e |
| [mobile-release](mobile-release/SKILL.md) | Mobile | EAS, TestFlight/App Store checklist (privacy manifest, permissions, account rules), Android path |
| [react-best-practices](react-best-practices/SKILL.md) | Mobile | React hooks/state anti-patterns (apply to RN; ignore web-only bits) |
| [fastify-best-practices](fastify-best-practices/SKILL.md) | Backend | Fastify routes, plugins, validation, error handling |
| [drizzle-orm-patterns](drizzle-orm-patterns/SKILL.md) | Backend | Drizzle schema, queries, relations, migrations |
| [postgresql-table-design](postgresql-table-design/SKILL.md) | Backend | Postgres schema design, types, indexing |
| [onion-architecture](onion-architecture/SKILL.md) | Backend | Layers, dependency rule, ports/adapters for `server/` |
| [zod](zod/SKILL.md) | Full-stack | Zod schemas for `shared/` contracts |
| [typescript-expert](typescript-expert/SKILL.md) | Full-stack | Type-level programming, tooling |
| [security](security/SKILL.md) | Full-stack | OWASP, auth, secrets, injection |
| [mermaid-diagram](mermaid-diagram/SKILL.md) | Shared | Mermaid diagrams |
| [engineering-insights](engineering-insights/SKILL.md) | Meta | Per-module `insights.md` capture loop |
| [pr-self-review](pr-self-review/SKILL.md) | Meta | Pre-PR gate; blocks on CRITICAL |
| [sdd-build](sdd-build/SKILL.md) | Meta | Builds an approved plan: implementers → verify → bounded architecture fix-loop |
| [task-board](task-board/SKILL.md) | Meta | Capture/manage tasks on the GitHub Projects board via `gh` (`запиши задачу: …`) |
| [workflow-retro](workflow-retro/SKILL.md) | Meta | Retrospective over a multi-agent run (`/workflow-retro`) |

## What Are Skills?

Skills are modular packages that extend the AI agent with specialized knowledge and workflows. Unlike rules (always applied) or agents (invoked for specific tasks), skills are loaded on-demand when the agent determines they're relevant.

### Skills vs Rules vs Commands vs Agents

| Type | Scope | Loaded | Purpose |
|------|-------|--------|---------|
| **Rules** (`.mdc`) | Project conventions | Always or by file pattern | Persistent guardrails |
| **Commands** (`.md`) | User actions | On `/command` invocation | Slash commands |
| **Skills** (`.md`) | Domain knowledge | On-demand by agent | Specialized knowledge |
| **Agents** (`.md`) | Workflows | Via Task tool | Subagent orchestration |

## Creating New Skills

Each skill has:

- `SKILL.md` — Main skill file with rules and conventions (required)
- `examples.md` — Code examples showing good/bad patterns (recommended)
- `references.md` — Sources and rationale (optional)
