/**
 * Shared repository test-suite. Runs unchanged against the in-memory and the
 * Supabase implementations (docs/18 §9 tests 13, 14, 20–25).
 */
import { describe, it, expect, beforeEach } from "vitest";
import type { Repositories } from "@/data/repositories/interfaces";
import { isDomainError } from "@/domain/errors";

export interface SuiteContext {
  reposFor(userId: string): Repositories;
  userA: string;
  userB: string;
  /** Clears all data for both users (keeps the users). */
  reset(): Promise<void>;
  /** Backend name, used to branch the search expectations. */
  backend: "memory" | "supabase";
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

export function runRepositorySuite(name: string, getCtx: () => SuiteContext): void {
  describe(`repositories (${name})`, () => {
    let ctx: SuiteContext;
    let repos: Repositories;
    let userA: string;
    let userB: string;

    beforeEach(async () => {
      ctx = getCtx();
      await ctx.reset();
      userA = ctx.userA;
      userB = ctx.userB;
      repos = ctx.reposFor(userA);
    });

    // ------------------------------------------------------------ 20: domain shapes
    it("20. CRUD returns camelCase domain objects with ISO dates, not DB rows", async () => {
      const area = await repos.areas.create({ userId: userA, name: "Trabajo", budgetCategory: "work" });
      expect(area.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(area.userId).toBe(userA);
      expect(area.budgetCategory).toBe("work");
      expect(area.createdAt).toMatch(ISO_TS);
      expect(area.updatedAt).toMatch(ISO_TS);
      expect(area).not.toHaveProperty("user_id");
      expect(area).not.toHaveProperty("created_at");

      const project = await repos.projects.create({
        userId: userA,
        areaId: area.id,
        name: "Portfolio",
        priority: 5,
        targetDate: "2026-10-01",
      });
      expect(project.targetDate).toBe("2026-10-01");
      expect(project.targetDate).toMatch(ISO_DATE);
      expect(project.status).toBe("active");
      expect(project.isPrimary).toBe(false);

      const fetched = await repos.projects.getById(userA, project.id);
      expect(fetched).toEqual(project);

      const updated = await repos.projects.update(userA, project.id, { nextAction: "Publicar caso" });
      expect(updated.nextAction).toBe("Publicar caso");
      expect(updated.updatedAt >= project.updatedAt).toBe(true);

      await repos.projects.delete(userA, project.id);
      expect(await repos.projects.getById(userA, project.id)).toBeNull();
      await expect(repos.projects.delete(userA, project.id)).rejects.toSatisfy((e) =>
        isDomainError(e, "NOT_FOUND"),
      );
    });

    it("20b. every aggregate round-trips through create/get", async () => {
      const area = await repos.areas.create({ userId: userA, name: "Cuerpo", budgetCategory: "body" });
      const project = await repos.projects.create({ userId: userA, name: "P", areaId: area.id });
      const task = await repos.tasks.create({
        userId: userA,
        projectId: project.id,
        title: "T",
        estimatedMinutes: 30,
      });
      const commitment = await repos.commitments.create({
        userId: userA,
        projectId: project.id,
        description: "Escribir 3 veces por semana",
        frequency: "3x semana",
        frequencyJson: { period: "week", times: 3 },
        startDate: "2026-09-01",
      });
      const clog = await repos.commitmentLogs.create({
        userId: userA,
        commitmentId: commitment.id,
        logDate: "2026-09-02",
        status: "done",
      });
      const idea = await repos.ideas.create({ userId: userA, title: "Newsletter" });
      const decision = await repos.decisions.create({
        userId: userA,
        title: "No abrir proyectos",
        decision: "No abrir proyectos hasta publicar Portfolio",
        scopeJson: { kind: "no_new_projects" },
      });
      const observation = await repos.observations.create({
        userId: userA,
        type: "pattern",
        statement: "Entrena más cuando está en el calendario",
        confidence: 0.7,
      });
      const event = await repos.memoryEvents.create({
        userId: userA,
        eventType: "task_completed",
        description: "Tarea T completada",
        projectId: project.id,
      });
      const habit = await repos.habits.create({
        userId: userA,
        areaId: area.id,
        name: "Entrenar",
        kind: "frequency",
        frequency: "3x semana",
        frequencyJson: { period: "week", times: 3, minutesPerOccurrence: 60 },
      });
      const hlog = await repos.habitLogs.create({
        userId: userA,
        habitId: habit.id,
        logDate: "2026-09-02",
        status: "done",
      });
      const item = await repos.attentionItems.create({
        userId: userA,
        kind: "stagnation",
        title: "Portfolio estancado",
        severity: 4,
        entityType: "project",
        entityId: project.id,
      });
      const snap = await repos.attentionSnapshots.upsert({
        userId: userA,
        snapshotDate: "2026-09-03",
        loadStatus: "HEALTHY",
        attentionBudget: { work: { target: 10, actual: 8, delta: -2 } },
      });
      const activation = await repos.activations.create({
        userId: userA,
        projectId: project.id,
        taskId: task.id,
        strategy: "reduce_scope",
        timerMinutes: 10,
      });
      const bobs = await repos.behaviorObservations.create({
        userId: userA,
        entityType: "task",
        entityId: task.id,
        frictionType: "ambiguity",
        confidence: 0.76,
        source: "structural",
        contextJson: { timeOfDay: "morning", energy: 3, protectedBlock: false },
        activationId: activation.id,
      });
      const conv = await repos.conversations.create({ userId: userA, sessionId: "s1" });
      const conn = await repos.calendarConnections.upsert({
        userId: userA,
        provider: "google",
        syncTokens: { primary: "tok" },
        selectedCalendarIds: ["primary"],
      });
      const [cached] = await repos.calendarEventsCache.upsertMany([
        {
          userId: userA,
          provider: "google",
          externalId: "evt1",
          title: "Reunión",
          startAt: "2026-09-03T10:00:00.000Z",
          endAt: "2026-09-03T11:00:00.000Z",
          source: "attention_deck",
          projectId: project.id,
        },
      ]);
      const audit = await repos.auditLog.create({
        userId: userA,
        actor: "user_text",
        actionType: "create_task",
      });
      const checkin = await repos.checkins.upsert({
        userId: userA,
        checkinDate: "2026-09-03",
        rawSummary: "Hoy avancé",
      });
      const review = await repos.reviews.upsert({
        userId: userA,
        reviewType: "weekly",
        periodStart: "2026-08-31",
        periodEnd: "2026-09-06",
        payload: { moved: [] },
      });

      expect(await repos.tasks.getById(userA, task.id)).toEqual(task);
      expect(await repos.commitments.getById(userA, commitment.id)).toEqual(commitment);
      expect(commitment.frequencyJson).toEqual({ period: "week", times: 3 });
      expect(await repos.commitmentLogs.getById(userA, clog.id)).toEqual(clog);
      expect(await repos.ideas.getById(userA, idea.id)).toEqual(idea);
      expect((await repos.decisions.getById(userA, decision.id))?.scopeJson).toEqual({
        kind: "no_new_projects",
      });
      expect(decision.status).toBe("active");
      expect((await repos.observations.getById(userA, observation.id))?.evidenceCount).toBe(1);
      expect(observation.firstObservedAt).toMatch(ISO_TS);
      expect((await repos.memoryEvents.getById(userA, event.id))?.importance).toBe(3);
      expect((await repos.habits.getById(userA, habit.id))?.startDate).toMatch(ISO_DATE);
      expect(await repos.habitLogs.getById(userA, hlog.id)).toEqual(hlog);
      expect(await repos.attentionItems.getById(userA, item.id)).toEqual(item);
      expect(item.status).toBe("active");
      expect((await repos.attentionSnapshots.getByDate(userA, "2026-09-03"))?.id).toBe(snap.id);
      expect(await repos.activations.getById(userA, activation.id)).toEqual(activation);
      expect(activation.status).toBe("suggested");
      expect((await repos.behaviorObservations.getById(userA, bobs.id))?.contextJson).toEqual({
        timeOfDay: "morning",
        energy: 3,
        protectedBlock: false,
      });
      expect(bobs.activationId).toBe(activation.id);
      expect(await repos.conversations.getById(userA, conv.id)).toEqual(conv);
      expect((await repos.calendarConnections.getByProvider(userA, "google"))?.id).toBe(conn.id);
      expect(conn.syncTokens).toEqual({ primary: "tok" });
      expect(cached?.source).toBe("attention_deck");
      expect(cached?.projectId).toBe(project.id);
      expect((await repos.auditLog.listRecent(userA))[0]?.id).toBe(audit.id);
      expect((await repos.checkins.getByDate(userA, "2026-09-03"))?.id).toBe(checkin.id);
      expect((await repos.reviews.getByPeriod(userA, "weekly", "2026-08-31", "2026-09-06"))?.id).toBe(
        review.id,
      );
    });

    // ------------------------------------------------------------ 21: ordering
    it("21. projects.listActive orders by priority desc, then last_activity_at asc (nulls first)", async () => {
      const p1 = await repos.projects.create({
        userId: userA,
        name: "A",
        priority: 3,
        lastActivityAt: "2026-09-01T00:00:00.000Z",
      });
      const p2 = await repos.projects.create({
        userId: userA,
        name: "B",
        priority: 5,
        lastActivityAt: "2026-08-20T00:00:00.000Z",
      });
      const p3 = await repos.projects.create({ userId: userA, name: "C", priority: 5, lastActivityAt: null });
      await repos.projects.create({ userId: userA, name: "D", priority: 4, status: "paused" });
      const ids = (await repos.projects.listActive(userA)).map((p) => p.id);
      expect(ids).toEqual([p3.id, p2.id, p1.id]);
    });

    // ------------------------------------------------------------ 22: attention items lookup
    it("22. attentionItems.findByKindAndEntity distinguishes active from dismissed", async () => {
      const project = await repos.projects.create({ userId: userA, name: "P" });
      const a = await repos.attentionItems.create({
        userId: userA,
        kind: "stagnation",
        title: "x",
        entityType: "project",
        entityId: project.id,
        severity: 4,
      });
      const d = await repos.attentionItems.create({
        userId: userA,
        kind: "stagnation",
        title: "y",
        entityType: "project",
        entityId: project.id,
        severity: 3,
        status: "dismissed",
      });
      await repos.attentionItems.create({ userId: userA, kind: "overload", title: "z", entityId: null });

      const active = await repos.attentionItems.findByKindAndEntity(
        userA,
        "stagnation",
        project.id,
        "active",
      );
      const dismissed = await repos.attentionItems.findByKindAndEntity(
        userA,
        "stagnation",
        project.id,
        "dismissed",
      );
      const all = await repos.attentionItems.findByKindAndEntity(userA, "stagnation", project.id);
      const overload = await repos.attentionItems.findByKindAndEntity(userA, "overload", null);
      expect(active.map((i) => i.id)).toEqual([a.id]);
      expect(dismissed.map((i) => i.id)).toEqual([d.id]);
      expect(all).toHaveLength(2);
      expect(overload).toHaveLength(1);
      expect((await repos.attentionItems.listActive(userA)).map((i) => i.kind)).toEqual([
        "stagnation",
        "overload",
      ]);
    });

    // ------------------------------------------------------------ 23: inclusive date ranges
    it("23. habitLogs/commitmentLogs.listInRange respects inclusive bounds", async () => {
      const habit = await repos.habits.create({
        userId: userA,
        name: "Escribir",
        kind: "binary",
        frequency: "diario",
        frequencyJson: { period: "day", times: 1 },
      });
      for (const d of ["2026-08-31", "2026-09-01", "2026-09-07", "2026-09-08"]) {
        await repos.habitLogs.create({ userId: userA, habitId: habit.id, logDate: d, status: "done" });
      }
      const inRange = await repos.habitLogs.listInRange(
        userA,
        { from: "2026-09-01", to: "2026-09-07" },
        habit.id,
      );
      expect(inRange.map((l) => l.logDate)).toEqual(["2026-09-01", "2026-09-07"]);

      const c = await repos.commitments.create({
        userId: userA,
        description: "c",
        frequency: "semanal",
        frequencyJson: { period: "week", times: 1 },
        startDate: "2026-08-01",
      });
      for (const d of ["2026-09-01", "2026-09-07", "2026-09-08"]) {
        await repos.commitmentLogs.create({ userId: userA, commitmentId: c.id, logDate: d, status: "done" });
      }
      const clogs = await repos.commitmentLogs.listInRange(userA, { from: "2026-09-01", to: "2026-09-07" });
      expect(clogs.map((l) => l.logDate)).toEqual(["2026-09-01", "2026-09-07"]);
    });

    // ------------------------------------------------------------ 24: scope queries
    it("24. decisions.listActiveByScope returns global decisions plus entity matches", async () => {
      const p1 = await repos.projects.create({ userId: userA, name: "P1" });
      const p2 = await repos.projects.create({ userId: userA, name: "P2" });
      const global = await repos.decisions.create({
        userId: userA,
        title: "No abrir proyectos",
        decision: "Hasta publicar Portfolio",
        scopeJson: { kind: "no_new_projects" },
      });
      const protectP1 = await repos.decisions.create({
        userId: userA,
        title: "Proteger P1",
        decision: "2 bloques por semana",
        scopeJson: { kind: "protect_project", entityId: p1.id },
      });
      await repos.decisions.create({
        userId: userA,
        title: "Pausar P2",
        decision: "Hasta octubre",
        scopeJson: { kind: "pause_project", entityId: p2.id },
      });
      await repos.decisions.create({
        userId: userA,
        title: "Vieja",
        decision: "Superseded",
        scopeJson: { kind: "no_new_projects" },
        status: "superseded",
      });

      const forP1 = await repos.decisions.listActiveByScope(userA, { entityId: p1.id });
      expect(forP1.map((d) => d.id).sort()).toEqual([global.id, protectP1.id].sort());

      const onlyProtect = await repos.decisions.listActiveByScope(userA, {
        kind: "protect_project",
        entityId: p1.id,
      });
      expect(onlyProtect.map((d) => d.id)).toEqual([protectP1.id]);

      const globals = await repos.decisions.listActiveByScope(userA, {});
      expect(globals.map((d) => d.id)).toEqual([global.id]);
    });

    // ------------------------------------------------------------ 25: search
    it("25. memoryEvents.search returns ranked results", async () => {
      const project = await repos.projects.create({ userId: userA, name: "Portfolio" });
      await repos.memoryEvents.create({
        userId: userA,
        eventType: "project_progress",
        description: "Avance en el caso de portfolio: se editó el texto",
        projectId: project.id,
        occurredAt: "2026-07-15T10:00:00.000Z",
      });
      const best = await repos.memoryEvents.create({
        userId: userA,
        eventType: "decision_made",
        description: "Decisión: publicar el portfolio antes de abrir otro proyecto",
        projectId: project.id,
        occurredAt: "2026-08-20T10:00:00.000Z",
      });
      await repos.memoryEvents.create({
        userId: userA,
        eventType: "habit_logged",
        description: "Entrenamiento registrado",
        occurredAt: "2026-09-01T10:00:00.000Z",
      });
      await ctx.reposFor(userB).memoryEvents.create({
        userId: userB,
        eventType: "decision_made",
        description: "Otro usuario también quiere publicar su portfolio",
      });

      const results = await repos.memoryEvents.search(userA, "portfolio publicar");
      expect(results.length).toBe(2);
      expect(results[0]?.id).toBe(best.id);
      expect(results.every((r) => r.userId === userA)).toBe(true);
      expect(await repos.memoryEvents.search(userA, "entrenamiento")).toHaveLength(1);
      expect(await repos.memoryEvents.search(userA, "inexistente")).toHaveLength(0);

      const decisions = await repos.decisions.create({
        userId: userA,
        title: "Publicar portfolio",
        decision: "Antes de abrir otro proyecto",
        scopeJson: { kind: "no_new_projects" },
      });
      expect((await repos.decisions.search(userA, "portfolio"))[0]?.id).toBe(decisions.id);
      const obs = await repos.observations.create({
        userId: userA,
        type: "pattern",
        statement: "Escribe mejor de mañana",
      });
      expect((await repos.observations.search(userA, "mañana"))[0]?.id).toBe(obs.id);
    });

    // ------------------------------------------------------------ 13: setPrimary
    it("13. setPrimary swaps the primary atomically and rejects non-active projects", async () => {
      const a = await repos.projects.create({ userId: userA, name: "A", isPrimary: true });
      const b = await repos.projects.create({ userId: userA, name: "B" });
      const paused = await repos.projects.create({ userId: userA, name: "C", status: "paused" });

      expect((await repos.projects.getPrimary(userA))?.id).toBe(a.id);
      const result = await repos.projects.setPrimary(userA, b.id);
      expect(result.isPrimary).toBe(true);
      expect((await repos.projects.getById(userA, a.id))?.isPrimary).toBe(false);
      expect((await repos.projects.getPrimary(userA))?.id).toBe(b.id);

      await expect(repos.projects.setPrimary(userA, paused.id)).rejects.toSatisfy((e) =>
        isDomainError(e, "PRIMARY_NOT_ACTIVE"),
      );
      expect((await repos.projects.getPrimary(userA))?.id).toBe(b.id);

      // a second active primary via create is rejected
      await expect(repos.projects.create({ userId: userA, name: "D", isPrimary: true })).rejects.toSatisfy(
        (e) => isDomainError(e, "PRIMARY_ALREADY_SET") || isDomainError(e, "DUPLICATE"),
      );
    });

    // ------------------------------------------------------------ 12: active limit through repositories
    it("12. a fourth active project is rejected; pausing one frees a slot", async () => {
      await repos.projects.create({ userId: userA, name: "1" });
      await repos.projects.create({ userId: userA, name: "2" });
      const third = await repos.projects.create({ userId: userA, name: "3" });
      await expect(repos.projects.create({ userId: userA, name: "4" })).rejects.toSatisfy((e) =>
        isDomainError(e, "ACTIVE_PROJECT_LIMIT"),
      );
      await repos.projects.update(userA, third.id, { status: "paused" });
      const fourth = await repos.projects.create({ userId: userA, name: "4" });
      expect(fourth.status).toBe("active");
      await expect(repos.projects.update(userA, third.id, { status: "active" })).rejects.toSatisfy((e) =>
        isDomainError(e, "ACTIVE_PROJECT_LIMIT"),
      );
      // ideas never consume capacity
      await repos.ideas.create({ userId: userA, title: "idea" });
      // other users are independent
      const reposB = ctx.reposFor(userB);
      const pb = await reposB.projects.create({ userId: userB, name: "B1" });
      expect(pb.status).toBe("active");
    });

    // ------------------------------------------------------------ 14: reschedule_count
    it("14. reschedule_count increments only on user reschedules between non-null values", async () => {
      const t = await repos.tasks.create({ userId: userA, title: "T" });
      expect(t.rescheduleCount).toBe(0);
      const t1 = await repos.tasks.update(userA, t.id, { scheduledFor: "2026-09-04T10:00:00.000Z" });
      expect(t1.rescheduleCount).toBe(0); // null -> value
      const t2 = await repos.tasks.update(userA, t.id, { scheduledFor: "2026-09-05T10:00:00.000Z" });
      expect(t2.rescheduleCount).toBe(1); // value -> other value
      const t3 = await repos.tasks.update(userA, t.id, { scheduledFor: "2026-09-05T10:00:00.000Z" });
      expect(t3.rescheduleCount).toBe(1); // same value
      const t4 = await repos.tasks.update(userA, t.id, { title: "T2" });
      expect(t4.rescheduleCount).toBe(1); // unrelated patch
      const t5 = await repos.tasks.update(userA, t.id, { scheduledFor: null });
      expect(t5.rescheduleCount).toBe(1); // value -> null
      const t6 = await repos.tasks.update(userA, t.id, { scheduledFor: "2026-09-06T10:00:00.000Z" });
      expect(t6.rescheduleCount).toBe(1); // null -> value again
      const t7 = await repos.tasks.update(
        userA,
        t.id,
        { scheduledFor: "2026-09-07T10:00:00.000Z" },
        { source: "sync" },
      );
      expect(t7.rescheduleCount).toBe(1); // sync never increments (docs/18 §7.1)
      const t8 = await repos.tasks.update(userA, t.id, { scheduledFor: "2026-09-08T10:00:00.000Z" });
      expect(t8.rescheduleCount).toBe(2);
    });

    // ------------------------------------------------------------ 15: unique habit log per day
    it("15. duplicate (habit_id, log_date) is rejected", async () => {
      const habit = await repos.habits.create({
        userId: userA,
        name: "H",
        kind: "binary",
        frequency: "diario",
        frequencyJson: { period: "day", times: 1 },
      });
      await repos.habitLogs.create({
        userId: userA,
        habitId: habit.id,
        logDate: "2026-09-03",
        status: "done",
      });
      await expect(
        repos.habitLogs.create({
          userId: userA,
          habitId: habit.id,
          logDate: "2026-09-03",
          status: "partial",
        }),
      ).rejects.toSatisfy((e) => isDomainError(e, "DUPLICATE"));
    });

    // ------------------------------------------------------------ 10 (repository side): bootstrap idempotent
    it("10. bootstrapDefaults is idempotent and assigns budget categories", async () => {
      await repos.users.bootstrapDefaults(userA);
      await repos.users.bootstrapDefaults(userA);
      const areas = await repos.areas.listActive(userA);
      expect(areas.map((a) => [a.name, a.budgetCategory])).toEqual([
        ["Trabajo", "work"],
        ["Proyectos propios", "primary_projects"],
        ["Estudios", "learning"],
        ["Cuerpo", "body"],
        ["Finanzas", "admin"],
      ]);
      expect(await repos.areas.listByUser(userB)).toHaveLength(0);
    });

    // ------------------------------------------------------------ validation through domain schemas
    it("rejects malformed structured JSON before it reaches persistence", async () => {
      await expect(
        repos.habits.create({
          userId: userA,
          name: "H",
          kind: "binary",
          frequency: "x",
          // @ts-expect-error invalid on purpose
          frequencyJson: { times: 1 },
        }),
      ).rejects.toSatisfy((e) => isDomainError(e, "VALIDATION"));
      await expect(
        repos.decisions.create({
          userId: userA,
          title: "t",
          decision: "d",
          // @ts-expect-error invalid on purpose
          scopeJson: { kind: "nope" },
        }),
      ).rejects.toSatisfy((e) => isDomainError(e, "VALIDATION"));
      await expect(
        repos.behaviorObservations.create({
          userId: userA,
          // @ts-expect-error invalid on purpose
          frictionType: "lazy",
        }),
      ).rejects.toSatisfy((e) => isDomainError(e, "VALIDATION"));
      await expect(
        repos.calendarConnections.upsert({
          userId: userA,
          // @ts-expect-error invalid on purpose
          provider: "outlook",
        }),
      ).rejects.toSatisfy((e) => isDomainError(e, "VALIDATION"));
    });

    it("users.update changes settings and keeps email", async () => {
      const u = await repos.users.update(userA, {
        weeklyAvailableHours: 30,
        attentionBudgetTargets: { work: 15, primary_projects: 6, body: 3, learning: 4, admin: 2 },
        dayStart: "08:00:00",
        dayEnd: "18:00:00",
      });
      expect(u.weeklyAvailableHours).toBe(30);
      expect(u.attentionBudgetTargets.primary_projects).toBe(6);
      expect(u.dayStart).toBe("08:00:00");
      await expect(repos.users.update(userA, { dayStart: "20:00:00", dayEnd: "18:00:00" })).rejects.toSatisfy(
        (e) => isDomainError(e, "VALIDATION"),
      );
    });

    it("upserts (snapshots, checkins, reviews, cache) update instead of duplicating", async () => {
      await repos.attentionSnapshots.upsert({ userId: userA, snapshotDate: "2026-09-03", loadStatus: "LOW" });
      const s2 = await repos.attentionSnapshots.upsert({
        userId: userA,
        snapshotDate: "2026-09-03",
        loadStatus: "HIGH",
      });
      expect(s2.loadStatus).toBe("HIGH");
      expect(
        await repos.attentionSnapshots.listInRange(userA, { from: "2026-09-01", to: "2026-09-30" }),
      ).toHaveLength(1);

      await repos.checkins.upsert({ userId: userA, checkinDate: "2026-09-03", rawSummary: "a" });
      const c2 = await repos.checkins.upsert({ userId: userA, checkinDate: "2026-09-03", rawSummary: "b" });
      expect(c2.rawSummary).toBe("b");

      await repos.reviews.upsert({
        userId: userA,
        reviewType: "weekly",
        periodStart: "2026-08-31",
        periodEnd: "2026-09-06",
      });
      await repos.reviews.upsert({
        userId: userA,
        reviewType: "weekly",
        periodStart: "2026-08-31",
        periodEnd: "2026-09-06",
        summary: "s",
      });
      expect(await repos.reviews.list(userA, "weekly")).toHaveLength(1);

      const ev = {
        userId: userA,
        provider: "google" as const,
        externalId: "e1",
        title: "A",
        startAt: "2026-09-03T10:00:00.000Z",
        endAt: "2026-09-03T11:00:00.000Z",
      };
      await repos.calendarEventsCache.upsertMany([ev]);
      await repos.calendarEventsCache.upsertMany([{ ...ev, title: "B" }]);
      const inRange = await repos.calendarEventsCache.listInRange(userA, {
        from: "2026-09-03T00:00:00.000Z",
        to: "2026-09-04T00:00:00.000Z",
      });
      expect(inRange).toHaveLength(1);
      expect(inRange[0]?.title).toBe("B");
      expect(
        await repos.calendarEventsCache.listInRange(userA, {
          from: "2026-09-04T00:00:00.000Z",
          to: "2026-09-05T00:00:00.000Z",
        }),
      ).toHaveLength(0);
      expect(await repos.calendarEventsCache.deleteByExternalIds(userA, "google", ["e1", "nope"])).toBe(1);
    });
  });
}
