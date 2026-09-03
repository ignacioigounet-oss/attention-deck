/**
 * Domain entities for ATTENTION DECK.
 *
 * Every entity has two schemas:
 *   - `XSchema`      the persisted shape (what repositories return);
 *   - `XInputSchema` what a caller provides to create one (DB defaults are
 *                    expressed as Zod defaults so both persistence backends
 *                    behave identically).
 *
 * Timestamps are ISO-8601 strings; dates are `YYYY-MM-DD`. Numeric DB columns
 * are numbers. The domain never imports persistence or LLM code.
 */
import { z } from "zod";
import {
  ActivationStatus,
  ActivationStrategy,
  AreaStatus,
  AttentionKind,
  AttentionStatus,
  BehaviorSource,
  BudgetCategory,
  CalendarEventSource,
  CalendarEventStatus,
  CalendarProvider,
  CalendarTransparency,
  CommitmentStatus,
  EventType,
  FrictionType,
  HabitKind,
  HabitLogStatus,
  IdeaStatus,
  LoadStatus,
  MemoryStatus,
  MemoryType,
  ProjectStatus,
  ReviewType,
  TaskStatus,
} from "./enums";
import {
  AttentionBudgetTargetsSchema,
  BehaviorContextSchema,
  DecisionScopeSchema,
  EMPTY_BUDGET_TARGETS,
  FrequencySchema,
  SyncTokensSchema,
} from "./json";

const ts = () => z.string().min(1);
const date = () => z.iso.date();
const uuid = () => z.guid();
const nullableText = () => z.string().nullable().default(null);
const nullableTs = () => z.string().nullable().default(null);
const nullableDate = () => z.iso.date().nullable().default(null);
const nullableUuid = () => z.guid().nullable().default(null);
const jsonValue = () => z.unknown();

const id = { id: uuid() };
const created = { createdAt: ts() };
const updated = { updatedAt: ts() };

// ---------------------------------------------------------------- users

const UserBase = z.object({
  email: z.string(),
  displayName: z.string().default(""),
  timezone: z.string().default("America/Argentina/Buenos_Aires"),
  weeklyAvailableHours: z.number().positive().default(40),
  dayStart: z.string().default("09:00:00"),
  dayEnd: z.string().default("19:00:00"),
  attentionBudgetTargets: AttentionBudgetTargetsSchema.default(EMPTY_BUDGET_TARGETS),
});
export const UserSchema = UserBase.extend({ ...id, ...created, ...updated });
export const UserInputSchema = UserBase.extend({ id: uuid() });
export type User = z.infer<typeof UserSchema>;
export type UserInput = z.input<typeof UserInputSchema>;
export type UserUpdate = Partial<Omit<z.infer<typeof UserBase>, "email">>;

// ---------------------------------------------------------------- areas

const AreaBase = z.object({
  userId: uuid(),
  name: z.string().min(1),
  description: nullableText(),
  color: nullableText(),
  position: z.number().int().default(0),
  status: AreaStatus.default("active"),
  budgetCategory: BudgetCategory.nullable().default(null),
});
export const AreaSchema = AreaBase.extend({ ...id, ...created, ...updated });
export const AreaInputSchema = AreaBase;
export type Area = z.infer<typeof AreaSchema>;
export type AreaInput = z.input<typeof AreaInputSchema>;
export type AreaUpdate = Partial<Omit<z.infer<typeof AreaBase>, "userId">>;

// ---------------------------------------------------------------- projects

