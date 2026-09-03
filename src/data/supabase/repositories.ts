/**
 * Supabase (PostgREST) implementation of the repository contracts.
 * RLS is the ownership boundary; every query still filters by user_id.
 * All rows are validated with the domain Zod schemas on the way out.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
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
import { camelizeKeys, snakeizeKeys } from "@/data/mapping";
import type { Database } from "./database.types";
import { mapSupabaseError } from "./errors";

export type Client = SupabaseClient<Database>;
type TableName = keyof Database["public"]["Tables"];

const notFound = (what: string, id: string) => new DomainError(`${what} ${id} not found`, "NOT_FOUND");

function parseRow<T>(schema: z.ZodType<T>, row: unknown): T {
  const r = schema.safeParse(camelizeKeys(row as Record<string, unknown>));
  if (!r.success) throw new DomainError(`row does not match domain schema: ${r.error.message}`, "VALIDATION");
  return r.data;
}

function toRow(schema: z.ZodType<unknown>, input: unknown): Record<string, unknown> {
  const r = schema.safeParse(input);
  if (!r.success) throw new DomainError(r.error.message, "VALIDATION");
  return snakeizeKeys(r.data as Record<string, unknown>);
}

function patchToRow(patch: object): Record<string, unknown> {
  return snakeizeKeys(patch as Record<string, unknown>);
}

class SupabaseBase<T, TInput, TUpdate extends object> implements BaseRepository<T, TInput, TUpdate> {
  /**
   * PostgREST's generic typing cannot be expressed over a runtime table name
   * (the row type collapses to the intersection of all tables), so the base
   * class works through an untyped client and re-validates every result with
   * the domain Zod schema. Entity classes with literal table names stay typed.
   */
  protected readonly db: SupabaseClient;

  constructor(
    protected readonly client: Client,
    protected readonly table: TableName,
    protected readonly schema: z.ZodType<T>,
    protected readonly inputSchema: z.ZodType<unknown>,
  ) {
    this.db = client as unknown as SupabaseClient;
  }

  protected from() {
    return this.db.from(this.table);
  }

  protected fail(
    e: { code?: string | null; message?: string | null; details?: string | null },
    ctx: string,
  ): never {
    throw mapSupabaseError(e, `${this.table}.${ctx}`);
  }

  async create(input: TInput): Promise<T> {
    const { data, error } = await this.from()
      .insert(toRow(this.inputSchema, input) as never)
      .select()
      .single();
    if (error) this.fail(error, "create");
    return parseRow(this.schema, data);
  }

  async getById(userId: string, id: string): Promise<T | null> {
    const { data, error } = await this.from().select().eq("id", id).eq("user_id", userId).maybeSingle();
    if (error) this.fail(error, "getById");
    return data ? parseRow(this.schema, data) : null;
  }

  async update(userId: string, id: string, patch: TUpdate): Promise<T> {
    const { data, error } = await this.from()
      .update(patchToRow(patch) as never)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .maybeSingle();
    if (error) this.fail(error, "update");
    if (!data) throw notFound(this.table, id);
    return parseRow(this.schema, data);
  }

  async delete(userId: string, id: string): Promise<void> {
    const { data, error } = await this.from().delete().eq("id", id).eq("user_id", userId).select("id");
    if (error) this.fail(error, "delete");
    if (!data || data.length === 0) throw notFound(this.table, id);
  }

  async listByUser(userId: string): Promise<T[]> {
    const { data, error } = await this.from()
      .select()
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) this.fail(error, "listByUser");
    return (data ?? []).map((r) => parseRow(this.schema, r));
  }

  protected parseMany(rows: unknown[] | null): T[] {
    return (rows ?? []).map((r) => parseRow(this.schema, r));
  }
}

// ---------------------------------------------------------------- users

