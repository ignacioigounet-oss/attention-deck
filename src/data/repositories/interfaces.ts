import type {
  Activation,
  ActivationInput,
  ActivationUpdate,
  Area,
  AreaInput,
  AreaUpdate,
  AttentionItem,
  AttentionItemInput,
  AttentionItemUpdate,
  AttentionKind,
  AttentionSnapshot,
  AttentionSnapshotInput,
  AttentionStatus,
  AuditLogEntry,
  AuditLogInput,
  BehaviorObservation,
  BehaviorObservationInput,
  BehaviorObservationUpdate,
  CalendarConnection,
  CalendarConnectionInput,
  CalendarConnectionUpdate,
  CalendarEventCache,
  CalendarEventCacheInput,
  CalendarProvider,
  Checkin,
  CheckinInput,
  CheckinUpdate,
  Commitment,
  CommitmentInput,
  CommitmentLog,
  CommitmentLogInput,
  CommitmentUpdate,
  Conversation,
  ConversationInput,
  ConversationUpdate,
  Decision,
  DecisionInput,
  DecisionScope,
  DecisionUpdate,
  Habit,
  HabitInput,
  HabitLog,
  HabitLogInput,
  HabitUpdate,
  Idea,
  IdeaInput,
  IdeaUpdate,
  MemoryEvent,
  MemoryEventInput,
  MemoryType,
  Observation,
  ObservationInput,
  ObservationUpdate,
  Project,
  ProjectInput,
  ProjectStatus,
  ProjectUpdate,
  Review,
  ReviewInput,
  ReviewType,
  ReviewUpdate,
  Task,
  TaskInput,
  TaskUpdate,
  User,
  UserUpdate,
} from "@/domain/types";

/**
 * Repository contracts. Every method that reads or writes user-owned data takes
 * the owning `userId` explicitly: the Supabase implementation relies on RLS as
 * the real boundary and adds the filter as defense in depth; the in-memory
 * implementation uses it as its only boundary.
 */
export interface BaseRepository<T, TInput, TUpdate> {
  create(input: TInput): Promise<T>;
  getById(userId: string, id: string): Promise<T | null>;
  update(userId: string, id: string, patch: TUpdate): Promise<T>;
  delete(userId: string, id: string): Promise<void>;
  listByUser(userId: string): Promise<T[]>;
}

export interface UsersRepository {
  getById(id: string): Promise<User | null>;
  update(id: string, patch: UserUpdate): Promise<User>;
  /** Idempotent: creates the five default areas if missing. */
  bootstrapDefaults(userId: string): Promise<void>;
}

export interface AreasRepository extends BaseRepository<Area, AreaInput, AreaUpdate> {
  listActive(userId: string): Promise<Area[]>;
}

export interface ProjectsRepository extends BaseRepository<Project, ProjectInput, ProjectUpdate> {
  /** Active projects ordered by priority desc, last_activity_at asc (nulls first). */
  listActive(userId: string): Promise<Project[]>;
  listByStatus(userId: string, status: ProjectStatus): Promise<Project[]>;
  getPrimary(userId: string): Promise<Project | null>;
  /** Atomic: unsets the current primary and sets the given one. Fails if not active. */
  setPrimary(userId: string, projectId: string): Promise<Project>;
}

export interface TaskUpdateOptions {
  /** 'user' increments reschedule_count when scheduled_for changes; 'sync' never does (docs/18 §7.1). */
  source?: "user" | "sync";
}

export interface TasksRepository extends BaseRepository<Task, TaskInput, TaskUpdate> {
  update(userId: string, id: string, patch: TaskUpdate, options?: TaskUpdateOptions): Promise<Task>;
  listByProject(userId: string, projectId: string): Promise<Task[]>;
  listOpen(userId: string): Promise<Task[]>;
}

export interface CommitmentsRepository extends BaseRepository<Commitment, CommitmentInput, CommitmentUpdate> {
  listActive(userId: string): Promise<Commitment[]>;
}

export interface DateRange {
  /** inclusive, YYYY-MM-DD */
  from: string;
  /** inclusive, YYYY-MM-DD */
  to: string;
}

export interface CommitmentLogsRepository {
  create(input: CommitmentLogInput): Promise<CommitmentLog>;
  getById(userId: string, id: string): Promise<CommitmentLog | null>;
  delete(userId: string, id: string): Promise<void>;
  listInRange(userId: string, range: DateRange, commitmentId?: string): Promise<CommitmentLog[]>;
}

export type IdeasRepository = BaseRepository<Idea, IdeaInput, IdeaUpdate>;

export interface ScopeQuery {
  kind?: DecisionScope["kind"];
  entityId?: string;
}

export interface DecisionsRepository extends BaseRepository<Decision, DecisionInput, DecisionUpdate> {
  /** Active decisions whose scope is global (no entityId) or matches the given entity/kind. */
  listActiveByScope(userId: string, query: ScopeQuery): Promise<Decision[]>;
  search(userId: string, query: string, limit?: number): Promise<Decision[]>;
}

export interface ObservationsRepository extends BaseRepository<
  Observation,
  ObservationInput,
  ObservationUpdate
