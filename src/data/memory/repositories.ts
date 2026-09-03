/**
 * In-memory implementation of the repository contracts.
 * Enforces the same invariants the database enforces (unique constraints,
 * active-project limit, single primary) so the shared test-suite runs
 * unchanged against both backends.
 */
import { z } from "zod";
import { DomainError } from "@/domain/errors";
import { sameInstant } from "@/domain/time";
import {
  ActivationInputSchema,
  ActivationSchema,
  AreaInputSchema,
  AreaSchema,
  AttentionItemInputSchema,
  AttentionItemSchema,
  AttentionSnapshotInputSchema,
  AttentionSnapshotSchema,
  AuditLogInputSchema,
  AuditLogSchema,
  BehaviorObservationInputSchema,
  BehaviorObservationSchema,
  CalendarConnectionInputSchema,
  CalendarConnectionSchema,
  CalendarEventCacheInputSchema,
  CalendarEventCacheSchema,
  CheckinInputSchema,
  CheckinSchema,
  CommitmentInputSchema,
  CommitmentLogInputSchema,
  CommitmentLogSchema,
  CommitmentSchema,
  ConversationInputSchema,
  ConversationSchema,
  DecisionInputSchema,
  DecisionSchema,
  HabitInputSchema,
  HabitLogInputSchema,
  HabitLogSchema,
  HabitSchema,
  IdeaInputSchema,
  IdeaSchema,
  MemoryEventInputSchema,
  MemoryEventSchema,
  ObservationInputSchema,
  ObservationSchema,
  ProjectInputSchema,
  ProjectSchema,
  ReviewInputSchema,
  ReviewSchema,
  TaskInputSchema,
  TaskSchema,
  UserSchema,
  type Activation,
  type Area,
  type AttentionItem,
  type AttentionKind,
  type AttentionSnapshot,
  type AttentionStatus,
  type AuditLogEntry,
  type BehaviorObservation,
  type BudgetCategory,
  type CalendarConnection,
  type CalendarEventCache,
  type CalendarProvider,
  type Checkin,
  type Commitment,
  type CommitmentLog,
  type Conversation,
  type Decision,
  type Habit,
  type HabitLog,
  type Idea,
  type MemoryEvent,
  type MemoryType,
  type Observation,
  type Project,
  type ProjectStatus,
  type Review,
  type ReviewType,
  type Task,
  type TaskUpdate,
  type User,
  type UserUpdate,
} from "@/domain/types";
import { INVARIANTS } from "@/domain/policies/defaults";
import type {
  ActivationsRepository,
  AreasRepository,
  AttentionItemsRepository,
  AttentionSnapshotsRepository,
  AuditLogRepository,
  BaseRepository,
  BehaviorObservationsRepository,
  CalendarConnectionsRepository,
  CalendarEventsCacheRepository,
  CheckinsRepository,
  CommitmentLogsRepository,
  CommitmentsRepository,
  ConversationsRepository,
  DateRange,
  DecisionsRepository,
  HabitLogsRepository,
  HabitsRepository,
  IdeasRepository,
  MemoryEventsQuery,
  MemoryEventsRepository,
  ObservationsRepository,
  ProjectsRepository,
  Repositories,
  ReviewsRepository,
  ScopeQuery,
  TaskUpdateOptions,
  TasksRepository,
  TimeRange,
  UsersRepository,
} from "@/data/repositories/interfaces";
import { MemoryStore } from "./store";

type Row = { id: string; userId: string };

const notFound = (what: string, id: string) => new DomainError(`${what} ${id} not found`, "NOT_FOUND");

function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success) throw new DomainError(r.error.message, "VALIDATION");
  return r.data;
}

const byCreatedDesc = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt);

/** Generic CRUD over a store table with optional hooks for invariants. */
class MemoryBase<T extends Row, TInput, TUpdate extends object> implements BaseRepository<
  T,
  TInput,
  TUpdate
