/**
 * Vitest global setup: resets the local PostgreSQL database (auth shim +
 * migrations + seed) and starts a PostgREST instance so the Supabase
 * repositories are exercised through the real supabase-js client with RLS.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import http from "node:http";
import { join } from "node:path";
import pg from "pg";
import { resetLocalDatabase } from "../../scripts/db-local";
import { TEST_CONFIG } from "./config";

let postgrest: ChildProcess | undefined;
let proxy: http.Server | undefined;

/**
 * supabase-js talks to `${url}/rest/v1/...`; a bare PostgREST serves at `/`.
 * This proxy strips the prefix so the real client can be used unchanged.
 */
function startProxy(fromPort: number, toPort: number): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const path = (req.url ?? "/").replace(/^\/rest\/v1/, "") || "/";
      const upstream = http.request(
        { host: "127.0.0.1", port: toPort, path, method: req.method, headers: req.headers },
        (up) => {
          res.writeHead(up.statusCode ?? 502, up.headers);
          up.pipe(res);
        },
      );
      upstream.on("error", () => {
        res.writeHead(502).end();
      });
      req.pipe(upstream);
    });
    server.listen(fromPort, "127.0.0.1", () => resolve(server));
  });
}

async function waitForPostgrest(timeoutMs = 20_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${TEST_CONFIG.postgrestPort}/`, { method: "GET" });
      if (res.ok || res.status === 401 || res.status === 404) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("PostgREST did not start in time");
}

export async function setup(): Promise<void> {
  if (TEST_CONFIG.skipDb) return;

  await resetLocalDatabase(TEST_CONFIG.databaseUrl, { seed: true });

  // authenticator login is created by the auth shim; PostgREST connects as it.
  const c = new pg.Client({ connectionString: TEST_CONFIG.databaseUrl });
  await c.connect();
  await c.query(`alter role authenticator with password 'authenticator'`);
  await c.end();

  const bin = join(process.cwd(), TEST_CONFIG.postgrestBin);
  if (!existsSync(bin)) {
    throw new Error(
      `PostgREST binary not found at ${bin}. Download a static build from https://github.com/PostgREST/postgrest/releases into .tools/postgrest or set POSTGREST_BIN. Set SKIP_DB_TESTS=1 to skip database tests.`,
    );
  }
  const u = new URL(TEST_CONFIG.databaseUrl);
  const dbUri = `postgresql://authenticator:authenticator@${u.hostname}:${u.port || 5432}${u.pathname}`;
  postgrest = spawn(bin, [], {
    env: {
      ...process.env,
      PGRST_DB_URI: dbUri,
      PGRST_DB_SCHEMAS: "public",
      PGRST_DB_ANON_ROLE: "anon",
      PGRST_JWT_SECRET: TEST_CONFIG.jwtSecret,
      PGRST_SERVER_PORT: String(TEST_CONFIG.postgrestPort),
      PGRST_SERVER_HOST: "127.0.0.1",
      PGRST_DB_POOL: "4",
      PGRST_LOG_LEVEL: "error",
    },
    stdio: "ignore",
  });
  await waitForPostgrest();
  proxy = await startProxy(TEST_CONFIG.supabasePort, TEST_CONFIG.postgrestPort);
}

export async function teardown(): Promise<void> {
  proxy?.close();
  postgrest?.kill("SIGTERM");
}