class SupabaseUsers implements UsersRepository {
  constructor(private readonly client: Client) {}
  async getById(id: string): Promise<User | null> {
    const { data, error } = await this.client.from("users").select().eq("id", id).maybeSingle();
    if (error) throw mapSupabaseError(error, "users.getById");
    return data ? parseRow(UserSchema, data) : null;
  }
  async update(id: string, patch: UserUpdate): Promise<User> {
    const { data, error } = await this.client
      .from("users")
      .update(patchToRow(patch) as never)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw mapSupabaseError(error, "users.update");
    if (!data) throw notFound("users", id);
    return parseRow(UserSchema, data);
  }
  async bootstrapDefaults(userId: string): Promise<void> {
    const { error } = await this.client.rpc("bootstrap_defaults", { p_user_id: userId });
    if (error) throw mapSupabaseError(error, "users.bootstrapDefaults");
  }
}

// ---------------------------------------------------------------- areas

class SupabaseAreas
  extends SupabaseBase<Area, z.input<typeof AreaInputSchema>, object>
  implements AreasRepository
{
  constructor(client: Client) {
    super(client, "areas", AreaSchema, AreaInputSchema);
  }
  async listActive(userId: string): Promise<Area[]> {
    const { data, error } = await this.from()
      .select()
      .eq("user_id", userId)
      .eq("status", "active")
      .order("position", { ascending: true });
    if (error) this.fail(error, "listActive");
    return this.parseMany(data);
  }
}

// ---------------------------------------------------------------- projects

class SupabaseProjects
  extends SupabaseBase<Project, z.input<typeof ProjectInputSchema>, object>
  implements ProjectsRepository
{
  constructor(client: Client) {
    super(client, "projects", ProjectSchema, ProjectInputSchema);
  }
  async listActive(userId: string): Promise<Project[]> {
    const { data, error } = await this.from()
      .select()
      .eq("user_id", userId)
      .eq("status", "active")
      .order("priority", { ascending: false })
      .order("last_activity_at", { ascending: true, nullsFirst: true });
    if (error) this.fail(error, "listActive");
    return this.parseMany(data);
  }
  async listByStatus(userId: string, status: ProjectStatus): Promise<Project[]> {
    const { data, error } = await this.from()
      .select()
      .eq("user_id", userId)
      .eq("status", status)
      .order("created_at", { ascending: false });
    if (error) this.fail(error, "listByStatus");
    return this.parseMany(data);
  }
  async getPrimary(userId: string): Promise<Project | null> {
    const { data, error } = await this.from()
      .select()
      .eq("user_id", userId)
      .eq("is_primary", true)
      .eq("status", "active")
      .maybeSingle();
    if (error) this.fail(error, "getPrimary");
    return data ? parseRow(this.schema, data) : null;
  }
  async setPrimary(userId: string, projectId: string): Promise<Project> {
    const existing = await this.getById(userId, projectId);
    if (!existing) throw notFound("projects", projectId);
    const { data, error } = await this.client.rpc("set_primary_project", { p_project_id: projectId });
    if (error) this.fail(error, "setPrimary");
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw notFound("projects", projectId);
    return parseRow(this.schema, row);
  }
}

// ---------------------------------------------------------------- tasks

class SupabaseTasks
  extends SupabaseBase<Task, z.input<typeof TaskInputSchema>, TaskUpdate>
  implements TasksRepository
{
  constructor(client: Client) {
    super(client, "tasks", TaskSchema, TaskInputSchema);
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
    const row = patchToRow(patch);
    if (
      source === "user" &&
      patch.scheduledFor !== undefined &&
      prev.scheduledFor !== null &&
      patch.scheduledFor !== null &&
      !sameInstant(patch.scheduledFor, prev.scheduledFor)
    ) {
      row.reschedule_count = prev.rescheduleCount + 1;
    }
    const { data, error } = await this.from()
      .update(row as never)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .maybeSingle();
    if (error) this.fail(error, "update");
    if (!data) throw notFound("tasks", id);
    return parseRow(this.schema, data);
  }
  async listByProject(userId: string, projectId: string): Promise<Task[]> {
    const { data, error } = await this.from()
      .select()
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) this.fail(error, "listByProject");
    return this.parseMany(data);
  }
  async listOpen(userId: string): Promise<Task[]> {
    const { data, error } = await this.from()
      .select()
      .eq("user_id", userId)
      .in("status", ["todo", "in_progress"]);
    if (error) this.fail(error, "listOpen");
    return this.parseMany(data);
  }
}

