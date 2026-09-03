
# FABLE 5.1 — COPY / PASTE PROMPTS

## PROMPT 1 — ANALYSIS

You are the lead engineer for ATTENTION DECK.

Read every document in the repository, especially:
00_PRODUCT_VISION.md
01_DATABASE_SCHEMA.sql
02_TYPES.ts
03_TOOL_DEFINITIONS.ts
04_CHIEF_OF_STAFF_PROMPT.md
06_CONTEXT_BUILDER.md
07_API_CONTRACTS.md
10_CODEX_BUILD_PROMPT.md
11_DESIGN_SYSTEM_V1.md
12_PRODUCT_BEHAVIOR.md
13_EVIDENCE_FRAMEWORK.md
14_CALENDAR_SPEC.md
16_IMPLEMENTATION_PLAYBOOK.md

Do not code.

Inspect the repository and return:
1. understanding;
2. architecture;
3. missing/ambiguous decisions;
4. proposed file structure;
5. dependencies;
6. risks;
7. Phase 1 plan.

Do not invent features.
STOP after the report.

## PROMPT 2 — PHASE 1

Implement only Phase 1 of 16_IMPLEMENTATION_PLAYBOOK.md.

Do not implement later phases.

Run:
tests
typecheck
lint
build

Report files changed and open risks.
STOP.

## PROMPT 3 — REVIEW GATE

Do not code.

Compare the current repository with the product and implementation docs.
Identify:
- specification drift;
- technical debt;
- behavior mismatches;
- security issues;
- whether the next phase is safe.

STOP.

## PROMPT 4 — PHASE N

Implement only Phase N.

Preserve existing behavior.
Do not refactor unrelated areas.
Do not add dependencies unless justified.
Update tests.

At completion:
tests
typecheck
lint
build
report.
STOP.

## PROMPT 5 — VISUAL

Implement the design system from 11_DESIGN_SYSTEM_V1.md.

The product should feel:
“A personal computer from the future, designed in 1969.”

Avoid generic AI/SaaS aesthetics.