> {
  constructor(
    protected readonly store: MemoryStore,
    protected readonly table: string,
    protected readonly schema: z.ZodType<T>,
    protected readonly inputSchema: z.ZodType<unknown>,
    protected readonly opts: {
      timestamps?: { created?: boolean; updated?: boolean };
      /** extra generated columns with their default producer */
      generated?: Record<string, (store: MemoryStore) => unknown>;
      /** unique keys (arrays of field names) */
      unique?: string[][];
      beforeWrite?: (next: T, prev: T | null, all: T[]) => void;
    } = {},
  ) {}

  protected rows(): Map<string, T> {
    return this.store.table<T>(this.table);
  }

  protected all(): T[] {
    return [...this.rows().values()];
  }

  protected assertUnique(next: T, prev: T | null): void {
    for (const key of this.opts.unique ?? []) {
      const clash = this.all().find(
        (r) =>
          r.id !== next.id &&
          (prev === null || r.id !== prev.id) &&
          key.every((k) => (r as Record<string, unknown>)[k] === (next as Record<string, unknown>)[k]),
      );
      if (clash) throw new DomainError(`duplicate key (${key.join(",")}) in ${this.table}`, "DUPLICATE");
    }
  }

  protected build(input: unknown, extra: Record<string, unknown> = {}): T {
    const parsedInput = validate(this.inputSchema, input) as Record<string, unknown>;
    const now = this.store.now();
    const generated: Record<string, unknown> = {};
    for (const [k, fn] of Object.entries(this.opts.generated ?? {})) {
      if (parsedInput[k] === undefined || parsedInput[k] === null) generated[k] = fn(this.store);
    }
    const candidate = {
      ...parsedInput,
      ...generated,
      id: this.store.newId(),
      ...(this.opts.timestamps?.created === false ? {} : { createdAt: now }),
      ...(this.opts.timestamps?.updated ? { updatedAt: now } : {}),
      ...extra,
    };
    return validate(this.schema, candidate);
  }

  protected insert(row: T): T {
    this.assertUnique(row, null);
    this.opts.beforeWrite?.(row, null, this.all());
    this.rows().set(row.id, row);
    return row;
  }

  async create(input: TInput): Promise<T> {
    return this.insert(this.build(input));
  }

  async getById(userId: string, id: string): Promise<T | null> {
    const r = this.rows().get(id);
    return r && r.userId === userId ? r : null;
  }

  protected applyPatch(prev: T, patch: object): T {
    const now = this.store.now();
    const next = validate(this.schema, {
      ...prev,
      ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
      ...(this.opts.timestamps?.updated ? { updatedAt: now } : {}),
    });
    this.assertUnique(next, prev);
    this.opts.beforeWrite?.(next, prev, this.all());
    this.rows().set(next.id, next);
    return next;
  }

  async update(userId: string, id: string, patch: TUpdate): Promise<T> {
    const prev = await this.getById(userId, id);
    if (!prev) throw notFound(this.table, id);
    return this.applyPatch(prev, patch);
  }

  async delete(userId: string, id: string): Promise<void> {
    const prev = await this.getById(userId, id);
    if (!prev) throw notFound(this.table, id);
    this.rows().delete(id);
  }

  async listByUser(userId: string): Promise<T[]> {
    return this.all().filter((r) => r.userId === userId);
  }
}

// ---------------------------------------------------------------- users