// ---------------------------------------------------------------- commitments

class SupabaseCommitments
  extends SupabaseBase<Commitment, z.input<typeof CommitmentInputSchema>, object>
  implements CommitmentsRepository
{
  constructor(client: Client) {
    super(client, "commitments", CommitmentSchema, CommitmentInputSchema);
  }
  async listActive(userId: string): Promise<Commitment[]> {
    const { data, error } = await this.from().select().eq("user_id", userId).eq("status", "active");
    if (error) this.fail(error, "listActive");
    return this.parseMany(data);
  }
}

class SupabaseCommitmentLogs
  extends SupabaseBase<CommitmentLog, z.input<typeof CommitmentLogInputSchema>, object>
  implements CommitmentLogsRepository
{
  constructor(client: Client) {
    super(client, "commitment_logs", CommitmentLogSchema, CommitmentLogInputSchema);
  }
  async listInRange(userId: string, range: DateRange, commitmentId?: string): Promise<CommitmentLog[]> {
    let q = this.from().select().eq("user_id", userId).gte("log_date", range.from).lte("log_date", range.to);
    if (commitmentId) q = q.eq("commitment_id", commitmentId);
    const { data, error } = await q.order("log_date", { ascending: true });
    if (error) this.fail(error, "listInRange");
    return this.parseMany(data);
  }
}

// ---------------------------------------------------------------- ideas

class SupabaseIdeas
  extends SupabaseBase<Idea, z.input<typeof IdeaInputSchema>, object>
  implements IdeasRepository
{
  constructor(client: Client) {
    super(client, "ideas", IdeaSchema, IdeaInputSchema);
  }
}

// ---------------------------------------------------------------- decisions

const clampLimit = (n: number) => Math.min(Math.max(n, 1), 20);

class SupabaseDecisions
  extends SupabaseBase<Decision, z.input<typeof DecisionInputSchema>, object>
  implements DecisionsRepository
{
  constructor(client: Client) {
    super(client, "decisions", DecisionSchema, DecisionInputSchema);
  }
  async listActiveByScope(userId: string, query: ScopeQuery): Promise<Decision[]> {
    let q = this.from().select().eq("user_id", userId).eq("status", "active");
    if (query.kind) q = q.eq("scope_json->>kind", query.kind);
    q = query.entityId
      ? q.or(`scope_json->>entityId.is.null,scope_json->>entityId.eq.${query.entityId}`)
      : q.is("scope_json->>entityId", null);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) this.fail(error, "listActiveByScope");
    return this.parseMany(data);
  }
  async search(userId: string, query: string, limit = 8): Promise<Decision[]> {
    const { data, error } = await this.client
      .rpc("search_decisions", { p_query: query, p_limit: clampLimit(limit) })
      .eq("user_id", userId);
    if (error) this.fail(error, "search");
    return this.parseMany(data);
  }
}

// ---------------------------------------------------------------- observations

class SupabaseObservations
  extends SupabaseBase<Observation, z.input<typeof ObservationInputSchema>, object>
  implements ObservationsRepository
{
  constructor(client: Client) {
    super(client, "observations", ObservationSchema, ObservationInputSchema);
  }
  async listActive(userId: string, type?: MemoryType): Promise<Observation[]> {
    let q = this.from().select().eq("user_id", userId).eq("status", "active");
    if (type) q = q.eq("type", type);
    const { data, error } = await q.order("last_observed_at", { ascending: false });
    if (error) this.fail(error, "listActive");
    return this.parseMany(data);
  }
  async search(userId: string, query: string, limit = 8): Promise<Observation[]> {
    const { data, error } = await this.client
      .rpc("search_observations", { p_query: query, p_limit: clampLimit(limit) })
      .eq("user_id", userId);
    if (error) this.fail(error, "search");
    return this.parseMany(data);
  }
}

// ---------------------------------------------------------------- memory events

