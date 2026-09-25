---
name: project-plan-conventions
description: Where and how TripPlanner implementation plans are written (path, language, structure) — PLAN-01..05 precedent
metadata:
  type: project
---

Plans live at `specs/plans/PLAN-NN-<slug>.md` (NOT `<module>/specs/`), written in Russian, mirroring
PLAN-04's structure: §0 existing-state table, §1 per-module breakdown, §2 deps, §3 tiers + steps with
"Владеет файлами / НЕ делать / Критерии готовности", §4 DoD + manual checklist M1.. + AC trace table
+ stop-list, §5 assumptions/risks/N-discrepancies/Q-questions with defaults. The spec header already
names the plan path (`Implementation Plan: specs/plans/PLAN-NN-…`).

**Why:** consistent with PLAN-01..04 that `/sdd-build` consumes; the owner reads Russian.
**How to apply:** default execution mode "single-agent по порядку, тир 1 параллелим — вопрос владельцу"
(planner runs as a subagent and can't ask interactively). Pin cross-step contracts (error-id list ↔
i18n keys) in the plan itself, and give the step that creates a namespace/hooks dir ownership of ALL
its later leaf needs (root insights.md 2026-09-23 lesson). PLAN-06 added two more ordering
rules worth reusing: a `shared` contract change goes in the SAME step as its mobile consumer (else
tests go red between steps), and an i18n key is deleted by the step that deletes its last consumer
(typed i18n breaks typecheck otherwise).
