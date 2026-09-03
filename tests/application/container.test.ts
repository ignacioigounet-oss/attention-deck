import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createContainer } from "@/application/container";
import { createMemoryRepositories } from "@/data/memory/repositories";
import { isDomainError } from "@/domain/errors";

describe("application container (dependency wiring)", () => {
  it("returns null without a session and never builds repositories", async () => {
    const createRepositories = vi.fn(() => createMemoryRepositories());
    const container = createContainer({ getSession: async () => null, createRepositories });
    expect(await container.getAppContext()).toBeNull();
    expect(createRepositories).not.toHaveBeenCalled();
  });

  it("binds repositories to the session and bootstraps the user once", async () => {
    const userId = randomUUID();
    const repos = createMemoryRepositories();
    repos.users.createForAuth({ id: userId, email: "a@test.local", displayName: "A" });
    const createRepositories = vi.fn(() => repos);
    const container = createContainer({
      getSession: async () => ({ userId, email: "a@test.local" }),
      createRepositories,
    });

    const ctx = await container.getAppContext();
    expect(ctx?.session.userId).toBe(userId);
    expect(ctx?.user.displayName).toBe("A");
    expect(ctx?.repos).toBe(repos);
    expect(createRepositories).toHaveBeenCalledWith({ userId, email: "a@test.local" });
    expect(await repos.areas.listByUser(userId)).toHaveLength(5);

    const bootstrap = vi.spyOn(repos.users, "bootstrapDefaults");
    await container.getAppContext();
    await container.getAppContext();
    expect(bootstrap).not.toHaveBeenCalled();
    expect(await repos.areas.listByUser(userId)).toHaveLength(5);
  });

  it("fails loudly when the auth user has no public.users row", async () => {
    const container = createContainer({
      getSession: async () => ({ userId: randomUUID(), email: null }),
      createRepositories: () => createMemoryRepositories(),
    });
    await expect(container.getAppContext()).rejects.toSatisfy((e) => isDomainError(e, "NOT_FOUND"));
  });
});
