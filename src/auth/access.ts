/**
 * Route access policy. Pure: no Next.js imports, so it is unit-tested
 * directly and reused by the proxy (edge) layer.
 */
export const LOGIN_PATH = "/login";
export const APP_PATH = "/app";

export type AccessDecision = { kind: "allow" } | { kind: "redirect"; to: string };

export function isProtectedPath(pathname: string): boolean {
  return pathname === APP_PATH || pathname.startsWith(`${APP_PATH}/`) || pathname.startsWith("/api/app/");
}

export function decideAccess(pathname: string, signedIn: boolean): AccessDecision {
  if (isProtectedPath(pathname)) {
    return signedIn
      ? { kind: "allow" }
      : { kind: "redirect", to: `${LOGIN_PATH}?next=${encodeURIComponent(pathname)}` };
  }
  if (pathname === LOGIN_PATH && signedIn) return { kind: "redirect", to: APP_PATH };
  if (pathname === "/") return { kind: "redirect", to: signedIn ? APP_PATH : LOGIN_PATH };
  return { kind: "allow" };
}

/** Only same-origin relative paths are honoured as post-login destinations. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return APP_PATH;
  return next;
}