class MemoryUsers implements UsersRepository {
  constructor(
    private readonly store: MemoryStore,
    private readonly areas: MemoryAreas,
  ) {}
  private rows() {
    return this.store.table<User>("users");
  }
  /** Test helper mirroring the auth trigger: creates a user row. */
  createForAuth(input: { id: string; email: string; displayName?: string }): User {
    const now = this.store.now();
    const u = validate(UserSchema, {
      id: input.id,
      email: input.email,
      displayName: input.displayName ?? input.email.split("@")[0],
      createdAt: now,
      updatedAt: now,
    });
    this.rows().set(u.id, u);
    return u;
  }
  async getById(id: string): Promise<User | null> {
    return this.rows().get(id) ?? null;
  }
  async update(id: string, patch: UserUpdate): Promise<User> {
    const prev = this.rows().get(id);
    if (!prev) throw notFound("users", id);
    const next = validate(UserSchema, {
      ...prev,
      ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
      updatedAt: this.store.now(),
    });
    if (next.dayEnd <= next.dayStart) throw new DomainError("day_end must be after day_start", "VALIDATION");
    this.rows().set(id, next);
    return next;
  }
  async bootstrapDefaults(userId: string): Promise<void> {
    if (!this.rows().has(userId)) throw new DomainError(`user ${userId} does not exist`, "NOT_FOUND");
    const defaults: Array<[string, string, number, BudgetCategory]> = [
      ["Trabajo", "Clientes y producción profesional", 1, "work"],
      ["Proyectos propios", "Portfolio y obra propia", 2, "primary_projects"],
      ["Estudios", "Licenciatura y obligaciones académicas", 3, "learning"],
      ["Cuerpo", "Entrenamiento y recuperación", 4, "body"],
      ["Finanzas", "Ingresos, gastos, deuda y presupuesto", 5, "admin"],
    ];
    const existing = new Set((await this.areas.listByUser(userId)).map((a) => a.name));
    for (const [name, description, position, budgetCategory] of defaults) {
      if (existing.has(name)) continue;
      await this.areas.create({ userId, name, description, position, budgetCategory });
    }
  }
}

// ---------------------------------------------------------------- areas

class MemoryAreas
  extends MemoryBase<Area, z.input<typeof AreaInputSchema>, object>
  implements AreasRepository
{
  constructor(store: MemoryStore) {
    super(store, "areas", AreaSchema, AreaInputSchema, {
      timestamps: { updated: true },
      unique: [["userId", "name"]],
    });
  }
  async listActive(userId: string): Promise<Area[]> {
    return (await this.listByUser(userId))
      .filter((a) => a.status === "active")
      .sort((a, b) => a.position - b.position);
  }
}

// ---------------------------------------------------------------- projects

class MemoryProjects
  extends MemoryBase<Project, z.input<typeof ProjectInputSchema>, object>
  implements ProjectsRepository
{
  constructor(store: MemoryStore) {
    super(store, "projects", ProjectSchema, ProjectInputSchema, {
      timestamps: { updated: true },
      beforeWrite: (next, prev, all) => {
        const others = all.filter((p) => p.userId === next.userId && p.id !== next.id);
        if (next.status === "active" && prev?.status !== "active") {
          const active = others.filter((p) => p.status === "active").length;
          if (active >= INVARIANTS.maxActiveProjects) {
            throw new DomainError("active project limit reached (max 3)", "ACTIVE_PROJECT_LIMIT");
          }
        }
        if (next.isPrimary && next.status === "active") {
          if (others.some((p) => p.isPrimary && p.status === "active")) {
            throw new DomainError("one primary project per user", "PRIMARY_ALREADY_SET");
          }
        }
      },
    });
  }
  async listActive(userId: string): Promise<Project[]> {
    return (await this.listByUser(userId))
      .filter((p) => p.status === "active")
      .sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        const la = a.lastActivityAt ?? "";
        const lb = b.lastActivityAt ?? "";
        return la.localeCompare(lb);
      });
  }
  async listByStatus(userId: string, status: ProjectStatus): Promise<Project[]> {
    return (await this.listByUser(userId)).filter((p) => p.status === status).sort(byCreatedDesc);
  }
  async getPrimary(userId: string): Promise<Project | null> {
    return (await this.listByUser(userId)).find((p) => p.isPrimary && p.status === "active") ?? null;
  }
  async setPrimary(userId: string, projectId: string): Promise<Project> {
    const target = await this.getById(userId, projectId);
    if (!target) throw notFound("projects", projectId);
    if (target.status !== "active")
      throw new DomainError("only active projects can be primary", "PRIMARY_NOT_ACTIVE");
    for (const p of await this.listByUser(userId)) {
      if (p.isPrimary && p.id !== projectId)
        this.rows().set(p.id, { ...p, isPrimary: false, updatedAt: this.store.now() });
    }
    const next = { ...target, isPrimary: true, updatedAt: this.store.now() };
    this.rows().set(next.id, next);
    return next;
  }
}

