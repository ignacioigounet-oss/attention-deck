export const TEST_CONFIG = {
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/attention_deck",
  postgrestBin: process.env.POSTGREST_BIN ?? ".tools/postgrest",
  postgrestPort: Number(process.env.POSTGREST_PORT ?? 3939),
  /** Proxy that exposes PostgREST under /rest/v1 like Supabase does. */
  supabasePort: Number(process.env.TEST_SUPABASE_PORT ?? 3940),
  jwtSecret: process.env.TEST_JWT_SECRET ?? "attention-deck-local-test-secret-at-least-32-chars",
  skipDb: process.env.SKIP_DB_TESTS === "1",
  /** Seed user (supabase/seed.sql). */
  seedUserId: "11111111-1111-1111-1111-111111111111",
};

/** Base URL for supabase-js in tests (proxy in front of PostgREST). */
export const postgrestUrl = () => `http://127.0.0.1:${TEST_CONFIG.supabasePort}`;
