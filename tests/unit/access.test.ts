import { describe, expect, it } from "vitest";
import { decideAccess, isProtectedPath, safeNextPath } from "@/auth/access";

describe("route access policy", () => {
  it("protects /app and /api/app only", () => {
    expect(isProtectedPath("/app")).toBe(true);
    expect(isProtectedPath("/app/projects")).toBe(true);
    expect(isProtectedPath("/api/app/me")).toBe(true);
    expect(isProtectedPath("/application")).toBe(false);
    expect(isProtectedPath("/api/health")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
  });

  it("redirects signed-out callers of protected routes to /login with a next parameter", () => {
    expect(decideAccess("/app/projects", false)).toEqual({
      kind: "redirect",
      to: "/login?next=%2Fapp%2Fprojects",
    });
    expect(decideAccess("/app", true)).toEqual({ kind: "allow" });
  });

  it("routes the entry and login pages by session state", () => {
    expect(decideAccess("/", false)).toEqual({ kind: "redirect", to: "/login" });
    expect(decideAccess("/", true)).toEqual({ kind: "redirect", to: "/app" });
    expect(decideAccess("/login", true)).toEqual({ kind: "redirect", to: "/app" });
    expect(decideAccess("/login", false)).toEqual({ kind: "allow" });
    expect(decideAccess("/api/health", false)).toEqual({ kind: "allow" });
  });

  it("only honours same-origin relative next paths", () => {
    expect(safeNextPath("/app/projects")).toBe("/app/projects");
    expect(safeNextPath("https://evil.example")).toBe("/app");
    expect(safeNextPath("//evil.example")).toBe("/app");
    expect(safeNextPath("")).toBe("/app");
    expect(safeNextPath(null)).toBe("/app");
  });
});