// ---------------------------------------------------------------- tasks

class MemoryTasks
  extends MemoryBase<Task, z.input<typeof TaskInputSchema>, TaskUpdate>
  implements TasksRepository
{
  constructor(store: MemoryStore) {
    super(store, "tasks", TaskSchema, TaskInputSchema, { timestamps: { updated: true } });
  }
  override async update(
    userId: string,
    id: string,
    patch: TaskUpdate,
    options: TaskUpdateOptions = {},
  ): Promise<Task> {
    const prev = await this.getById(userId, id);
    if (!prev) throw notFound("tasks", id);
    const source = options.source ?? "user";
    let rescheduleCount = prev.rescheduleCount;
    if (
      source === "user" &&
      patch.scheduledFor !== undefined &&
      prev.scheduledFor !== null &&
      patch.scheduledFor !== null &&
      !sameInstant(patch.scheduledFor, prev.scheduledFor)
    ) {
      rescheduleCount += 1;
    }
    return this.applyPatch(prev, { ...patch, rescheduleCount });
  }
  async listByProject(userId: string, projectId: string): Promise<Task[]> {
    return (await this.listByUser(userId)).filter((t) => t.projectId === projectId).sort(byCreatedDesc);
  }
  async listOpen(userId: string): Promise<Task[]> {
    return (await this.listByUser(userId)).filter((t) => t.status === "todo" || t.status === "in_progress");
  }
}

// ---------------------------------------------------------------- commitments

class MemoryCommitments
  extends MemoryBase<Commitment, z.input<typeof CommitmentInputSchema>, object>
  implements CommitmentsRepository
{
  constructor(store: MemoryStore) {
    super(store, "commitments", CommitmentSchema, CommitmentInputSchema, { timestamps: { updated: true } });
  }
  async listActive(userId: string): Promise<Commitment[]> {
    return (await this.listByUser(userId)).filter((c) => c.status === "active");
  }
}

const inDateRange = (d: string, r: DateRange) => d >= r.from && d <= r.to;

class MemoryCommitmentLogs
  extends MemoryBase<CommitmentLog, z.input<typeof CommitmentLogInputSchema>, object>
  implements CommitmentLogsRepository
{
  constructor(store: MemoryStore) {
    super(store, "commitment_logs", CommitmentLogSchema, CommitmentLogInputSchema, {
      unique: [["commitmentId", "logDate"]],
    });
  }
  async listInRange(userId: string, range: DateRange, commitmentId?: string): Promise<CommitmentLog[]> {
    return (await this.listByUser(userId))
      .filter((l) => inDateRange(l.logDate, range) && (!commitmentId || l.commitmentId === commitmentId))
      .sort((a, b) => a.logDate.localeCompare(b.logDate));
  }
}

// ---------------------------------------------------------------- ideas

class MemoryIdeas
  extends MemoryBase<Idea, z.input<typeof IdeaInputSchema>, object>
  implements IdeasRepository
{
  constructor(store: MemoryStore) {
    super(store, "ideas", IdeaSchema, IdeaInputSchema, { timestamps: { updated: true } });
  }
}

// ---------------------------------------------------------------- text search (in-memory approximation)

const tokens = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9ñ]+/)
    .filter((t) => t.length > 1);

/** Ranks by number of query tokens found as substrings; ties broken by the caller. */
function textRank(text: string, query: string): number {
  const hay = tokens(text).join(" ");
  const q = tokens(query);
  if (q.length === 0) return 0;
  return q.filter((t) => hay.includes(t)).length;
}

// ---------------------------------------------------------------- decisions

