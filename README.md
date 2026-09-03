# ATTENTION DECK

Personal instrument for directing attention and sustaining meaningful projects.
Read `AGENTS.md` first, then the specification package in `docs/`.

## Specification (read in this order)

1. `docs/00_PRODUCT_VISION.md`
2. `docs/10_CODEX_BUILD_PROMPT.md`
3. `docs/12_PRODUCT_BEHAVIOR.md`
4. `docs/13_EVIDENCE_FRAMEWORK.md`
5. `docs/14_CALENDAR_SPEC.md`
6. `docs/18_ENGINE_SPEC.md` — operational contract for engines, schema corrections, Phase 1 and acceptance tests
7. `docs/16_IMPLEMENTATION_PLAYBOOK.md`
8. `docs/17_FABLE_5_1_PROMPTS.md`

Supporting documents: `01_DATABASE_SCHEMA.sql` (original draft; the canonical schema is `supabase/migrations/`),
`02_TYPES.ts`, `03_TOOL_DEFINITIONS.ts`, `04_CHIEF_OF_STAFF_PROMPT.md`, `05_SPECIALIST_PROMPTS.md`,
`06_CONTEXT_BUILDER.md`, `07_API_CONTRACTS.md`, `11_DESIGN_SYSTEM_V1.md`, `16_STEP_BY_STEP.md`.
The canonical environment file is `.env.example` (supersedes `docs/08_ENV_EXAMPLE.md`).

Core engines: ATTENTION / BEHAVIOR / ACTIVATION / CONTINUITY / MEMORY / CALENDAR / REFLECTION.
"Ugly Start" is a strategy in the behavioral framework, not a UI feature.

## Status

Phase 1 (Foundation) and Phase 2 (application shell) complete: Next.js App Router, Supabase Auth
session plumbing, protected `/app` boundary, user bootstrap, dependency wiring over the Phase 1
repositories, and a minimal read-only project overview. No engines, LLM, calendar or final UI yet.

## Layout

```
docs/                     specification package
supabase/migrations/      canonical schema (0001 init, 0002 RLS, 0003 functions/triggers)
supabase/seed.sql         local development seed
supabase/test/            auth-schema shim for plain PostgreSQL (tests only)
src/domain/               pure domain: types, policies, errors (no persistence / LLM imports)
src/data/repositories/    repository contracts
src/data/supabase/        Supabase implementation, generated DB types, clients
src/data/memory/          in-memory implementation (tests)
src/application/          framework-agnostic application layer (context, container, bootstrap, queries)
src/auth/                 route access policy (pure) and auth server actions
src/server/               Next.js adapters (session, per-request AppContext)
src/proxy.ts              edge proxy: session refresh + protected boundary
src/app/                  Next.js App Router: /login, /app, /app/projects, /api/health, /api/app/me
src/ui/                   presentation helpers
tests/                    acceptance tests (docs/18 §9)
scripts/                  local DB helpers
```

## Development

```
npm install
cp .env.example .env
npm run db:reset          # Supabase CLI (requires Docker): migrations + seed
npm run db:types          # regenerate src/data/supabase/database.types.ts
npm run check             # typecheck + lint + test + build
```

### Without Docker

The migrations, RLS and repositories can be validated against a plain PostgreSQL (16+) instance:

```
export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/attention_deck
npm run db:reset:local    # applies supabase/test/auth_shim.sql + migrations + seed
npm run db:types:local    # same generator as the Supabase CLI, no Docker
npm test                  # starts PostgREST from .tools/postgrest (see below)
```

The test-suite runs the Supabase repositories through the real `supabase-js` client against a
PostgREST binary, with JWTs minted for two users so RLS is exercised. Download a static PostgREST
build from https://github.com/PostgREST/postgrest/releases into `.tools/postgrest` (or set
`POSTGREST_BIN`). Set `SKIP_DB_TESTS=1` to run only the in-memory and unit tests.

### Authenticated runtime smoke test without Docker

`scripts/fake-supabase.ts` emulates the two GoTrue endpoints the app needs and proxies `/rest/v1`
to PostgREST, so the full path (cookie → proxy → AppContext → repositories → RLS) can be checked
against real data:

```
npm run db:reset:local
PGRST_DB_URI=postgresql://authenticator:authenticator@127.0.0.1:5432/attention_deck \
PGRST_DB_SCHEMAS=public PGRST_DB_ANON_ROLE=anon PGRST_SERVER_PORT=3939 \
PGRST_JWT_SECRET=attention-deck-local-test-secret-at-least-32-chars .tools/postgrest &
npx tsx scripts/fake-supabase.ts &
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3941 NEXT_PUBLIC_SUPABASE_ANON_KEY=test npm run build
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3941 NEXT_PUBLIC_SUPABASE_ANON_KEY=test npm start &
curl -b "$(npx tsx scripts/fake-supabase.ts cookie)" http://localhost:3000/api/app/me
```
