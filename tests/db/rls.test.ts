/** docs/18 §9 tests 16–19: RLS verified through supabase-js (PostgREST) and through SQL roles. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TEST_CONFIG } from "../setup/config";
import { clientForUser, closeSql, createAuthUser, queryAs, serviceClient } from "../setup/db";

describe.skipIf(TEST_CONFIG.skipDb)("row level security", () => {
  let userA = "";
  let userB = "";
  let projectA = "";

  beforeAll(async () => {
    userA = await createAuthUser(undefined, "A");
    userB = await createAuthUser(undefined, "B");
    const { data, error } = await clientForUser(userA)
      .from("projects")
      .insert({ user_id: userA, name: "Secret A" })
      .select()
      .single();
    if (error) throw error;
    projectA = data.id;
  });

  afterAll(closeSql);

  it("16. user B cannot read user A's rows", async () => {
    const { data, error } = await clientForUser(userB).from("projects").select();
    expect(error).toBeNull();
    expect(data).toEqual([]);
    const byId = await clientForUser(userB).from("projects").select().eq("id", projectA);
    expect(byId.data).toEqual([]);
    const viaSql = await queryAs(userB, `select id from projects`);
    expect(viaSql.rowCount).toBe(0);
  });

  it("17. user B cannot insert rows owned by A, nor update or delete them", async () => {
    const ins = await clientForUser(userB).from("projects").insert({ user_id: userA, name: "Forged" });
    expect(ins.error?.code).toBe("42501");
    const upd = await clientForUser(userB)
      .from("projects")
      .update({ name: "Hijacked" })
      .eq("id", projectA)
      .select();
    expect(upd.error).toBeNull();
    expect(upd.data).toEqual([]);
    const del = await clientForUser(userB).from("projects").delete().eq("id", projectA).select();
    expect(del.data).toEqual([]);
    const still = await clientForUser(userA).from("projects").select("name").eq("id", projectA).single();
    expect(still.data?.name).toBe("Secret A");
    await expect(
      queryAs(userB, `insert into projects (user_id, name) values ($1, 'Forged')`, [userA]),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("18. service role reads both users", async () => {
    await clientForUser(userB).from("projects").insert({ user_id: userB, name: "B1" });
    const { data, error } = await serviceClient()
      .from("projects")
      .select("user_id")
      .in("user_id", [userA, userB]);
    expect(error).toBeNull();
    expect(new Set(data?.map((r) => r.user_id))).toEqual(new Set([userA, userB]));
  });

  it("19. users table: each user reads only their own row; anon reads nothing", async () => {
    const a = await clientForUser(userA).from("users").select("id");
    expect(a.data?.map((r) => r.id)).toEqual([userA]);
    const b = await clientForUser(userB).from("users").select("id");
    expect(b.data?.map((r) => r.id)).toEqual([userB]);
    const forged = await clientForUser(userB)
      .from("users")
      .update({ display_name: "x" })
      .eq("id", userA)
      .select();
    expect(forged.data).toEqual([]);
    const anon = await queryAs(null, `set local role anon; select count(*) from projects`).catch(
      (e: { code: string }) => e,
    );
    expect((anon as { code?: string }).code).toBe("42501");
  });

  it("RLS is enabled on every public table", async () => {
    const res = await queryAs(
      null,
      `select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and relkind = 'r' and not relrowsecurity`,
    );
    expect(res.rows).toEqual([]);
  });
});