class MemoryDecisions
  extends MemoryBase<Decision, z.input<typeof DecisionInputSchema>, object>
  implements DecisionsRepository
{
  constructor(store: MemoryStore) {
    super(store, "decisions", DecisionSchema, DecisionInputSchema, { timestamps: { updated: true } });
  }
  async listActiveByScope(userId: string, query: ScopeQuery): Promise<Decision[]> {
    return (await this.listByUser(userId))
      .filter((d) => d.status === "active")
      .filter((d) => !query.kind || d.scopeJson.kind === query.kind)
      .filter((d) => d.scopeJson.entityId === undefined || d.scopeJson.entityId === query.entityId)
      .sort(byCreatedDesc);
  }
  async search(userId: string, query: string, limit = 8): Promise<Decision[]> {
    return (await this.listByUser(userId))
      .map((d) => ({ d, r: textRank(`${d.title} ${d.decision} ${d.reason ?? ""}`, query) }))
      .filter((x) => x.r > 0)
      .sort((a, b) => b.r - a.r || byCreatedDesc(a.d, b.d))
      .slice(0, Math.min(Math.max(limit, 1), 20))
      .map((x) => x.d);
  }
}

// ---------------------------------------------------------------- observations

class MemoryObservations
  extends MemoryBase<Observation, z.input<typeof ObservationInputSchema>, object>
  implements ObservationsRepository
{
  constructor(store: MemoryStore) {
    super(store, "observations", ObservationSchema, ObservationInputSchema, {
      timestamps: { updated: true },
      generated: { firstObservedAt: (s) => s.now(), lastObservedAt: (s) => s.now() },
    });
  }
  async listActive(userId: string, type?: MemoryType): Promise<Observation[]> {
    return (await this.listByUser(userId))
      .filter((o) => o.status === "active" && (!type || o.type === type))
      .sort((a, b) => b.lastObservedAt.localeCompare(a.lastObservedAt));
  }
  async search(userId: string, query: string, limit = 8): Promise<Observation[]> {
    return (await this.listByUser(userId))
      .map((o) => ({ o, r: textRank(o.statement, query) }))
      .filter((x) => x.r > 0)
      .sort((a, b) => b.r - a.r || b.o.lastObservedAt.localeCompare(a.o.lastObservedAt))
      .slice(0, Math.min(Math.max(limit, 1), 20))
      .map((x) => x.o);
  }
}

// ---------------------------------------------------------------- memory events

class MemoryMemoryEvents
  extends MemoryBase<MemoryEvent, z.input<typeof MemoryEventInputSchema>, object>
  implements MemoryEventsRepository
{
  constructor(store: MemoryStore) {
    super(store, "memory_events", MemoryEventSchema, MemoryEventInputSchema, {
      generated: { occurredAt: (s) => s.now() },
    });
  }
  async listRecent(userId: string, query: MemoryEventsQuery = {}): Promise<MemoryEvent[]> {
    return (await this.listByUser(userId))
      .filter((e) => !query.since || e.occurredAt >= query.since)
      .filter((e) => !query.projectId || e.projectId === query.projectId)
      .filter((e) => query.minImportance === undefined || e.importance >= query.minImportance)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, query.limit ?? 50);
  }
  async search(userId: string, query: string, limit = 8): Promise<MemoryEvent[]> {
    return (await this.listByUser(userId))
      .map((e) => ({ e, r: textRank(e.description, query) }))
      .filter((x) => x.r > 0)
      .sort((a, b) => b.r - a.r || b.e.occurredAt.localeCompare(a.e.occurredAt))
      .slice(0, Math.min(Math.max(limit, 1), 20))
      .map((x) => x.e);
  }
}

// ---------------------------------------------------------------- habits

class MemoryHabits
  extends MemoryBase<Habit, z.input<typeof HabitInputSchema>, object>
  implements HabitsRepository
{
  constructor(store: MemoryStore) {
    super(store, "habits", HabitSchema, HabitInputSchema, {
      timestamps: { updated: true },
      generated: { startDate: (s) => s.today() },
    });
  }
  async listActive(userId: string): Promise<Habit[]> {
    return (await this.listByUser(userId)).filter((h) => h.active);
  }
}

