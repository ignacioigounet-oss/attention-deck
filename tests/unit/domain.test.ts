import { describe, expect, it } from "vitest";
import { camelizeKeys, snakeizeKeys, toCamel, toSnake } from "@/data/mapping";
import { DEFAULT_POLICY, INVARIANTS } from "@/domain/policies/defaults";
import { sameInstant } from "@/domain/time";
import {
  AttentionBudgetTargetsSchema,
  BehaviorContextSchema,
  DecisionScopeSchema,
  FrequencySchema,
  ProjectInputSchema,
  TaskInputSchema,
} from "@/domain/types";

describe("mapping", () => {
  it("converts keys both ways without touching nested JSON", () => {
    expect(toCamel("last_activity_at")).toBe("lastActivityAt");
    expect(toSnake("lastActivityAt")).toBe("last_activity_at");
    const row = { user_id: "u", frequency_json: { minutes_per_occurrence: 1 } };
    expect(camelizeKeys(row)).toEqual({ userId: "u", frequencyJson: { minutes_per_occurrence: 1 } });
    expect(snakeizeKeys({ userId: "u", x: undefined })).toEqual({ user_id: "u" });
  });
});

describe("structured json schemas", () => {
  it("frequency", () => {
    expect(FrequencySchema.safeParse({ period: "week", times: 3 }).success).toBe(true);
    expect(FrequencySchema.safeParse({ period: "day", times: 1, days: [1, 3, 5] }).success).toBe(true);
    expect(FrequencySchema.safeParse({ period: "week" }).success).toBe(false);
    expect(FrequencySchema.safeParse({ period: "week", times: 0 }).success).toBe(false);
    expect(FrequencySchema.safeParse({ period: "day", times: 1, days: [7] }).success).toBe(false);
  });
  it("decision scope", () => {
    expect(DecisionScopeSchema.safeParse({ kind: "no_new_projects" }).success).toBe(true);
    expect(DecisionScopeSchema.safeParse({ kind: "protect_project", entityId: "not-a-uuid" }).success).toBe(
      false,
    );
    expect(
      DecisionScopeSchema.safeParse({ kind: "limit_commitments", limit: 3, until: "2026-12-31" }).success,
    ).toBe(true);
  });
  it("behavior context and budget targets", () => {
    expect(BehaviorContextSchema.safeParse({ timeOfDay: "noon" }).success).toBe(false);
    expect(BehaviorContextSchema.safeParse({ energy: 6 }).success).toBe(false);
    expect(AttentionBudgetTargetsSchema.safeParse({ work: 1 }).success).toBe(false);
    expect(
      AttentionBudgetTargetsSchema.safeParse({ work: 1, primary_projects: 2, body: 3, learning: 4, admin: 5 })
        .success,
    ).toBe(true);
  });
});

describe("entity input defaults mirror the database", () => {
  it("project", () => {
    const p = ProjectInputSchema.parse({ userId: "11111111-1111-1111-1111-111111111111", name: "P" });
    expect(p).toMatchObject({
      status: "active",
      priority: 3,
      isPrimary: false,
      nextAction: null,
      areaId: null,
    });
  });
  it("task", () => {
    const t = TaskInputSchema.parse({ userId: "11111111-1111-1111-1111-111111111111", title: "T" });
    expect(t).toMatchObject({ status: "todo", priority: 3, rescheduleCount: 0, scheduledFor: null });
    expect(TaskInputSchema.safeParse({ userId: "x", title: "T" }).success).toBe(false);
    expect(
      TaskInputSchema.safeParse({
        userId: "11111111-1111-1111-1111-111111111111",
        title: "T",
        estimatedMinutes: 0,
      }).success,
    ).toBe(false);
  });
});

describe("policy and time helpers", () => {
  it("defaults match docs/18 §0", () => {
    expect(DEFAULT_POLICY.stagnation).toEqual({
      days: 7,
      daysPrimary: 5,
      noNextActionDays: 3,
      minPriority: 3,
    });
    expect(DEFAULT_POLICY.overload.healthyRatio).toBe(0.85);
    expect(DEFAULT_POLICY.activation.defaultTimerMinutes).toBe(10);
    expect(DEFAULT_POLICY.memory.packetTokenBudget).toBe(3000);
    expect(INVARIANTS).toEqual({ maxActiveProjects: 3, maxPrimaryProjects: 1 });
  });
  it("sameInstant ignores ISO formatting differences", () => {
    expect(sameInstant("2026-09-05T10:00:00.000Z", "2026-09-05T10:00:00+00:00")).toBe(true);
    expect(sameInstant("2026-09-05T10:00:00Z", "2026-09-05T10:00:01Z")).toBe(false);
    expect(sameInstant(null, null)).toBe(true);
    expect(sameInstant(null, "2026-09-05T10:00:00Z")).toBe(false);
  });
});