const ProjectBase = z.object({
  userId: uuid(),
  areaId: nullableUuid(),
  name: z.string().min(1),
  description: nullableText(),
  status: ProjectStatus.default("active"),
  priority: z.number().int().min(1).max(5).default(3),
  goal: nullableText(),
  successCriteria: nullableText(),
  startDate: nullableDate(),
  targetDate: nullableDate(),
  lastActivityAt: nullableTs(),
  nextReviewAt: nullableTs(),
  nextAction: nullableText(),
  currentBlocker: nullableText(),
  energyRequired: z.number().int().min(1).max(5).nullable().default(null),
  desiredFrequency: nullableText(),
  isPrimary: z.boolean().default(false),
  completedAt: nullableTs(),
});
export const ProjectSchema = ProjectBase.extend({ ...id, ...created, ...updated });
export const ProjectInputSchema = ProjectBase;
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectInput = z.input<typeof ProjectInputSchema>;
export type ProjectUpdate = Partial<Omit<z.infer<typeof ProjectBase>, "userId" | "isPrimary">>;

// ---------------------------------------------------------------- tasks

const TaskBase = z.object({
  userId: uuid(),
  projectId: nullableUuid(),
  title: z.string().min(1),
  description: nullableText(),
  status: TaskStatus.default("todo"),
  priority: z.number().int().min(1).max(5).default(3),
  scheduledFor: nullableTs(),
  dueDate: nullableTs(),
  estimatedMinutes: z.number().int().positive().nullable().default(null),
  energyLevel: z.number().int().min(1).max(5).nullable().default(null),
  rescheduleCount: z.number().int().min(0).default(0),
  completedAt: nullableTs(),
});
export const TaskSchema = TaskBase.extend({ ...id, ...created, ...updated });
export const TaskInputSchema = TaskBase;
export type Task = z.infer<typeof TaskSchema>;
export type TaskInput = z.input<typeof TaskInputSchema>;
export type TaskUpdate = Partial<Omit<z.infer<typeof TaskBase>, "userId" | "rescheduleCount">>;

// ---------------------------------------------------------------- commitments

const CommitmentBase = z.object({
  userId: uuid(),
  projectId: nullableUuid(),
  description: z.string().min(1),
  frequency: z.string().min(1),
  frequencyJson: FrequencySchema,
  targetCount: z.number().int().nullable().default(null),
  startDate: date(),
  endDate: nullableDate(),
  status: CommitmentStatus.default("active"),
  lastCheckedAt: nullableTs(),
  currentStreak: z.number().int().default(0),
});
export const CommitmentSchema = CommitmentBase.extend({ ...id, ...created, ...updated });
export const CommitmentInputSchema = CommitmentBase;
export type Commitment = z.infer<typeof CommitmentSchema>;
export type CommitmentInput = z.input<typeof CommitmentInputSchema>;
export type CommitmentUpdate = Partial<Omit<z.infer<typeof CommitmentBase>, "userId">>;

const CommitmentLogBase = z.object({
  commitmentId: uuid(),
  userId: uuid(),
  logDate: date(),
  status: HabitLogStatus,
  value: z.number().nullable().default(null),
  note: nullableText(),
  source: nullableText(),
});
export const CommitmentLogSchema = CommitmentLogBase.extend({ ...id, ...created });
export const CommitmentLogInputSchema = CommitmentLogBase;
export type CommitmentLog = z.infer<typeof CommitmentLogSchema>;
export type CommitmentLogInput = z.input<typeof CommitmentLogInputSchema>;

// ---------------------------------------------------------------- ideas

const IdeaBase = z.object({
  userId: uuid(),
  title: z.string().min(1),
  description: nullableText(),
  areaId: nullableUuid(),
  source: nullableText(),
  status: IdeaStatus.default("idea"),
  reviewAt: nullableTs(),
});
export const IdeaSchema = IdeaBase.extend({ ...id, ...created, ...updated });
export const IdeaInputSchema = IdeaBase;
export type Idea = z.infer<typeof IdeaSchema>;
export type IdeaInput = z.input<typeof IdeaInputSchema>;
export type IdeaUpdate = Partial<Omit<z.infer<typeof IdeaBase>, "userId">>;

// ---------------------------------------------------------------- decisions

