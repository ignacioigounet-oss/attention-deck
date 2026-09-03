import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/env";
import type { Database } from "../database.types";

/**
 * Server client bound to the request's auth cookies. Runs as the signed-in
 * user, so RLS applies. Use this for all user-facing route handlers.
 */
export async function createSupabaseServerClient() {
  // cookies() first: it opts the render into dynamic mode before env is read.
  const cookieStore = await cookies();
  const env = publicEnv();
  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are read-only there; middleware refreshes sessions.
        }
      },
    },
  });
}
