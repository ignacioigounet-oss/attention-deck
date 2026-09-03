import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createContainer } from "@/application/container";
import type { AppContext } from "@/application/context";
import { createSupabaseRepositories } from "@/data/supabase/repositories";
import { createSupabaseServerClient } from "@/data/supabase/clients/server";
import { LOGIN_PATH } from "@/auth/access";
import { sessionFromSupabase } from "./session";

/**
 * Next.js adapter for the application container. One AppContext per request
 * (React `cache` dedupes across layout/page/route handler in the same render).
 * Repositories run through the cookie-bound client, so RLS applies.
 */
export const getAppContext = cache(async (): Promise<AppContext | null> => {
  const client = await createSupabaseServerClient();
  const container = createContainer({
    getSession: () => sessionFromSupabase(client),
    createRepositories: () => createSupabaseRepositories(client),
  });
  return container.getAppContext();
});

/** For protected server components and handlers: redirects to /login when signed out. */
export async function requireAppContext(): Promise<AppContext> {
  const ctx = await getAppContext();
  if (!ctx) redirect(LOGIN_PATH);
  return ctx;
}
