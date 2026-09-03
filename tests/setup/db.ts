import { createHmac, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import pg from "pg";
import type { Database } from "@/data/supabase/database.types";
import { TEST_CONFIG, postgrestUrl } from "./config";

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

/** Mints an HS256 JWT the way Supabase Auth would (role + sub). */
export function mintJwt(claims: Record<string, unknown>): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({ iss: "supabase-test", exp: Math.floor(Date.now() / 1000) + 3600, ...claims }),
  );
  const sig = createHmac("sha256", TEST_CONFIG.jwtSecret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

export type TypedClient = SupabaseClient<Database>;

export function clientForUser(userId: string): TypedClient {
  const jwt = mintJwt({ role: "authenticated", sub: userId, aud: "authenticated" });
  return createClient<Database>(postgrestUrl(), jwt, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

export function serviceClient(): TypedClient {
  const jwt = mintJwt({ role: "service_role" });
  return createClient<Database>(postgrestUrl(), jwt, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

let pool: pg.Pool | undefined;
export function sql(): pg.Pool {
  pool ??= new pg.Pool({ connectionString: TEST_CONFIG.databaseUrl, max: 4 });
  return pool;
}

export async function closeSql(): Promise<void> {
  await pool?.end();
  pool = undefined;
}

/** Inserts into auth.users (shim); the trigger creates public.users. */
export async function createAuthUser(
  email = `${randomUUID()}@test.local`,
  displayName?: string,
): Promise<string> {
  const id = randomUUID();
  await sql().query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
    id,
    email,
    displayName ? { display_name: displayName } : {},
  ]);
  return id;
}

export const PUBLIC_TABLES = [
  "areas",
  "projects",
  "tasks",
  "commitments",
  "commitment_logs",
  "ideas",
  "decisions",
  "observations",
  "memory_events",
  "habits",
  "habit_logs",
  "attention_items",
  "attention_snapshots",
  "activations",
  "behavior_observations",
  "conversations",
  "calendar_connections",
  "calendar_events_cache",
  "audit_log",
  "checkins",
  "reviews",
] as const;

/** Deletes all rows owned by the given users (keeps the users themselves). */
export async function wipeUsersData(userIds: string[]): Promise<void> {
  for (const t of PUBLIC_TABLES) {
    await sql().query(`delete from ${t} where user_id = any($1::uuid[])`, [userIds]);
  }
}

/** Runs a query as an authenticated user via `set role` + JWT claim GUC (RLS applies). */
export async function queryAs<T extends pg.QueryResultRow = pg.QueryResultRow>(
  userId: string | null,
  text: string,
  params: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  const client = await sql().connect();
  try {
    await client.query("begin");
    if (userId) {
      await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
      await client.query(`select set_config('request.jwt.claim.role', 'authenticated', true)`);
      await client.query("set local role authenticated");
    }
    const res = await client.query<T>(text, params);
    await client.query("commit");
    return res;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}
