# IMPLEMENTATION PLAYBOOK FOR FABLE 5.1

## PHASE 0 — RECONNAISSANCE

Read the whole repository.
Do not code.
Report:
- product understanding;
- architecture;
- inconsistencies;
- dependencies;
- risks;
- Phase 1 plan.

STOP.

## PHASE 1 — FOUNDATION

Build:
- Next.js;
- TypeScript strict;
- Supabase;
- auth;
- SQL migrations;
- RLS;
- repositories;
- generated DB types;
- domain types;
- tests.

No LLM.
No voice.
No Calendar.

Acceptance:
migrations apply; RLS is verified; repository tests pass.

## PHASE 2 — PROJECT OS

Build:
- projects;
- tasks;
- commitments;
- ideas;
- Primary Project;
- active project limit = 3.

Acceptance:
state transitions and limits are tested.

## PHASE 3 — ATTENTION ENGINE

Build deterministic functions for:
- stagnation;
- overload;
- contradiction;
- repetition;
- deadline;
- priority.

Every decision should return evidence/reasons.

Acceptance:
“what deserves attention” can be computed without an LLM.

## PHASE 4 — BEHAVIOR + ACTIVATION

Build:
- friction taxonomy;
- behavioral observations;
- activation strategy selector;
- short generic focus timer;
- outcome logging.

No named “Ugly Start” feature.

Acceptance:
the system can propose a contextually appropriate small intervention and learn whether it helped.

## PHASE 5 — HABITS

Build:
- binary/frequency/duration/streak;
- logs;
- weekly continuity.

Initial habits:
training
writing
user-defined behavior tracking

## PHASE 6 — MEMORY

Build:
- decisions;
- observations;
- events;
- behavior history;
- retrieval;
- bounded Context Packet.

Acceptance:
old memory does not flood the LLM context.

## PHASE 7 — GOOGLE CALENDAR

Build:
- OAuth;
- availability;
- create/update/delete;
- calendar audit;
- sync/cache;
- audit log.

Acceptance:
the system can find real available time and protect the Primary Project.

## PHASE 8 — CHIEF OF STAFF

Connect:
- context;
- deterministic engines;
- tools;
- OpenAI runtime.

Acceptance:
natural language can query state and execute safe operations.

## PHASE 9 — REALTIME VOICE

Build:
- ephemeral credentials;
- WebRTC;
- RealtimeSession;
- voice states;
- shared server-side business actions.

Acceptance:
voice can execute the same meaningful flows as text.

## PHASE 10 — DAILY / WEEKLY LOOP

Build:
- morning directive;
- check-in;
- weekly review;
- monthly review;
- proactive threshold.

## PHASE 11 — VISUAL

Apply the design system after core behavior works.

## PHASE 12 — HARDENING

Tests.
Typecheck.
Lint.
Build.
RLS audit.
Secrets audit.
Error-path tests.
Tool confirmation tests.

## GATE

Never silently move to the next phase.
