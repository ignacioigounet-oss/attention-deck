import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { decideAccess } from "@/auth/access";

/**
 * Edge proxy (Next 16 name for middleware):
 * 1. refreshes the Supabase session cookie on every matched request;
 * 2. applies the pure route access policy from src/auth/access.ts.
 * Only a signed-in check happens here; the app context is built server-side.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let signedIn = false;
  if (url && anonKey) {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  }

  const decision = decideAccess(request.nextUrl.pathname, signedIn);
  if (decision.kind === "redirect") {
    const target = new URL(decision.to, request.url);
    const redirectResponse = NextResponse.redirect(target);
    for (const c of response.cookies.getAll()) redirectResponse.cookies.set(c);
    return redirectResponse;
  }
  return response;
}

export const config = {
  matcher: ["/", "/login", "/app/:path*", "/api/app/:path*"],
};