class SupabaseMemoryEvents
  extends SupabaseBase<MemoryEvent, z.input<typeof MemoryEventInputSchema>, object>
  implements MemoryEventsRepository
{
  constructor(client: Client) {
    super(client, "memory_events", MemoryEventSchema, MemoryEventInputSchema);
  }
  async listRecent(userId: string, query: MemoryEventsQuery = {}): Promise<MemoryEvent[]> {
    let q = this.from().select().eq("user_id", userId);
    if (query.since) q = q.gte("occurred_at", query.since);
    if (query.projectId) q = q.eq("project_id", query.projectId);
    if (query.minImportance !== undefined) q = q.gte("importance", query.minImportance);
    const { data, error } = await q.order("occurred_at", { ascending: false }).limit(query.limit ?? 50);
    if (error) this.fail(error, "listRecent");
    return this.parseMany(data);
  }
  async search(userId: string, query: string, limit = 8): Promise<MemoryEvent[]> {
    const { data, error } = await this.client
      .rpc("search_memory_events", { p_query: query, p_limit: clampLimit(limit) })
      .eq("user_id", userId);
    if (error) this.fail(error, "search");
    return this.parseMany(data);
  }
}

// ---------------------------------------------------------------- habits

class SupabaseHabits
  extends SupabaseBase<Habit, z.input<typeof HabitInputSchema>, object>
  implements HabitsRepository
{
  constructor(client: Client) {
    super(client, "habits", HabitSchema, HabitInputSchema);
  }
  async listActive(userId: string): Promise<Habit[]> {
    const { data, error } = await this.from().select().eq("user_id", userId).eq("active", true);
    if (error) this.fail(error, "listActive");
    return this.parseMany(data);
  }
}

class SupabaseHabitLogs
  extends SupabaseBase<HabitLog, z.input<typeof HabitLogInputSchema>, object>
  implements HabitLogsRepository
{
  constructor(client: Client) {
    super(client, "habit_logs", HabitLogSchema, HabitLogInputSchema);
  }
  async listInRange(userId: string, range: DateRange, habitId?: string): Promise<HabitLog[]> {
    let q = this.from().select().eq("user_id", userId).gte("log_date", range.from).lte("log_date", range.to);
    if (habitId) q = q.eq("habit_id", habitId);
    const { data, error } = await q.order("log_date", { ascending: true });
    if (error) this.fail(error, "listInRange");
    return this.parseMany(data);
  }
}

// ---------------------------------------------------------------- attention

class SupabaseAttentionItems
  extends SupabaseBase<AttentionItem, z.input<typeof AttentionItemInputSchema>, object>
  implements AttentionItemsRepository
{
  constructor(client: Client) {
    super(client, "attention_items", AttentionItemSchema, AttentionItemInputSchema);
  }
  override async listByUser(userId: string): Promise<AttentionItem[]> {
    const { data, error } = await this.from()
      .select()
      .eq("user_id", userId)
      .order("detected_at", { ascending: false });
    if (error) this.fail(error, "listByUser");
    return this.parseMany(data);
  }
  async listActive(userId: string): Promise<AttentionItem[]> {
    const { data, error } = await this.from()
      .select()
      .eq("user_id", userId)
      .eq("status", "active")
      .order("severity", { ascending: false })
      .order("detected_at", { ascending: false });
    if (error) this.fail(error, "listActive");
    return this.parseMany(data);
  }
  async findByKindAndEntity(
    userId: string,
    kind: AttentionKind,
    entityId: string | null,
    status?: AttentionStatus,
  ): Promise<AttentionItem[]> {
    let q = this.from().select().eq("user_id", userId).eq("kind", kind);
    q = entityId === null ? q.is("entity_id", null) : q.eq("entity_id", entityId);
    if (status) q = q.eq("status", status);
    const { data, error } = await q.order("detected_at", { ascending: false });
    if (error) this.fail(error, "findByKindAndEntity");
    return this.parseMany(data);
  }
}

