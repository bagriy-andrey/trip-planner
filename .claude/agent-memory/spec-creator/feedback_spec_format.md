---
name: feedback-spec-format
description: How the owner wants TripPlanner specs written — Russian, SPEC-05 shape, non-blocking open questions with defaults, "Что заменяется" table
metadata:
  type: feedback
---

Specs are written in Russian following the shape of `specs/SPEC-05-hotels.md`: EARS AC with Verify hints,
edge cases, contracts, a "Что заменяется" section (old AGENTS.md/design/spec wording → proposed new wording),
"Документы, которые нужно обновить" (spec never edits AGENTS.md or design files itself), and a short
"Открытые вопросы" list where every item carries a recommended default and does NOT block drafting.

**Why:** the owner (and the orchestrating agent) pre-decide the big product questions in the prompt
("OWNER DECISIONS (fixed, don't re-ask)") and want the spec finished in one pass, not a stop-and-ask round.

**How to apply:** when the prompt lists fixed decisions, don't re-ask them; resolve everything else from code
and docs, record real code-vs-spec drift explicitly (e.g. SPEC-04 AC-38 vs `firstSegmentPrefill`), and only
leave owner-level choices as defaulted open questions.
