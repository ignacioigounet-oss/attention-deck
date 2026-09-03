/** docs/18 §9 tests 1, 4–10 (database side) plus enum alignment. */
import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { DB_ENUMS } from "@/domain/types";
import { TEST_CONFIG } from "../setup/config";
import { PUBLIC_TABLES, closeSql, createAuthUser, sql } from "../setup/db";

const expectPgError = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toMatchObject({ code });
};

describe.skipIf(TEST_CONFIG.skipDb)("schema", () => {
  afterAll(closeSql);

  it("1. migrations applied: all tables, enums and functions exist", async () => {
    const tables = await sql().query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'`,
    );
    const names = tables.rows.map((r) => r.table_name).sort();
    expect(names).toEqual([...PUBLIC_TABLES, "users"].sort());

    const fns = await sql().query<{ proname: string }>(
      `select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'`,
    );
    const fnNames = new Set(fns.rows.map((r) => r.proname));
    for (const f of [
      "set_updated_at",
      "handle_new_user",
      "bootstrap_defaults",
      "assert_active_project_limit",
      "set_primary_project",
      "search_memory_events",
      "search_decisions",
      "search_observations",
      "is_valid_frequency",
      "is_valid_scope",
      "is_valid_budget_targets",
    ]) {
      expect(fnNames.has(f), f).toBe(true);
    }
  });

  it("domain enums match the database enums exactly", async () => {
    const res = await sql().query<{ typname: string; labels: string[] }>(`
      select t.typname, array_agg(e.enumlabel::text order by e.enumsortorder) as labels
      from pg_type t join pg_enum e on e.enumtypid = t.oid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' group by t.typname`);
    const db = Object.fromEntries(res.rows.map((r) => [r.typname, r.labels]));
    expect(Object.keys(db).sort()).toEqual(Object.keys(DB_ENUMS).sort());
    for (const [name, values] of Object.entries(DB_ENUMS)) {
      expect(db[name], name).toEqual([...values]);
    }
  });

  it("4. calendar_provider accepts 'google' only", async () => {
    const userId = await createAuthUser();
    await sql().query(`insert into calendar_connections (user_id, provider) values ($1, 'google')`, [userId]);
    await expectPgError(
      sql().query(`insert into calendar_connections (user_id, provider) values ($1, 'outlook')`, [userId]),
      "22P02",
    );
  });

  it("5. frequency_json is validated by check constraint", async () => {
    const userId = await createAuthUser();
    const insert = (f: string) =>
      sql().query(
        `insert into habits (user_id, name, kind, frequency, frequency_json) values ($1, 'H', 'binary', 'x', $2::jsonb)`,
        [userId, f],
      );
    await expectPgError(insert('{"times": 1}'), "23514");
    await expectPgError(insert('{"period": "fortnight", "times": 1}'), "23514");
    await expectPgError(insert('{"period": "week", "times": 0}'), "23514");
    await expectPgError(insert('{"period": "week", "times": 1.5}'), "23514");
    await insert('{"period": "week", "times": 3, "minutesPerOccurrence": 60}');
    await insert('{"period": "day", "times": 1, "days": [1,3,5]}');
    // commitments share the validator
    await expectPgError(
      sql().query(
        `insert into commitments (user_id, description, frequency, frequency_json, start_date) values ($1, 'c', 'x', '{"period":"week"}'::jsonb, current_date)`,
        [userId],
      ),
      "23514",
    );
  });

  it("6. friction_type is an enum", async () => {
    const userId = await createAuthUser();
    await expectPgError(
      sql().query(`insert into behavior_observations (user_id, friction_type) values ($1, 'lazy')`, [userId]),
      "22P02",
    );
    await sql().query(`insert into behavior_observations (user_id, friction_type) values ($1, 'ambiguity')`, [
      userId,
    ]);
    await expectPgError(
      sql().query(
        `insert into behavior_observations (user_id, friction_type, source) values ($1, 'ambiguity', 'guess')`,
        [userId],
      ),
      "23514",
    );
  });

  it("7. decisions.status uses memory_status; scope_json is validated", async () => {
    const userId = await createAuthUser();
    await expectPgError(
      sql().query(`insert into decisions (user_id, title, decision, status) values ($1, 't', 'd', 'open')`, [
        userId,
      ]),
      "22P02",
    );
    await expectPgError(
      sql().query(
        `insert into decisions (user_id, title, decision, scope_json) values ($1, 't', 'd', '{"kind":"nope"}')`,
        [userId],
      ),
      "23514",
    );
    const r = await sql().query<{ status: string; scope_json: { kind: string } }>(
      `insert into decisions (user_id, title, decision) values ($1, 't', 'd') returning status, scope_json`,
      [userId],
    );
    expect(r.rows[0]?.status).toBe("active");
    expect(r.rows[0]?.scope_json).toEqual({ kind: "custom" });
  });

  it("8. updated_at trigger updates on every user-owned table that has the column", async () => {
    const userId = await createAuthUser();
    const r = await sql().query<{ id: string; updated_at: string }>(
      `insert into projects (user_id, name) values ($1, 'P') returning id, updated_at`,
      [userId],
    );
    const before = r.rows[0]!;
    await new Promise((res) => setTimeout(res, 20));
    const after = await sql().query<{ updated_at: string }>(
      `update projects set name = 'Q' where id = $1 returning updated_at`,
      [before.id],
    );
    expect(new Date(after.rows[0]!.updated_at).getTime()).toBeGreaterThan(
      new Date(before.updated_at).getTime(),
    );

    const triggers = await sql().query<{ event_object_table: string }>(
      `select event_object_table from information_schema.triggers where trigger_name like '%_set_updated_at'`,
    );
    const withTrigger = new Set(triggers.rows.map((t) => t.event_object_table));
    const withColumn = await sql().query<{ table_name: string }>(
      `select table_name from information_schema.columns where table_schema = 'public' and column_name = 'updated_at'`,
    );
    for (const t of withColumn.rows.map((r) => r.table_name)) expect(withTrigger.has(t), t).toBe(true);
  });

  it("9. inserting into auth.users creates public.users with defaults", async () => {
    const id = randomUUID();
    await sql().query(
      `insert into auth.users (id, email, raw_user_meta_data) values ($1, 'x@test.local', '{"display_name":"X"}')`,
      [id],
    );
    const r = await sql().query(`select * from users where id = $1`, [id]);
    const u = r.rows[0]!;
    expect(u.email).toBe("x@test.local");
    expect(u.display_name).toBe("X");
    expect(u.timezone).toBe("America/Argentina/Buenos_Aires");
    expect(Number(u.weekly_available_hours)).toBe(40);
    expect(u.day_start).toBe("09:00:00");
    expect(u.day_end).toBe("19:00:00");
    expect(u.attention_budget_targets).toEqual({
      work: 0,
      primary_projects: 0,
      body: 0,
      learning: 0,
      admin: 0,
    });

    const id2 = randomUUID();
    await sql().query(`insert into auth.users (id, email) values ($1, 'noname@test.local')`, [id2]);
    const r2 = await sql().query(`select display_name from users where id = $1`, [id2]);
    expect(r2.rows[0]?.display_name).toBe("noname");

    // users.id cannot exist without auth.users
    await expectPgError(
      sql().query(`insert into users (id, email) values ($1, 'orphan@test.local')`, [randomUUID()]),
      "23503",
    );
    // budget targets are validated
    await expectPgError(
      sql().query(`update users set attention_budget_targets = '{"work": 1}' where id = $1`, [id]),
      "23514",
    );
    await expectPgError(sql().query(`update users set day_end = '08:00' where id = $1`, [id]), "23514");
  });

  it("10. bootstrap_defaults is idempotent and requires an existing user", async () => {
    const userId = await createAuthUser();
    await sql().query(`select bootstrap_defaults($1)`, [userId]);
    await sql().query(`select bootstrap_defaults($1)`, [userId]);
    const r = await sql().query<{ name: string; budget_category: string }>(
      `select name, budget_category from areas where user_id = $1 order by position`,
      [userId],
    );
    expect(r.rows).toEqual([
      { name: "Trabajo", budget_category: "work" },
      { name: "Proyectos propios", budget_category: "primary_projects" },
      { name: "Estudios", budget_category: "learning" },
      { name: "Cuerpo", budget_category: "body" },
      { name: "Finanzas", budget_category: "admin" },
    ]);
    await expectPgError(sql().query(`select bootstrap_defaults($1)`, [randomUUID()]), "23503");
  });

  it("commitment_logs exists with unique (commitment_id, log_date)", async () => {
    const userId = await createAuthUser();
    const c = await sql().query<{ id: string }>(
      `insert into commitments (user_id, description, frequency, frequency_json, start_date) values ($1, 'c', 'x', '{"period":"week","times":1}', current_date) returning id`,
      [userId],
    );
    const cid = c.rows[0]!.id;
    await sql().query(
      `insert into commitment_logs (user_id, commitment_id, log_date, status) values ($1, $2, '2026-09-01', 'done')`,
      [userId, cid],
    );
    await expectPgError(
      sql().query(
        `insert into commitment_logs (user_id, commitment_id, log_date, status) values ($1, $2, '2026-09-01', 'partial')`,
        [userId, cid],
      ),
      "23505",
    );
  });

  it("calendar sync and cache fields exist with their defaults", async () => {
    const userId = await createAuthUser();
    const c = await sql().query(
      `insert into calendar_connections (user_id, provider) values ($1, 'google') returning *`,
      [userId],
    );
    expect(c.rows[0]?.sync_tokens).toEqual({});
    expect(c.rows[0]?.selected_calendar_ids).toEqual([]);
    expect(c.rows[0]?.write_calendar_id).toBeNull();
    const e = await sql().query(
      `insert into calendar_events_cache (user_id, provider, external_id, title, start_at, end_at) values ($1, 'google', 'x', 't', now(), now() + interval '1 hour') returning *`,
      [userId],
    );
    expect(e.rows[0]).toMatchObject({
      status: "confirmed",
      all_day: false,
      transparency: "opaque",
      source: "google",
      has_attendees: false,
    });
    await expectPgError(
      sql().query(
        `insert into calendar_events_cache (user_id, provider, external_id, title, start_at, end_at) values ($1, 'google', 'y', 't', now(), now() - interval '1 hour')`,
        [userId],
      ),
      "23514",
    );
  });
});