class SupabaseAttentionSnapshots implements AttentionSnapshotsRepository {
  constructor(private readonly client: Client) {}
  async upsert(input: z.input<typeof AttentionSnapshotInputSchema>): Promise<AttentionSnapshot> {
    const { data, error } = await this.client
      .from("attention_snapshots")
      .upsert(toRow(AttentionSnapshotInputSchema, input) as never, { onConflict: "user_id,snapshot_date" })
      .select()
      .single();
    if (error) throw mapSupabaseError(error, "attention_snapshots.upsert");
    return parseRow(AttentionSnapshotSchema, data);
  }
  async getByDate(userId: string, snapshotDate: string): Promise<AttentionSnapshot | null> {
    const { data, error } = await this.client
      .from("attention_snapshots")
      .select()
      .eq("user_id", userId)
      .eq("snapshot_date", snapshotDate)
      .maybeSingle();
    if (error) throw mapSupabaseError(error, "attention_snapshots.getByDate");
    return data ? parseRow(AttentionSnapshotSchema, data) : null;
  }
  async listInRange(userId: string, range: DateRange): Promise<AttentionSnapshot[]> {
    const { data, error } = await this.client
      .from("attention_snapshots")
      .select()
      .eq("user_id", userId)
      .gte("snapshot_date", range.from)
      .lte("snapshot_date", range.to)
      .order("snapshot_date", { ascending: true });
    if (error) throw mapSupabaseError(error, "attention_snapshots.listInRange");
    return (data ?? []).map((r) => parseRow(AttentionSnapshotSchema, r));
  }
}

// ---------------------------------------------------------------- activation / behavior

class SupabaseActivations
  extends SupabaseBase<Activation, z.input<typeof ActivationInputSchema>, object>
  implements ActivationsRepository
{
  constructor(client: Client) {
    super(client, "activations", ActivationSchema, ActivationInputSchema);
  }
  override async listByUser(userId: string): Promise<Activation[]> {
    const { data, error } = await this.from()
      .select()
      .eq("user_id", userId)
      .order("suggested_at", { ascending: false });
    if (error) this.fail(error, "listByUser");
    return this.parseMany(data);
  }
  async listSince(userId: string, since: string): Promise<Activation[]> {
    const { data, error } = await this.from()
      .select()
      .eq("user_id", userId)
      .gte("suggested_at", since)
      .order("suggested_at", { ascending: false });
    if (error) this.fail(error, "listSince");
    return this.parseMany(data);
  }
}

class SupabaseBehaviorObservations
  extends SupabaseBase<BehaviorObservation, z.input<typeof BehaviorObservationInputSchema>, object>
  implements BehaviorObservationsRepository
{
  constructor(client: Client) {
    super(client, "behavior_observations", BehaviorObservationSchema, BehaviorObservationInputSchema);
  }
  override async listByUser(userId: string): Promise<BehaviorObservation[]> {
    const { data, error } = await this.from()
      .select()
      .eq("user_id", userId)
      .order("observed_at", { ascending: false });
    if (error) this.fail(error, "listByUser");
    return this.parseMany(data);
  }
  async listSince(userId: string, since: string, entityId?: string): Promise<BehaviorObservation[]> {
    let q = this.from().select().eq("user_id", userId).gte("observed_at", since);
    if (entityId) q = q.eq("entity_id", entityId);
    const { data, error } = await q.order("observed_at", { ascending: false });
    if (error) this.fail(error, "listSince");
    return this.parseMany(data);
  }
}

// ---------------------------------------------------------------- conversations

class SupabaseConversations
  extends SupabaseBase<Conversation, z.input<typeof ConversationInputSchema>, object>
  implements ConversationsRepository
{
  constructor(client: Client) {
    super(client, "conversations", ConversationSchema, ConversationInputSchema);
  }
  override async listByUser(userId: string): Promise<Conversation[]> {
    const { data, error } = await this.from()
      .select()
      .eq("user_id", userId)
      .order("started_at", { ascending: false });
    if (error) this.fail(error, "listByUser");
    return this.parseMany(data);
  }
}

// ---------------------------------------------------------------- calendar