class MemoryHabitLogs
  extends MemoryBase<HabitLog, z.input<typeof HabitLogInputSchema>, object>
  implements HabitLogsRepository
{
  constructor(store: MemoryStore) {
    super(store, "habit_logs", HabitLogSchema, HabitLogInputSchema, { unique: [["habitId", "logDate"]] });
  }
  async listInRange(userId: string, range: DateRange, habitId?: string): Promise<HabitLog[]> {
    return (await this.listByUser(userId))
      .filter((l) => inDateRange(l.logDate, range) && (!habitId || l.habitId === habitId))
      .sort((a, b) => a.logDate.localeCompare(b.logDate));
  }
}

// ---------------------------------------------------------------- attention

class MemoryAttentionItems
  extends MemoryBase<AttentionItem, z.input<typeof AttentionItemInputSchema>, object>
  implements AttentionItemsRepository
{
  constructor(store: MemoryStore) {
    super(store, "attention_items", AttentionItemSchema, AttentionItemInputSchema, {
      timestamps: { created: false },
      generated: { detectedAt: (s) => s.now() },
    });
  }
  async listActive(userId: string): Promise<AttentionItem[]> {
    return (await this.listByUser(userId))
      .filter((i) => i.status === "active")
      .sort((a, b) => b.severity - a.severity || b.detectedAt.localeCompare(a.detectedAt));
  }
  async findByKindAndEntity(
    userId: string,
    kind: AttentionKind,
    entityId: string | null,
    status?: AttentionStatus,
  ): Promise<AttentionItem[]> {
    return (await this.listByUser(userId))
      .filter((i) => i.kind === kind && i.entityId === entityId && (!status || i.status === status))
      .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  }
}

class MemoryAttentionSnapshots implements AttentionSnapshotsRepository {
  private readonly base;
  constructor(private readonly store: MemoryStore) {
    this.base = new (class extends MemoryBase<AttentionSnapshot, unknown, object> {})(
      store,
      "attention_snapshots",
      AttentionSnapshotSchema,
      AttentionSnapshotInputSchema,
      { unique: [["userId", "snapshotDate"]] },
    );
  }
  async upsert(input: z.input<typeof AttentionSnapshotInputSchema>): Promise<AttentionSnapshot> {
    const parsed = validate(AttentionSnapshotInputSchema, input);
    const existing = await this.getByDate(parsed.userId, parsed.snapshotDate);
    if (existing) return this.base.update(parsed.userId, existing.id, parsed);
    return this.base.create(parsed);
  }
  async getByDate(userId: string, snapshotDate: string): Promise<AttentionSnapshot | null> {
    return (await this.base.listByUser(userId)).find((s) => s.snapshotDate === snapshotDate) ?? null;
  }
  async listInRange(userId: string, range: DateRange): Promise<AttentionSnapshot[]> {
    return (await this.base.listByUser(userId))
      .filter((s) => inDateRange(s.snapshotDate, range))
      .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
  }
}

// ---------------------------------------------------------------- activation / behavior

class MemoryActivations
  extends MemoryBase<Activation, z.input<typeof ActivationInputSchema>, object>
  implements ActivationsRepository
{
  constructor(store: MemoryStore) {
    super(store, "activations", ActivationSchema, ActivationInputSchema, {
      timestamps: { created: false },
      generated: { suggestedAt: (s) => s.now() },
    });
  }
  async listSince(userId: string, since: string): Promise<Activation[]> {
    return (await this.listByUser(userId))
      .filter((a) => a.suggestedAt >= since)
      .sort((a, b) => b.suggestedAt.localeCompare(a.suggestedAt));
  }
}

class MemoryBehaviorObservations
  extends MemoryBase<BehaviorObservation, z.input<typeof BehaviorObservationInputSchema>, object>
  implements BehaviorObservationsRepository
{
  constructor(store: MemoryStore) {
    super(store, "behavior_observations", BehaviorObservationSchema, BehaviorObservationInputSchema, {
      timestamps: { created: false },
      generated: { observedAt: (s) => s.now() },
    });
  }
  async listSince(userId: string, since: string, entityId?: string): Promise<BehaviorObservation[]> {
    return (await this.listByUser(userId))
      .filter((o) => o.observedAt >= since && (!entityId || o.entityId === entityId))
      .sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  }
}

