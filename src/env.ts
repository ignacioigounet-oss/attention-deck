import { z } from "zod";

const PublicEnv = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const ServerEnv = PublicEnv.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  APP_URL: z.url().default("http://localhost:3000"),
});

/** Public (browser-safe) variables. Evaluated lazily so builds and tests never require them. */
export function publicEnv() {
  return PublicEnv.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

/** Server-only variables. Never import from client components. */
export function serverEnv() {
  return ServerEnv.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    APP_URL: process.env.APP_URL,
  });
}
