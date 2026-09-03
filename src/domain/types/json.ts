import { z } from "zod";
import { BudgetCategory } from "./enums";

/** S3 — structured frequency for habits and commitments. */
export const FrequencySchema = z.object({
  period: z.enum(["day", "week", "month"]),
  times: z.number().int().min(1),
  /** 0 = Sunday … 6 = Saturday. Only meaningful for period = 'day'. */
  days: z.array(z.number().int().min(0).max(6)).optional(),
  minutesPerOccurrence: z.number().int().positive().optional(),
});
export type Frequency = z.infer<typeof FrequencySchema>;

/** S4 — structured decision scope. */
export const DecisionScopeKind = z.enum([
  "no_new_projects",
  "protect_project",
  "pause_project",
  "pause_area",
  "limit_commitments",
  "custom",
]);
export const DecisionScopeSchema = z.object({
  kind: DecisionScopeKind,
  entityId: z.guid().optional(),
  until: z.iso.date().optional(),
  limit: z.number().int().min(0).optional(),
});
export type DecisionScope = z.infer<typeof DecisionScopeSchema>;

/** S5 — context captured with a behavior observation (docs/18 §3.5). */
export const BehaviorContextSchema = z.object({
  timeOfDay: z.enum(["morning", "afternoon", "evening", "night"]).optional(),
  energy: z.number().int().min(1).max(5).optional(),
  environment: z.string().max(200).optional(),
  protectedBlock: z.boolean().optional(),
  loadStatus: z.enum(["LOW", "HEALTHY", "HIGH", "OVERLOADED"]).optional(),
});
export type BehaviorContext = z.infer<typeof BehaviorContextSchema>;

/** S9 — weekly hour targets per budget category. */
export const AttentionBudgetTargetsSchema = z.object(
  Object.fromEntries(BudgetCategory.options.map((c) => [c, z.number().min(0)])) as Record<
    BudgetCategory,
    z.ZodNumber
  >,
);
export type AttentionBudgetTargets = z.infer<typeof AttentionBudgetTargetsSchema>;

export const EMPTY_BUDGET_TARGETS: AttentionBudgetTargets = {
  work: 0,
  primary_projects: 0,
  body: 0,
  learning: 0,
  admin: 0,
};

/** S8 — calendarId -> Google syncToken. */
export const SyncTokensSchema = z.record(z.string(), z.string());
export type SyncTokens = z.infer<typeof SyncTokensSchema>;
