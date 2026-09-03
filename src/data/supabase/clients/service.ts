import "server-only";

import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/env";
import type { Database } from "../database.types";

/**
 * Service-role client. Bypasses RLS. Only for background jobs (cron, sync)
 * that run without a user session. Never expose to the browser, never use in
 * user-facing handlers.
 */
export function createSupabaseServiceClient() {
  const env = serverEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
