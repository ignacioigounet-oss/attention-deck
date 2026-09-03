"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/env";
import type { Database } from "../database.types";

/** Browser client: anon key + user session. Subject to RLS. Never holds secrets. */
export function createSupabaseBrowserClient() {
  const env = publicEnv();
  return createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