// ---------------------------------------------------------------- conversations

class MemoryConversations
  extends MemoryBase<Conversation, z.input<typeof ConversationInputSchema>, object>
  implements ConversationsRepository
{
  constructor(store: MemoryStore) {
    super(store, "conversations", ConversationSchema, ConversationInputSchema, {
      timestamps: { created: false },
      generated: { startedAt: (s) => s.now() },
    });
  }
}

// ---------------------------------------------------------------- calendar

class MemoryCalendarConnections implements CalendarConnectionsRepository {
  private readonly base;
  constructor(store: MemoryStore) {
    this.base = new (class extends MemoryBase<CalendarConnection, unknown, object> {})(
      store,
      "calendar_connections",
      CalendarConnectionSchema,
      CalendarConnectionInputSchema,
      { timestamps: { updated: true }, unique: [["userId", "provider"]] },
    );
  }
  async getByProvider(userId: string, provider: CalendarProvider): Promise<CalendarConnection | null> {
    return (await this.base.listByUser(userId)).find((c) => c.provider === provider) ?? null;
  }
  async upsert(input: z.input<typeof CalendarConnectionInputSchema>): Promise<CalendarConnection> {
    const parsed = validate(CalendarConnectionInputSchema, input);
    const existing = await this.getByProvider(parsed.userId, parsed.provider);
    if (existing) return this.base.update(parsed.userId, existing.id, parsed);
    return this.base.create(parsed);
  }
  update(userId: string, id: string, patch: object): Promise<CalendarConnection> {
    return this.base.update(userId, id, patch);
  }
  delete(userId: string, id: string): Promise<void> {
    return this.base.delete(userId, id);
  }
}

class MemoryCalendarEventsCache implements CalendarEventsCacheRepository {
  private readonly base;
  constructor(private readonly store: MemoryStore) {
    this.base = new (class extends MemoryBase<CalendarEventCache, unknown, object> {})(
      store,
      "calendar_events_cache",
      CalendarEventCacheSchema,
      CalendarEventCacheInputSchema,
      {
        timestamps: { created: false },
        generated: { lastSyncedAt: (s) => s.now() },
        unique: [["userId", "provider", "externalId"]],
      },
    );
  }
  async upsertMany(inputs: z.input<typeof CalendarEventCacheInputSchema>[]): Promise<CalendarEventCache[]> {
    const out: CalendarEventCache[] = [];
    for (const input of inputs) {
      const parsed = validate(CalendarEventCacheInputSchema, input);
      const existing = (await this.base.listByUser(parsed.userId)).find(
        (e) => e.provider === parsed.provider && e.externalId === parsed.externalId,
      );
      out.push(
        existing
          ? await this.base.update(parsed.userId, existing.id, { ...parsed, lastSyncedAt: this.store.now() })
          : await this.base.create(parsed),
      );
    }
    return out;
  }
  async listInRange(userId: string, range: TimeRange): Promise<CalendarEventCache[]> {
    return (await this.base.listByUser(userId))
      .filter((e) => e.startAt < range.to && e.endAt > range.from)
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  }
  async deleteByExternalIds(
    userId: string,
    provider: CalendarProvider,
    externalIds: string[],
  ): Promise<number> {
    const ids = new Set(externalIds);
    let n = 0;
    for (const e of await this.base.listByUser(userId)) {
      if (e.provider === provider && ids.has(e.externalId)) {
        await this.base.delete(userId, e.id);
        n += 1;
      }
    }
    return n;
  }
}

// ---------------------------------------------------------------- audit / loop

class MemoryAuditLog
  extends MemoryBase<AuditLogEntry, z.input<typeof AuditLogInputSchema>, object>
  implements AuditLogRepository
{
  constructor(store: MemoryStore) {
    super(store, "audit_log", AuditLogSchema, AuditLogInputSchema);
  }
  async listRecent(userId: string, limit = 50): Promise<AuditLogEntry[]> {
    return (await this.listByUser(userId)).sort(byCreatedDesc).slice(0, limit);
  }
}