class SupabaseCalendarConnections implements CalendarConnectionsRepository {
  constructor(private readonly client: Client) {}
  async getByProvider(userId: string, provider: CalendarProvider): Promise<CalendarConnection | null> {
    const { data, error } = await this.client
      .from("calendar_connections")
      .select()
      .eq("user_id", userId)
      .eq("provider", provider)
      .maybeSingle();
    if (error) throw mapSupabaseError(error, "calendar_connections.getByProvider");
    return data ? parseRow(CalendarConnectionSchema, data) : null;
  }
  async upsert(input: z.input<typeof CalendarConnectionInputSchema>): Promise<CalendarConnection> {
    const { data, error } = await this.client
      .from("calendar_connections")
      .upsert(toRow(CalendarConnectionInputSchema, input) as never, { onConflict: "user_id,provider" })
      .select()
      .single();
    if (error) throw mapSupabaseError(error, "calendar_connections.upsert");
    return parseRow(CalendarConnectionSchema, data);
  }
  async update(userId: string, id: string, patch: object): Promise<CalendarConnection> {
    const { data, error } = await this.client
      .from("calendar_connections")
      .update(patchToRow(patch) as never)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .maybeSingle();
    if (error) throw mapSupabaseError(error, "calendar_connections.update");
    if (!data) throw notFound("calendar_connections", id);
    return parseRow(CalendarConnectionSchema, data);
  }
  async delete(userId: string, id: string): Promise<void> {
    const { data, error } = await this.client
      .from("calendar_connections")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select("id");
    if (error) throw mapSupabaseError(error, "calendar_connections.delete");
    if (!data || data.length === 0) throw notFound("calendar_connections", id);
  }
}

class SupabaseCalendarEventsCache implements CalendarEventsCacheRepository {
  constructor(private readonly client: Client) {}
  async upsertMany(inputs: z.input<typeof CalendarEventCacheInputSchema>[]): Promise<CalendarEventCache[]> {
    if (inputs.length === 0) return [];
    const rows = inputs.map((i) => ({
      ...toRow(CalendarEventCacheInputSchema, i),
      last_synced_at: new Date().toISOString(),
    }));
    const { data, error } = await this.client
      .from("calendar_events_cache")
      .upsert(rows as never, { onConflict: "user_id,provider,external_id" })
      .select();
    if (error) throw mapSupabaseError(error, "calendar_events_cache.upsertMany");
    return (data ?? []).map((r) => parseRow(CalendarEventCacheSchema, r));
  }
  async listInRange(userId: string, range: TimeRange): Promise<CalendarEventCache[]> {
    const { data, error } = await this.client
      .from("calendar_events_cache")
      .select()
      .eq("user_id", userId)
      .lt("start_at", range.to)
      .gt("end_at", range.from)
      .order("start_at", { ascending: true });
    if (error) throw mapSupabaseError(error, "calendar_events_cache.listInRange");
    return (data ?? []).map((r) => parseRow(CalendarEventCacheSchema, r));
  }
  async deleteByExternalIds(
    userId: string,
    provider: CalendarProvider,
    externalIds: string[],
  ): Promise<number> {
    if (externalIds.length === 0) return 0;
    const { data, error } = await this.client
      .from("calendar_events_cache")
      .delete()
      .eq("user_id", userId)
      .eq("provider", provider)
      .in("external_id", externalIds)
      .select("id");
    if (error) throw mapSupabaseError(error, "calendar_events_cache.deleteByExternalIds");
    return data?.length ?? 0;
  }
}

// ---------------------------------------------------------------- audit / loop

class SupabaseAuditLog
  extends SupabaseBase<AuditLogEntry, z.input<typeof AuditLogInputSchema>, object>
  implements AuditLogRepository
{
  constructor(client: Client) {
    super(client, "audit_log", AuditLogSchema, AuditLogInputSchema);
  }
  async listRecent(userId: string, limit = 50): Promise<AuditLogEntry[]> {
    const { data, error } = await this.from()
      .select()
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) this.fail(error, "listRecent");
    return this.parseMany(data);
  }
}