> {
  listActive(userId: string, type?: MemoryType): Promise<Observation[]>;
  search(userId: string, query: string, limit?: number): Promise<Observation[]>;
}

export interface MemoryEventsQuery {
  since?: string;
  projectId?: string;
  minImportance?: number;
  limit?: number;
}

export interface MemoryEventsRepository {
  create(input: MemoryEventInput): Promise<MemoryEvent>;
  getById(userId: string, id: string): Promise<MemoryEvent | null>;
  listRecent(userId: string, query?: MemoryEventsQuery): Promise<MemoryEvent[]>;
  search(userId: string, query: string, limit?: number): Promise<MemoryEvent[]>;
}

export interface HabitsRepository extends BaseRepository<Habit, HabitInput, HabitUpdate> {
  listActive(userId: string): Promise<Habit[]>;
}

export interface HabitLogsRepository {
  create(input: HabitLogInput): Promise<HabitLog>;
  getById(userId: string, id: string): Promise<HabitLog | null>;
  delete(userId: string, id: string): Promise<void>;
  listInRange(userId: string, range: DateRange, habitId?: string): Promise<HabitLog[]>;
}

export interface AttentionItemsRepository extends BaseRepository<
  AttentionItem,
  AttentionItemInput,
  AttentionItemUpdate
> {
  listActive(userId: string): Promise<AttentionItem[]>;
  findByKindAndEntity(
    userId: string,
    kind: AttentionKind,
    entityId: string | null,
    status?: AttentionStatus,
  ): Promise<AttentionItem[]>;
}

export interface AttentionSnapshotsRepository {
  upsert(input: AttentionSnapshotInput): Promise<AttentionSnapshot>;
  getByDate(userId: string, snapshotDate: string): Promise<AttentionSnapshot | null>;
  listInRange(userId: string, range: DateRange): Promise<AttentionSnapshot[]>;
}

export interface ActivationsRepository extends BaseRepository<Activation, ActivationInput, ActivationUpdate> {
  listSince(userId: string, since: string): Promise<Activation[]>;
}

export interface BehaviorObservationsRepository extends BaseRepository<
  BehaviorObservation,
  BehaviorObservationInput,
  BehaviorObservationUpdate
> {
  listSince(userId: string, since: string, entityId?: string): Promise<BehaviorObservation[]>;
}

export type ConversationsRepository = BaseRepository<Conversation, ConversationInput, ConversationUpdate>;

export interface CalendarConnectionsRepository {
  getByProvider(userId: string, provider: CalendarProvider): Promise<CalendarConnection | null>;
  upsert(input: CalendarConnectionInput): Promise<CalendarConnection>;
  update(userId: string, id: string, patch: CalendarConnectionUpdate): Promise<CalendarConnection>;
  delete(userId: string, id: string): Promise<void>;
}

export interface TimeRange {
  /** inclusive ISO timestamp */
  from: string;
  /** exclusive ISO timestamp */
  to: string;
}

export interface CalendarEventsCacheRepository {
  upsertMany(inputs: CalendarEventCacheInput[]): Promise<CalendarEventCache[]>;
  /** Events overlapping the range. */
  listInRange(userId: string, range: TimeRange): Promise<CalendarEventCache[]>;
  deleteByExternalIds(userId: string, provider: CalendarProvider, externalIds: string[]): Promise<number>;
}

export interface AuditLogRepository {
  create(input: AuditLogInput): Promise<AuditLogEntry>;
  listRecent(userId: string, limit?: number): Promise<AuditLogEntry[]>;
}

export interface CheckinsRepository {
  upsert(input: CheckinInput): Promise<Checkin>;
  getByDate(userId: string, checkinDate: string): Promise<Checkin | null>;
  update(userId: string, id: string, patch: CheckinUpdate): Promise<Checkin>;
}

export interface ReviewsRepository {
  upsert(input: ReviewInput): Promise<Review>;
  getByPeriod(
    userId: string,
    reviewType: ReviewType,
    periodStart: string,
    periodEnd: string,
  ): Promise<Review | null>;
  list(userId: string, reviewType?: ReviewType): Promise<Review[]>;
  update(userId: string, id: string, patch: ReviewUpdate): Promise<Review>;
}

export interface Repositories {
  users: UsersRepository;
  areas: AreasRepository;
  projects: ProjectsRepository;
  tasks: TasksRepository;
  commitments: CommitmentsRepository;
  commitmentLogs: CommitmentLogsRepository;
  ideas: IdeasRepository;
  decisions: DecisionsRepository;
  observations: ObservationsRepository;
  memoryEvents: MemoryEventsRepository;
  habits: HabitsRepository;
  habitLogs: HabitLogsRepository;
  attentionItems: AttentionItemsRepository;
  attentionSnapshots: AttentionSnapshotsRepository;
  activations: ActivationsRepository;
  behaviorObservations: BehaviorObservationsRepository;
  conversations: ConversationsRepository;
  calendarConnections: CalendarConnectionsRepository;
  calendarEventsCache: CalendarEventsCacheRepository;
  auditLog: AuditLogRepository;
  checkins: CheckinsRepository;
  reviews: ReviewsRepository;
}
