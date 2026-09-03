/**
 * Local database helper for plain PostgreSQL (no Docker / no Supabase stack).
 *
 *   tsx scripts/db-local.ts reset   -> drop + create DB, apply auth shim, migrations, seed
 *
 * The real Supabase flow is `supabase db reset`. This script exists so the
 * migrations can be validated and tested anywhere PostgreSQL runs.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const ROOT = join(import.meta.dirname, "..");

export const LOCAL_DB_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/attention_deck";

function adminUrl(dbUrl: string): { admin: string; dbName: string } {
  const u = new URL(dbUrl);
  const dbName = u.pathname.replace(/^\//, "");
  u.pathname = "/postgres";
  return { admin: u.toString(), dbName };
}

export function migrationFiles(): string[] {
  const dir = join(ROOT, "supabase", "migrations");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => join(dir, f));
}

export async function resetLocalDatabase(dbUrl = LOCAL_DB_URL, opts: { seed?: boolean } = {}): Promise<void> {
  const { admin, dbName } = adminUrl(dbUrl);
  const a = new pg.Client({ connectionString: admin });
  await a.connect();
  try {
    await a.query(
      `select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()`,
      [dbName],
    );
    await a.query(`drop database if exists "${dbName}"`);
    await a.query(`create database "${dbName}"`);
  } finally {
    await a.end();
  }

  const c = new pg.Client({ connectionString: dbUrl });
  await c.connect();
  try {
    await c.query(readFileSync(join(ROOT, "supabase", "test", "auth_shim.sql"), "utf8"));
    for (const file of migrationFiles()) {
      await c.query(readFileSync(file, "utf8"));
    }
    if (opts.seed ?? true) {
      await c.query(readFileSync(join(ROOT, "supabase", "seed.sql"), "utf8"));
    }
  } finally {
    await c.end();
  }
}

const isMain = process.argv[1] && import.meta.filename === process.argv[1];
if (isMain) {
  const cmd = process.argv[2];
  if (cmd === "reset") {
    resetLocalDatabase(LOCAL_DB_URL, { seed: !process.argv.includes("--no-seed") })
      .then(() => {
        console.log(`database reset: ${LOCAL_DB_URL}`);
      })
      .catch((err: unknown) => {
        console.error(err);
        process.exit(1);
      });
  } else {
    console.error("usage: tsx scripts/db-local.ts reset [--no-seed]");
    process.exit(2);
  }
}
