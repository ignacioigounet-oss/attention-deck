import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Session } from "@/application/context";

/**
 * Resolves the session from a Supabase client. `getUser()` validates the JWT
 * against the auth server, unlike `getSession()`, which trusts the cookie.
 */
export async function sessionFromSupabase(client: SupabaseClient): Promise<Session | null> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return { userId: data.user.id, email: data.user.email ?? null };
}
