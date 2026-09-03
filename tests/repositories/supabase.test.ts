import { afterAll, beforeAll, describe } from "vitest";
import { createSupabaseRepositories } from "@/data/supabase/repositories";
import { TEST_CONFIG } from "../setup/config";
import { clientForUser, closeSql, createAuthUser, wipeUsersData } from "../setup/db";
import { runRepositorySuite, type SuiteContext } from "./suite";

describe.skipIf(TEST_CONFIG.skipDb)("supabase backend", () => {
  const ctx: SuiteContext = {
    backend: "supabase",
    userA: "",
    userB: "",
    reposFor: (userId) => createSupabaseRepositories(clientForUser(userId)),
    reset: async () => {
      await wipeUsersData([ctx.userA, ctx.userB]);
    },
  };

  beforeAll(async () => {
    ctx.userA = await createAuthUser(undefined, "A");
    ctx.userB = await createAuthUser(undefined, "B");
  });

  afterAll(async () => {
    await closeSql();
  });

  runRepositorySuite("supabase", () => ctx);
});