const DecisionBase = z.object({
  userId: uuid(),
  title: z.string().min(1),
  decision: z.string().min(1),
  reason: nullableText(),
  scope: nullableText(),
  scopeJson: DecisionScopeSchema.default({ kind: "custom" }),
  reviewDate: nullableDate(),
  status: MemoryStatus.default("active"),
});
export const DecisionSchema = DecisionBase.extend({ ...id, ...created, ...updated });
export const DecisionInputSchema = DecisionBase;
export type Decision = z.infer<typeof DecisionSchema>;
export type DecisionInput = z.input<typeof DecisionInputSchema>;
export type DecisionUpdate = Partial<Omit<z.infer<typeof DecisionBase>, "userId">>;

// ---------------------------------------------------------------- observations

const ObservationBase = z.object({
  userId: uuid(),
  type: MemoryType,
  statement: z.string().min(1),
  confidence: z.number().min(0).max(1).nullable().default(null),
  evidenceCount: z.number().int().min(0).default(1),
  firstObservedAt: ts().optional(),
  lastObservedAt: ts().optional(),
  status: MemoryStatus.default("active"),
});
export const ObservationSchema = ObservationBase.extend({
  ...id,
  ...created,
  ...updated,
  firstObservedAt: ts(),
  lastObservedAt: ts(),
});
export const ObservationInputSchema = ObservationBase;
export type Observation = z.infer<typeof ObservationSchema>;
export type ObservationInput = z.input<typeof ObservationInputSchema>;
export type ObservationUpdate = Partial<Omit<z.infer<typeof ObservationBase>, "userId">>;

// ---------------------------------------------------------------- memory events

const MemoryEventBase = z.object({
  userId: uuid(),
  eventType: EventType,
  description: z.string().min(1),
  projectId: nullableUuid(),
  areaId: nullableUuid(),
  occurredAt: ts().optional(),
  source: nullableText(),
  importance: z.number().int().min(1).max(5).default(3),
});
export const MemoryEventSchema = MemoryEventBase.extend({ ...id, ...created, occurredAt: ts() });
export const MemoryEventInputSchema = MemoryEventBase;
export type MemoryEvent = z.infer<typeof MemoryEventSchema>;
export type MemoryEventInput = z.input<typeof MemoryEventInputSchema>;

// ---------------------------------------------------------------- habits

const HabitBase = z.object({
  userId: uuid(),
  areaId: nullableUuid(),
  projectId: nullableUuid(),
  name: z.string().min(1),
  description: nullableText(),
  kind: HabitKind,
  targetCount: z.number().int().nullable().default(null),
  targetMinutes: z.number().int().nullable().default(null),
  unit: nullableText(),
  frequency: z.string().min(1),
  frequencyJson: FrequencySchema,
  active: z.boolean().default(true),
  startDate: date().optional(),
  endDate: nullableDate(),
});
export const HabitSchema = HabitBase.extend({ ...id, ...created, ...updated, startDate: date() });
export const HabitInputSchema = HabitBase;
export type Habit = z.infer<typeof HabitSchema>;
export type HabitInput = z.input<typeof HabitInputSchema>;
export type HabitUpdate = Partial<Omit<z.infer<typeof HabitBase>, "userId">>;

const HabitLogBase = z.object({
  habitId: uuid(),
  userId: uuid(),
  logDate: date(),
  status: HabitLogStatus,
  value: z.number().nullable().default(null),
  note: nullableText(),
  source: nullableText(),
});
export const HabitLogSchema = HabitLogBase.extend({ ...id, ...created });
export const HabitLogInputSchema = HabitLogBase;
export type HabitLog = z.infer<typeof HabitLogSchema>;
export type HabitLogInput = z.input<typeof HabitLogInputSchema>;

// ---------------------------------------------------------------- attention

