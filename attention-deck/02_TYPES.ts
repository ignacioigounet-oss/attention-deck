import { z } from "zod";

export const ProjectStatus = z.enum(["active","paused","blocked","completed","archived"]);
export const TaskStatus = z.enum(["todo","in_progress","done","cancelled"]);
export const HabitKind = z.enum(["binary","frequency","duration","streak"]);
export const AttentionKind = z.enum([
  "stagnation","overload","repetition","contradiction",
  "decision_conflict","deadline","opportunity"
]);
export const ActivationStrategy = z.enum([
  "reduce_scope","make_concrete","lower_quality_bar",
  "implementation_intention","externalize_commitment",
  "remove_choices","close_loop","physical_activation","other"
]);

export interface ProjectRecord {
  id: string;
  userId: string;
  areaId: string | null;
  name: string;
  status: z.infer<typeof ProjectStatus>;
  priority: number;
  goal: string | null;
  nextAction: string | null;
  currentBlocker: string | null;
  lastActivityAt: string | null;
  targetDate: string | null;
  isPrimary: boolean;
}

export interface TaskRecord {
  id: string;
  userId: string;
  projectId: string | null;
  title: string;
  status: z.infer<typeof TaskStatus>;
  priority: number;
  estimatedMinutes: number | null;
  dueDate: string | null;
}

export interface CommitmentRecord {
  id: string;
  description: string;
  frequency: string;
  status: string;
  currentStreak: number;
}

export interface HabitRecord {
  id: string;
  name: string;
  kind: z.infer<typeof HabitKind>;
  frequency: string;
  targetCount: number | null;
  targetMinutes: number | null;
  active: boolean;
}

export interface CalendarEventRecord {
  id: string;
  externalId?: string;
  title: string;
  startAt: string;
  endAt: string;
  calendarName?: string | null;
}

export interface DecisionRecord {
  id: string;
  title: string;
  decision: string;
  reason?: string | null;
  reviewDate?: string | null;
}

export interface PatternRecord {
  id: string;
  statement: string;
  confidence: number | null;
  evidenceCount: number;
}

export interface AttentionRecord {
  id: string;
  kind: z.infer<typeof AttentionKind>;
  title: string;
  evidence: string | null;
  interpretation: string | null;
  recommendedAction: string | null;
  severity: number;
}

export interface WeeklyLoad {
  availableHours: number;
  committedHours: number;
  plannedHours: number;
  recoveryMargin: number;
  status: "LOW" | "HEALTHY" | "HIGH" | "OVERLOADED";
}

export interface AttentionBudget {
  work: number;
  primaryProjects: number;
  body: number;
  learning: number;
  admin: number;
}

export interface BehaviorSignal {
  frictionType: string;
  entityId: string | null;
  observedAt: string;
  strategy: z.infer<typeof ActivationStrategy> | null;
  outcome: string | null;
  helpful: boolean | null;
}

export interface ContextPacket {
  date: string;
  timezone: string;
  primaryProject: ProjectRecord | null;
  activeProjects: ProjectRecord[];
  todayEvents: CalendarEventRecord[];
  openCommitments: CommitmentRecord[];
  activeHabits: HabitRecord[];
  recentDecisions: DecisionRecord[];
  relevantPatterns: PatternRecord[];
  activeAttention: AttentionRecord[];
  currentLoad: WeeklyLoad;
  attentionBudget: AttentionBudget;
  recentBehaviorSignals: BehaviorSignal[];
}
