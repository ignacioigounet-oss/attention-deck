# ATTENTION DECK — BUILD CONTRACT

Build ATTENTION DECK as a personal voice-first Chief of Staff focused on sustained attention and meaningful project continuity.

Before coding, read all docs in this repository.

## NON-NEGOTIABLE PRODUCT MODEL

VALUES → PRINCIPLES → STRATEGIES → INTERVENTIONS → OUTCOMES → LEARNING

Core engines:
ATTENTION
BEHAVIOR
ACTIVATION
CONTINUITY
MEMORY
CALENDAR
REFLECTION

Projects are central.
Maximum 3 active projects.
Maximum 1 Primary Project.
Ideas do not consume active project capacity.

## SCIENCE

Evidence-informed only.
No ADHD diagnosis/treatment claims.
No simplistic dopamine explanations.
Use organizational, planning, problem-solving, implementation-intention and autonomy/competence principles appropriately.
Behavior engines must be testable independently from the LLM.

## ACTIVATION

A short focus timer may exist.
It is a generic execution tool.
“Ugly Start” is NOT a UI feature or mode.
It is one possible behavioral strategy: lowering initial quality demands to reduce start friction.

## CALENDAR

Google Calendar is the source of truth for time.
ATTENTION DECK is source of truth for projects, decisions, habits, attention and learning.
Implement OAuth, availability, create/update/delete, audit and protected focus blocks.
All privileged operations are server-side.

## AI

Production runtime:
OpenAI.
Development tool:
Fable 5.1.

Use `@openai/agents` and current supported APIs.
Voice: Realtime + browser WebRTC with ephemeral credentials.
Share business logic and tools between text and voice.

## ARCHITECTURE

Pure domain engines contain no Supabase or LLM imports.
Repositories abstract persistence.
Context Builder controls token budget and relevance.
Tools call server-side repositories/services.
Chief of Staff orchestrates language and tools.

## USER MODEL

V1 single-user.
Still include user ownership on domain entities.
Prepare for future multi-tenant expansion.

## UI

Retrofuturist functionalism:
Braun / Dieter Rams / 2001 / NASA 60s-70s / Japanese electronics / experimental editorial web.

Ivory base.
Graphite/black structure.
Orange action.
Amber process.
Green confirmation.
Functional skeuomorphism: knobs, sliders, switches, buttons, LEDs.
Pixel/CRT details only as microdetail.

No:
glassmorphism
purple AI gradients
cyberpunk
generic SaaS card grids
emoji
sparkles

Interface should feel:
“A personal computer from the future, designed in 1969.”

## DEVELOPMENT ORDER

Phase 0: inspect and report.
Phase 1: Foundation.
Phase 2: Projects / Tasks / Commitments / Ideas.
Phase 3: deterministic Attention Engine.
Phase 4: Behavior + Activation.
Phase 5: Habits.
Phase 6: Memory.
Phase 7: Google Calendar.
Phase 8: Chief of Staff.
Phase 9: Realtime voice.
Phase 10: Daily / Weekly loop.
Phase 11: visual refinement.
Phase 12: hardening.

A minimal shell UI can exist before final visual styling so the engines can be tested through real state.

## EVERY PHASE

At completion:
- run tests;
- run typecheck;
- run lint;
- run build;
- list files changed;
- explain decisions;
- list open risks;
- do not silently begin the next phase.