class MemoryCheckins implements CheckinsRepository {
  private readonly base;
  constructor(store: MemoryStore) {
    this.base = new (class extends MemoryBase<Checkin, unknown, object> {})(
      store,
      "checkins",
      CheckinSchema,
      CheckinInputSchema,
      { unique: [["userId", "checkinDate"]] },
    );
  }
  async upsert(input: z.input<typeof CheckinInputSchema>): Promise<Checkin> {
    const parsed = validate(CheckinInputSchema, input);
    const existing = await this.getByDate(parsed.userId, parsed.checkinDate);
    if (existing) return this.base.update(parsed.userId, existing.id, parsed);
    return this.base.create(parsed);
  }
  async getByDate(userId: string, checkinDate: string): Promise<Checkin | null> {
    return (await this.base.listByUser(userId)).find((c) => c.checkinDate === checkinDate) ?? null;
  }
  update(userId: string, id: string, patch: object): Promise<Checkin> {
    return this.base.update(userId, id, patch);
  }
}

class MemoryReviews implements ReviewsRepository {
  private readonly base;
  constructor(store: MemoryStore) {
    this.base = new (class extends MemoryBase<Review, unknown, object> {})(
      store,
      "reviews",
      ReviewSchema,
      ReviewInputSchema,
      { unique: [["userId", "reviewType", "periodStart", "periodEnd"]] },
    );
  }
  async upsert(input: z.input<typeof ReviewInputSchema>): Promise<Review> {
    const parsed = validate(ReviewInputSchema, input);
    const existing = await this.getByPeriod(
      parsed.userId,
      parsed.reviewType,
      parsed.periodStart,
      parsed.periodEnd,
    );
    if (existing) return this.base.update(parsed.userId, existing.id, parsed);
    return this.base.create(parsed);
  }
  async getByPeriod(
    userId: string,
    reviewType: ReviewType,
    periodStart: string,
    periodEnd: string,
  ): Promise<Review | null> {
    return (
      (await this.base.listByUser(userId)).find(
        (r) => r.reviewType === reviewType && r.periodStart === periodStart && r.periodEnd === periodEnd,
      ) ?? null
    );
  }
  async list(userId: string, reviewType?: ReviewType): Promise<Review[]> {
    return (await this.base.listByUser(userId))
      .filter((r) => !reviewType || r.reviewType === reviewType)
      .sort((a, b) => b.periodStart.localeCompare(a.periodStart));
  }
  update(userId: string, id: string, patch: object): Promise<Review> {
    return this.base.update(userId, id, patch);
  }
}

// ---------------------------------------------------------------- factory

export interface MemoryRepositories extends Repositories {
  users: MemoryUsers;
  store: MemoryStore;
}

export function createMemoryRepositories(store = new MemoryStore()): MemoryRepositories {
  const areas = new MemoryAreas(store);
  return {
    store,
    users: new MemoryUsers(store, areas),
    areas,
    projects: new MemoryProjects(store),
    tasks: new MemoryTasks(store),
    commitments: new MemoryCommitments(store),
    commitmentLogs: new MemoryCommitmentLogs(store),
    ideas: new MemoryIdeas(store),
    decisions: new MemoryDecisions(store),
    observations: new MemoryObservations(store),
    memoryEvents: new MemoryMemoryEvents(store),
    habits: new MemoryHabits(store),
    habitLogs: new MemoryHabitLogs(store),
    attentionItems: new MemoryAttentionItems(store),
    attentionSnapshots: new MemoryAttentionSnapshots(store),
    activations: new MemoryActivations(store),
    behaviorObservations: new MemoryBehaviorObservations(store),
    conversations: new MemoryConversations(store),
    calendarConnections: new MemoryCalendarConnections(store),
    calendarEventsCache: new MemoryCalendarEventsCache(store),
    auditLog: new MemoryAuditLog(store),
    checkins: new MemoryCheckins(store),
    reviews: new MemoryReviews(store),
  };
}
