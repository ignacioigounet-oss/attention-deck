import { z } from "zod";

// Enums mirror the PostgreSQL enums in supabase/migrations/0001_init.sql.
// The DB is the source of truth; tests/db/schema.test.ts checks they stay aligned.

export const AreaStatus = z.enum(["active", "archived"]);
export const ProjectStatus = z.enum(["active", "paused", "blocked", "completed", "archived"]);
export const TaskStatus = z.enum(["todo", "in_progress", "done", "cancelled"]);
export const CommitmentStatus = z.enum(["active", "paused", "completed", "cancelled"]);
export const IdeaStatus = z.enum(["idea", "considering", "promoted", "archived"]);
export const MemoryType = z.enum(["fact", "pattern", "risk", "preference"]);
export const MemoryStatus = z.enum(["active", "superseded", "archived"]);
export const EventType = z.enum([
  "project_progress",
  "task_completed",
  "commitment_completed",
  "commitment_missed",
  "decision_made",
  "project_blocked",
  "project_completed",
  "habit_logged",
  "calendar_action",
  "checkin",
]);
export const HabitKind = z.enum(["binary", "frequency", "duration", "streak"]);
export const HabitLogStatus = z.enum(["done", "not_done", "partial", "skipped"]);
export const AttentionStatus = z.enum(["active", "resolved", "dismissed"]);
export const AttentionKind = z.enum([
  "stagnation",
  "overload",
  "repetition",
  "contradiction",
  "decision_conflict",
  "deadline",
  "opportunity",
]);
export const ActivationStrategy = z.enum([
  "reduce_scope",
  "make_concrete",
  "lower_quality_bar",
  "implementation_intention",
  "externalize_commitment",
  "remove_choices",
  "close_loop",
  "physical_activation",
  "other",
]);
export const ActivationStatus = z.enum(["suggested", "started", "completed", "dismissed"]);
export const CalendarProvider = z.enum(["google"]);
export const FrictionType = z.enum([
  "ambiguity",
  "task_too_large",
  "perfectionism",
  "evaluation_fear",
  "boredom",
  "low_energy",
  "distraction",
  "environment",
  "no_external_structure",
  "reward_too_distant",
  "too_many_options",
  "no_time",
]);
export const BudgetCategory = z.enum(["work", "primary_projects", "body", "learning", "admin"]);
export const LoadStatus = z.enum(["LOW", "HEALTHY", "HIGH", "OVERLOADED"]);

export const BehaviorSource = z.enum(["structural", "reported", "checkin"]);
export const CalendarEventStatus = z.enum(["confirmed", "tentative", "cancelled"]);
export const CalendarTransparency = z.enum(["opaque", "transparent"]);
export const CalendarEventSource = z.enum(["google", "attention_deck"]);
export const ReviewType = z.enum(["weekly", "monthly"]);

export type AreaStatus = z.infer<typeof AreaStatus>;
export type ProjectStatus = z.infer<typeof ProjectStatus>;
export type TaskStatus = z.infer<typeof TaskStatus>;
export type CommitmentStatus = z.infer<typeof CommitmentStatus>;
export type IdeaStatus = z.infer<typeof IdeaStatus>;
export type MemoryType = z.infer<typeof MemoryType>;
export type MemoryStatus = z.infer<typeof MemoryStatus>;
export type EventType = z.infer<typeof EventType>;
export type HabitKind = z.infer<typeof HabitKind>;
export type HabitLogStatus = z.infer<typeof HabitLogStatus>;
export type AttentionStatus = z.infer<typeof AttentionStatus>;
export type AttentionKind = z.infer<typeof AttentionKind>;
export type ActivationStrategy = z.infer<typeof ActivationStrategy>;
export type ActivationStatus = z.infer<typeof ActivationStatus>;
export type CalendarProvider = z.infer<typeof CalendarProvider>;
export type FrictionType = z.infer<typeof FrictionType>;
export type BudgetCategory = z.infer<typeof BudgetCategory>;
export type LoadStatus = z.infer<typeof LoadStatus>;
export type BehaviorSource = z.infer<typeof BehaviorSource>;
export type ReviewType = z.infer<typeof ReviewType>;

/** Name -> values, used to verify alignment with the database enums. */
export const DB_ENUMS = {
  area_status: AreaStatus.options,
  project_status: ProjectStatus.options,
  task_status: TaskStatus.options,
  commitment_status: CommitmentStatus.options,
  idea_status: IdeaStatus.options,
  memory_type: MemoryType.options,
  memory_status: MemoryStatus.options,
  event_type: EventType.options,
  habit_kind: HabitKind.options,
  habit_log_status: HabitLogStatus.options,
  attention_status: AttentionStatus.options,
  attention_kind: AttentionKind.options,
  activation_strategy: ActivationStrategy.options,
  activation_status: ActivationStatus.options,
  calendar_provider: CalendarProvider.options,
  friction_type: FrictionType.options,
  budget_category: BudgetCategory.options,
  load_status: LoadStatus.options,
} as const;
