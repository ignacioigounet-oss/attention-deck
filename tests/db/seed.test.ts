/** docs/18 §9 test 26: the local seed leaves the Phase 3 acceptance fixture in place. */
import { afterAll, describe, expect, it } from "vitest";
import { createSupabaseRepositories } from "@/data/supabase/repositories";
import { TEST_CONFIG } from "../setup/config";
import { clientForUser, closeSql } from "../setup/db";

describe.skipIf(TEST_CONFIG.skipDb)("seed", () => {
  afterAll(closeSql);

  it("26. Portfolio is primary, priority 5, stalled 9 days, with a next action", async () => {
    const repos = createSupabaseRepositories(clientForUser(TEST_CONFIG.seedUserId));
    const user = await repos.users.getById(TEST_CONFIG.seedUserId);
    expect(user?.displayName).toBe("Ignacio");
    const areas = await repos.areas.listActive(TEST_CONFIG.seedUserId);
    expect(areas).toHaveLength(5);
    const primary = await repos.projects.getPrimary(TEST_CONFIG.seedUserId);
    expect(primary?.name).toBe("Portfolio");
    expect(primary?.priority).toBe(5);
    expect(primary?.nextAction).toBe("Finalizar y publicar el caso Ygiarto.");
    expect(primary?.areaId).toBe(areas.find((a) => a.name === "Proyectos propios")?.id);
    const days = (Date.now() - Date.parse(primary!.lastActivityAt!)) / 86_400_000;
    expect(days).toBeGreaterThanOrEqual(9);
    expect(days).toBeLessThan(9.1);
  });
});
