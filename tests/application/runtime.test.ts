/**
 * Phase 2 runtime path against the real Supabase repositories (PostgREST + RLS):
 * session -> user-bound repositories -> bootstrap -> project read path.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createContainer } from "@/application/container";
import { getProjectOverview } from "@/application/queries/projects";
import { createSupabaseRepositories } from "@/data/supabase/repositories";
import { createMemoryRepositories } from "@/data/memory/repositories";
import type { Repositories } from "@/data/repositories/interfaces";
import { TEST_CONFIG } from "../setup/config";
import { clientForUser, closeSql, createAuthUser } from "../setup/db";

async function seedProjects(repos: Repositories, userId: string) {
  const areas = await repos.areas.listActive(userId);
  const own = areas.find((a) => a.name === "Proyectos propios")!;
  const portfolio = await repos.projects.create({
    userId,
    areaId: own.id,
    name: "Portfolio",
    priority: 5,
    nextAction: "Publicar el caso",
    lastActivityAt: new Date(Date.now() - 9 * 86_400_000).toISOString(),
  });
  await repos.projects.setPrimary(userId, portfolio.id);
  await repos.projects.create({ userId, name: "Tesina", priority: 4 });
  await repos.projects.create({ userId, name: "Vieja", status: "completed" });
  await repos.projects.create({ userId, name: "Pausado", status: "paused" });
  return portfolio;
}

function expectOverview(overview: Awaited<ReturnType<typeof getProjectOverview>>, portfolioId: string) {
  expect(overview.primary?.id).toBe(portfolioId);
  expect(overview.primary?.nextAction).toBe("Publicar el caso");
  expect(overview.active.map((p) => p.name)).toEqual(["Portfolio", "Tesina"]);
  expect(overview.activeCapacity).toEqual({ used: 2, max: 3 });
  expect(overview.countsByStatus).toEqual({ active: 2, paused: 1, blocked: 0, completed: 1, archived: 0 });
  expect(overview.areas.map((a) => a.budgetCategory)).toEqual([
    "work",
    "primary_projects",
    "learning",
    "body",
    "admin",
  ]);
}

describe("project read path (in-memory)", () => {
  it("overview reflects primary, active projects and counts", async () => {
    const repos = createMemoryRepositories();
    const userId = "22222222-2222-2222-2222-222222222222";
    repos.users.createForAuth({ id: userId, email: "m@test.local" });
    await repos.users.bootstrapDefaults(userId);
    const portfolio = await seedProjects(repos, userId);
    expectOverview(await getProjectOverview(repos, userId), portfolio.id);
  });

  it("empty state: no projects, no primary", async () => {
    const repos = createMemoryRepositories();
    const userId = "33333333-3333-3333-3333-333333333333";
    repos.users.createForAuth({ id: userId, email: "e@test.local" });
    const overview = await getProjectOverview(repos, userId);
    expect(overview.primary).toBeNull();
    expect(overview.active).toEqual([]);
    expect(overview.activeCapacity).toEqual({ used: 0, max: 3 });
    expect(overview.areas).toEqual([]);
  });
});

describe.skipIf(TEST_CONFIG.skipDb)("application runtime (supabase)", () => {
  let userId = "";
  let otherId = "";

  beforeAll(async () => {
    userId = await createAuthUser(undefined, "Runtime");
    otherId = await createAuthUser(undefined, "Other");
  });
  afterAll(closeSql);

  const containerFor = (id: string, email: string | null = null) =>
    createContainer({
      getSession: async () => ({ userId: id, email }),
      createRepositories: (s) => createSupabaseRepositories(clientForUser(s.userId)),
    });

  it("loads the authenticated user and bootstraps defaults idempotently through the app path", async () => {
    const container = containerFor(userId, "runtime@test.local");
    const first = await container.getAppContext();
    expect(first?.user.id).toBe(userId);
    expect(first?.user.displayName).toBe("Runtime");
    expect(await first!.repos.areas.listByUser(userId)).toHaveLength(5);

    const second = await container.getAppContext();
    expect(await second!.repos.areas.listByUser(userId)).toHaveLength(5);
    // calling the DB function directly again is still a no-op
    await second!.repos.users.bootstrapDefaults(userId);
    expect(await second!.repos.areas.listByUser(userId)).toHaveLength(5);
  });

  it("reads primary and active projects through user-bound repositories", async () => {
    const ctx = (await containerFor(userId).getAppContext())!;
    const portfolio = await seedProjects(ctx.repos, userId);
    expectOverview(await getProjectOverview(ctx.repos, userId), portfolio.id);
  });

  it("RLS holds through the application path: another session sees nothing of this user", async () => {
    const other = (await containerFor(otherId).getAppContext())!;
    const overview = await getProjectOverview(other.repos, otherId);
    expect(overview.primary).toBeNull();
    expect(overview.active).toEqual([]);
    // even asking for the other user's id explicitly returns nothing
    expect(await other.repos.projects.listByUser(userId)).toEqual([]);
    expect(await other.repos.users.getById(userId)).toBeNull();
  });

  it("session without a public.users row is rejected, not silently created", async () => {
    const ghost = "44444444-4444-4444-4444-444444444444";
    await expect(containerFor(ghost).getAppContext()).rejects.toThrow(/public.users row/);
  });
});