class SupabaseCheckins implements CheckinsRepository {
  constructor(private readonly client: Client) {}
  async upsert(input: z.input<typeof CheckinInputSchema>): Promise<Checkin> {
    const { data, error } = await this.client
      .from("checkins")
      .upsert(toRow(CheckinInputSchema, input) as never, { onConflict: "user_id,checkin_date" })
      .select()
      .single();
    if (error) throw mapSupabaseError(error, "checkins.upsert");
    return parseRow(CheckinSchema, data);
  }
  async getByDate(userId: string, checkinDate: string): Promise<Checkin | null> {
    const { data, error } = await this.client
      .from("checkins")
      .select()
      .eq("user_id", userId)
      .eq("checkin_date", checkinDate)
      .maybeSingle();
    if (error) throw mapSupabaseError(error, "checkins.getByDate");
    return data ? parseRow(CheckinSchema, data) : null;
  }
  async update(userId: string, id: string, patch: object): Promise<Checkin> {
    const { data, error } = await this.client
      .from("checkins")
      .update(patchToRow(patch) as never)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .maybeSingle();
    if (error) throw mapSupabaseError(error, "checkins.update");
    if (!data) throw notFound("checkins", id);
    return parseRow(CheckinSchema, data);
  }
}

class SupabaseReviews implements ReviewsRepository {
  constructor(private readonly client: Client) {}
  async upsert(input: z.input<typeof ReviewInputSchema>): Promise<Review> {
    const { data, error } = await this.client
      .from("reviews")
      .upsert(toRow(ReviewInputSchema, input) as never, {
        onConflict: "user_id,review_type,period_start,period_end",
      })
      .select()
      .single();
    if (error) throw mapSupabaseError(error, "reviews.upsert");
    return parseRow(ReviewSchema, data);
  }
  async getByPeriod(
    userId: string,
    reviewType: ReviewType,
    periodStart: string,
    periodEnd: string,
  ): Promise<Review | null> {
    const { data, error } = await this.client
      .from("reviews")
      .select()
      .eq("user_id", userId)
      .eq("review_type", reviewType)
      .eq("period_start", periodStart)
      .eq("period_end", periodEnd)
      .maybeSingle();
    if (error) throw mapSupabaseError(error, "reviews.getByPeriod");
    return data ? parseRow(ReviewSchema, data) : null;
  }
  async list(userId: string, reviewType?: ReviewType): Promise<Review[]> {
    let q = this.client.from("reviews").select().eq("user_id", userId);
    if (reviewType) q = q.eq("review_type", reviewType);
    const { data, error } = await q.order("period_start", { ascending: false });
    if (error) throw mapSupabaseError(error, "reviews.list");
    return (data ?? []).map((r) => parseRow(ReviewSchema, r));
  }
  async update(userId: string, id: string, patch: object): Promise<Review> {
    const { data, error } = await this.client
      .from("reviews")
      .update(patchToRow(patch) as never)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .maybeSingle();
    if (error) throw mapSupabaseError(error, "reviews.update");
    if (!data) throw notFound("reviews", id);
    return parseRow(ReviewSchema, data);
  }
}

// ---------------------------------------------------------------- factory

export function createSupabaseRepositories(client: Client): Repositories {
  return {
    users: new SupabaseUsers(client),
    areas: new SupabaseAreas(client),
    projects: new SupabaseProjects(client),
    tasks: new SupabaseTasks(client),
    commitments: new SupabaseCommitments(client),
    commitmentLogs: new SupabaseCommitmentLogs(client),
    ideas: new SupabaseIdeas(client),
    decisions: new SupabaseDecisions(client),
    observations: new SupabaseObservations(client),
    memoryEvents: new SupabaseMemoryEvents(client),
    habits: new SupabaseHabits(client),
    habitLogs: new SupabaseHabitLogs(client),
    attentionItems: new SupabaseAttentionItems(client),
    attentionSnapshots: new SupabaseAttentionSnapshots(client),
    activations: new SupabaseActivations(client),
    behaviorObservations: new SupabaseBehaviorObservations(client),
    conversations: new SupabaseConversations(client),
    calendarConnections: new SupabaseCalendarConnections(client),
    calendarEventsCache: new SupabaseCalendarEventsCache(client),
    auditLog: new SupabaseAuditLog(client),
    checkins: new SupabaseCheckins(client),
    reviews: new SupabaseReviews(client),
  };
}
