export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

/**
 * Runtime wiring check. Reports whether public configuration is present and
 * whether the Supabase auth endpoint answers. No data, no secrets.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const configured = Boolean(url && anonKey);
  let supabase: "ok" | "unreachable" | "unconfigured" = "unconfigured";
  if (configured) {
    try {
      const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anonKey! }, cache: "no-store" });
      supabase = res.ok ? "ok" : "unreachable";
    } catch {
      supabase = "unreachable";
    }
  }
  return NextResponse.json({
    status: configured && supabase === "ok" ? "ok" : "degraded",
    configured,
    supabase,
  });
}