const AttentionItemBase = z.object({
  userId: uuid(),
  kind: AttentionKind,
  status: AttentionStatus.default("active"),
  title: z.string().min(1),
  evidence: nullableText(),
  interpretation: nullableText(),
  recommendedAction: nullableText(),
  severity: z.number().int().min(1).max(5).default(3),
  entityType: nullableText(),
  entityId: nullableUuid(),
  detectedAt: ts().optional(),
  resolvedAt: nullableTs(),
});
export const AttentionItemSchema = AttentionItemBase.extend({ ...id, detectedAt: ts() });
export const AttentionItemInputSchema = AttentionItemBase;
export type AttentionItem = z.infer<typeof AttentionItemSchema>;
export type AttentionItemInput = z.input<typeof AttentionItemInputSchema>;
export type AttentionItemUpdate = Partial<Omit<z.infer<typeof AttentionItemBase>, "userId">>;

const AttentionSnapshotBase = z.object({
  userId: uuid(),
  snapshotDate: date(),
  primaryFocus: nullableText(),
  availableHours: z.number().nullable().default(null),
  committedHours: z.number().nullable().default(null),
  plannedHours: z.number().nullable().default(null),
  attentionBudget: jsonValue().default({}),
  loadStatus: LoadStatus.nullable().default(null),
});
export const AttentionSnapshotSchema = AttentionSnapshotBase.extend({ ...id, ...created });
export const AttentionSnapshotInputSchema = AttentionSnapshotBase;
export type AttentionSnapshot = z.infer<typeof AttentionSnapshotSchema>;
export type AttentionSnapshotInput = z.input<typeof AttentionSnapshotInputSchema>;

// ---------------------------------------------------------------- activation / behavior

const ActivationBase = z.object({
  userId: uuid(),
  projectId: nullableUuid(),
  taskId: nullableUuid(),
  strategy: ActivationStrategy,
  rationale: nullableText(),
  timerMinutes: z.number().int().positive().nullable().default(null),
  status: ActivationStatus.default("suggested"),
  suggestedAt: ts().optional(),
  startedAt: nullableTs(),
  completedAt: nullableTs(),
});
export const ActivationSchema = ActivationBase.extend({ ...id, suggestedAt: ts() });
export const ActivationInputSchema = ActivationBase;
export type Activation = z.infer<typeof ActivationSchema>;
export type ActivationInput = z.input<typeof ActivationInputSchema>;
export type ActivationUpdate = Partial<Omit<z.infer<typeof ActivationBase>, "userId">>;

const BehaviorObservationBase = z.object({
  userId: uuid(),
  entityType: nullableText(),
  entityId: nullableUuid(),
  frictionType: FrictionType,
  context: nullableText(),
  contextJson: BehaviorContextSchema.nullable().default(null),
  confidence: z.number().min(0).max(1).nullable().default(null),
  source: BehaviorSource.default("reported"),
  strategy: ActivationStrategy.nullable().default(null),
  activationId: nullableUuid(),
  outcome: nullableText(),
  helpful: z.boolean().nullable().default(null),
  observedAt: ts().optional(),
});
export const BehaviorObservationSchema = BehaviorObservationBase.extend({ ...id, observedAt: ts() });
export const BehaviorObservationInputSchema = BehaviorObservationBase;
export type BehaviorObservation = z.infer<typeof BehaviorObservationSchema>;
export type BehaviorObservationInput = z.input<typeof BehaviorObservationInputSchema>;
export type BehaviorObservationUpdate = Partial<Omit<z.infer<typeof BehaviorObservationBase>, "userId">>;

// ---------------------------------------------------------------- conversations

const ConversationBase = z.object({
  userId: uuid(),
  sessionId: z.string().min(1),
  startedAt: ts().optional(),
  endedAt: nullableTs(),
  summary: nullableText(),
});
export const ConversationSchema = ConversationBase.extend({ ...id, startedAt: ts() });
export const ConversationInputSchema = ConversationBase;
export type Conversation = z.infer<typeof ConversationSchema>;
export type ConversationInput = z.input<typeof ConversationInputSchema>;
export type ConversationUpdate = Partial<Omit<z.infer<typeof ConversationBase>, "userId">>;

// ---------------------------------------------------------------- calendar

