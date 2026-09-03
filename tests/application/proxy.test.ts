import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const req = (path: string) => new NextRequest(new URL(path, "http://localhost:3000"));

describe("proxy (protected boundary)", () => {
  it("redirects protected routes to /login when there is no session", async () => {
    const res = await proxy(req("/app/projects"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
    expect(new URL(res.headers.get("location")!).searchParams.get("next")).toBe("/app/projects");
  });

  it("redirects / to /login when signed out and leaves /login alone", async () => {
    const root = await proxy(req("/"));
    expect(new URL(root.headers.get("location")!).pathname).toBe("/login");
    const login = await proxy(req("/login"));
    expect(login.status).toBe(200);
    expect(login.headers.get("location")).toBeNull();
  });

  it("protects the JSON app API as well", async () => {
    const res = await proxy(req("/api/app/me"));
    expect(res.status).toBe(307);
  });
});
