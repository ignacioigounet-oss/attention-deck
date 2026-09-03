/**
 * Local stand-in for the Supabase API surface the app uses, without Docker:
 *   /auth/v1/health, /auth/v1/user  -> minimal GoTrue emulation (validates HS256 JWTs)
 *   /rest/v1/*                      -> proxied to a PostgREST instance
 *
 * Manual runtime smoke test (see README "Without Docker"):
 *   npm run db:reset:local
 *   POSTGREST: PGRST_JWT_SECRET=$TEST_JWT_SECRET .tools/postgrest   (port 3939)
 *   tsx scripts/fake-supabase.ts                                     (port 3941)
 *   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3941 NEXT_PUBLIC_SUPABASE_ANON_KEY=test npm run build && npm start
 *   tsx scripts/fake-supabase.ts cookie <userId> <email>   -> prints a session cookie for curl/browser
 *
 * Never use in production. Signing in through /login is not emulated; only
 * an already-issued session cookie is, which is enough to exercise the
 * proxy -> app context -> repositories -> RLS path.
 */
import http from "node:http";
import { createHmac } from "node:crypto";

const SECRET = process.env.TEST_JWT_SECRET ?? "attention-deck-local-test-secret-at-least-32-chars";
const PORT = Number(process.env.FAKE_SUPABASE_PORT ?? 3941);
const POSTGREST_PORT = Number(process.env.POSTGREST_PORT ?? 3939);

const b64 = (s: string) => Buffer.from(s).toString("base64url");

export function mintJwt(claims: Record<string, unknown>): string {
  const h = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, ...claims }));
  return `${h}.${p}.${createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url")}`;
}

function verify(jwt: string): Record<string, unknown> | null {
  const [h, p, s] = jwt.split(".");
  if (!h || !p || !s) return null;
  const sig = createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url");
  return sig === s ? (JSON.parse(Buffer.from(p, "base64url").toString()) as Record<string, unknown>) : null;
}

/** Cookie value in the format @supabase/ssr stores sessions (project ref "127" for http://127.0.0.1). */
export function sessionCookie(userId: string, email: string): string {
  const access_token = mintJwt({ sub: userId, email, role: "authenticated", aud: "authenticated" });
  const session = {
    access_token,
    refresh_token: "local",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: userId, email },
  };
  return `sb-127-auth-token=base64-${b64(JSON.stringify(session))}`;
}

function serve(): void {
  http
    .createServer((req, res) => {
      const url = req.url ?? "/";
      if (url.startsWith("/auth/v1/health")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end('{"name":"GoTrue (fake)"}');
        return;
      }
      if (url.startsWith("/auth/v1/user")) {
        const token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
        const claims = token ? verify(token) : null;
        if (!claims) {
          res.writeHead(401, { "content-type": "application/json" });
          res.end('{"message":"invalid token"}');
          return;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            id: claims.sub,
            aud: "authenticated",
            role: "authenticated",
            email: claims.email ?? null,
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString(),
          }),
        );
        return;
      }
      const path = url.replace(/^\/rest\/v1/, "") || "/";
      const up = http.request(
        { host: "127.0.0.1", port: POSTGREST_PORT, path, method: req.method, headers: req.headers },
        (u) => {
          res.writeHead(u.statusCode ?? 502, u.headers);
          u.pipe(res);
        },
      );
      up.on("error", () => res.writeHead(502).end());
      req.pipe(up);
    })
    .listen(PORT, "127.0.0.1", () => {
      console.log(`fake supabase on http://127.0.0.1:${PORT} -> postgrest :${POSTGREST_PORT}`);
    });
}

const isMain = process.argv[1] && import.meta.filename === process.argv[1];
if (isMain) {
  if (process.argv[2] === "cookie") {
    const [, , , userId = "11111111-1111-1111-1111-111111111111", email = "ignacio@example.com"] =
      process.argv;
    console.log(sessionCookie(userId, email));
  } else {
    serve();
  }
}