const CalendarConnectionBase = z.object({
  userId: uuid(),
  provider: CalendarProvider,
  providerAccountEmail: nullableText(),
  accessTokenEncrypted: nullableText(),
  refreshTokenEncrypted: nullableText(),
  tokenExpiresAt: nullableTs(),
  scopes: z.array(z.string()).default([]),
  syncTokens: SyncTokensSchema.default({}),
  selectedCalendarIds: z.array(z.string()).default([]),
  writeCalendarId: nullableText(),
  status: z.string().default("active"),
});
export const CalendarConnectionSchema = CalendarConnectionBase.extend({ ...id, ...created, ...updated });
export const CalendarConnectionInputSchema = CalendarConnectionBase;
export type CalendarConnection = z.infer<typeof CalendarConnectionSchema>;
export type CalendarConnectionInput = z.input<typeof CalendarConnectionInputSchema>;
export type CalendarConnectionUpdate = Partial<
  Omit<z.infer<typeof CalendarConnectionBase>, "userId" | "provider">
>;

const CalendarEventCacheBase = z.object({
  userId: uuid(),
  provider: CalendarProvider,
  externalId: z.string().min(1),
  calendarId: nullableText(),
  title: z.string(),
  description: nullableText(),
  startAt: ts(),
  endAt: ts(),
  calendarName: nullableText(),
  status: CalendarEventStatus.default("confirmed"),
  allDay: z.boolean().default(false),
  transparency: CalendarTransparency.default("opaque"),
  source: CalendarEventSource.default("google"),
  projectId: nullableUuid(),
  taskId: nullableUuid(),
  habitId: nullableUuid(),
  hasAttendees: z.boolean().default(false),
  updatedAtRemote: nullableTs(),
  lastSyncedAt: ts().optional(),
});
export const CalendarEventCacheSchema = CalendarEventCacheBase.extend({ ...id, lastSyncedAt: ts() });
export const CalendarEventCacheInputSchema = CalendarEventCacheBase;
export type CalendarEventCache = z.infer<typeof CalendarEventCacheSchema>;
export type CalendarEventCacheInput = z.input<typeof CalendarEventCacheInputSchema>;
export type CalendarEventCacheUpdate = Partial<
  Omit<z.infer<typeof CalendarEventCacheBase>, "userId" | "provider" | "externalId">
>;

// ---------------------------------------------------------------- audit / loop

const AuditLogBase = z.object({
  userId: uuid(),
  actor: z.string().min(1),
  actionType: z.string().min(1),
  entityType: nullableText(),
  entityId: nullableUuid(),
  inputSummary: nullableText(),
  resultSummary: nullableText(),
});
export const AuditLogSchema = AuditLogBase.extend({ ...id, ...created });
export const AuditLogInputSchema = AuditLogBase;
export type AuditLogEntry = z.infer<typeof AuditLogSchema>;
export type AuditLogInput = z.input<typeof AuditLogInputSchema>;

const CheckinBase = z.object({
  userId: uuid(),
  checkinDate: date(),
  rawSummary: nullableText(),
  accomplishments: jsonValue().default([]),
  unfinished: jsonValue().default([]),
  tomorrow: jsonValue().default([]),
});
export const CheckinSchema = CheckinBase.extend({ ...id, ...created });
export const CheckinInputSchema = CheckinBase;
export type Checkin = z.infer<typeof CheckinSchema>;
export type CheckinInput = z.input<typeof CheckinInputSchema>;
export type CheckinUpdate = Partial<Omit<z.infer<typeof CheckinBase>, "userId" | "checkinDate">>;

const ReviewBase = z.object({
  userId: uuid(),
  reviewType: ReviewType,
  periodStart: date(),
  periodEnd: date(),
  summary: nullableText(),
  payload: jsonValue().default({}),
});
export const ReviewSchema = ReviewBase.extend({ ...id, ...created });
export const ReviewInputSchema = ReviewBase;
export type Review = z.infer<typeof ReviewSchema>;
export type ReviewInput = z.input<typeof ReviewInputSchema>;
export type ReviewUpdate = Partial<Pick<z.infer<typeof ReviewBase>, "summary" | "payload">>;
