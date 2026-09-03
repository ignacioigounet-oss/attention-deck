/** docs/18 §9 tests 11, 12, 13, 15 enforced at the database level. */
import { afterAll, describe, expect, it } from "vitest";
import { TEST_CONFIG } from "../setup/config";
import { closeSql, createAuthUser, sql } from "../setup/db";

const expectPgError = async (p: Promise<unknown>, code: string, message?: RegExp) => {
  await expect(p).rejects.toMatchObject(
    message ? { code, message: expect.stringMatching(message) } : { code },
  );
};

const insertProject = (userId: string, name: string, opts: { status?: string; primary?: boolean } = {}) =>
  sql().query<{ id: string }>(
    `insert into projects (user_id, name, status, is_primary) values ($1, $2, $3, $4) returning id`,
    [userId, name, opts.status ?? "active", opts.primary ?? false],
  );

describe.skipIf(TEST_CONFIG.skipDb)("invariants (database)", () => {
  afterAll(closeSql);

  it("11. second active primary project is rejected by the partial unique index", async () => {
    const userId = await createAuthUser();
    await insertProject(userId, "A", { primary: true });
    await expectPgError(insertProject(userId, "B", { primary: true }), "23505");
    // a paused primary does not count
    await insertProject(userId, "C", { primary: true, status: "paused" });
    // another user is independent
    const other = await createAuthUser();
    await insertProject(other, "A", { primary: true });
  });

  it("12. fourth active project is rejected by trigger; pausing frees the slot", async () => {
    const userId = await createAuthUser();
    await insertProject(userId, "1");
    await insertProject(userId, "2");
    const third = await insertProject(userId, "3");
    await expectPgError(insertProject(userId, "4"), "P0001", /active project limit/);
    await sql().query(`update projects set status = 'paused' where id = $1`, [third.rows[0]!.id]);
    await insertProject(userId, "4");
    await expectPgError(
      sql().query(`update projects set status = 'active' where id = $1`, [third.rows[0]!.id]),
      "P0001",
    );
    // ideas do not consume capacity
    await sql().query(`insert into ideas (user_id, title) values ($1, 'idea')`, [userId]);
  });

  it("13. set_primary_project swaps atomically and rejects non-active projects", async () => {
    const userId = await createAuthUser();
    const a = (await insertProject(userId, "A", { primary: true })).rows[0]!.id;
    const b = (await insertProject(userId, "B")).rows[0]!.id;
    const paused = (await insertProject(userId, "C", { status: "paused" })).rows[0]!.id;
    const r = await sql().query<{ id: string; is_primary: boolean }>(
      `select id, is_primary from set_primary_project($1)`,
      [b],
    );
    expect(r.rows[0]).toEqual({ id: b, is_primary: true });
    const all = await sql().query<{ id: string; is_primary: boolean }>(
      `select id, is_primary from projects where user_id = $1 and is_primary`,
      [userId],
    );
    expect(all.rows).toEqual([{ id: b, is_primary: true }]);
    await expectPgError(
      sql().query(`select * from set_primary_project($1)`, [paused]),
      "P0001",
      /only active/,
    );
    await expectPgError(
      sql().query(`select * from set_primary_project('00000000-0000-0000-0000-000000000000')`),
      "P0002",
    );
    expect(
      (await sql().query(`select is_primary from projects where id = $1`, [a])).rows[0]?.is_primary,
    ).toBe(false);
  });

  it("15. duplicate habit log per day is rejected", async () => {
    const userId = await createAuthUser();
    const h = await sql().query<{ id: string }>(
      `insert into habits (user_id, name, kind, frequency, frequency_json) values ($1, 'H', 'binary', 'x', '{"period":"day","times":1}') returning id`,
      [userId],
    );
    const hid = h.rows[0]!.id;
    await sql().query(
      `insert into habit_logs (user_id, habit_id, log_date, status) values ($1, $2, '2026-09-03', 'done')`,
      [userId, hid],
    );
    await expectPgError(
      sql().query(
        `insert into habit_logs (user_id, habit_id, log_date, status) values ($1, $2, '2026-09-03', 'done')`,
        [userId, hid],
      ),
      "23505",
    );
  });
});
