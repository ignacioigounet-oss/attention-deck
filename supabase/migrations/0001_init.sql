-- ATTENTION DECK — Phase 1 schema
-- Canonical schema. Derived from docs/01_DATABASE_SCHEMA.sql with the
-- corrections S1–S12 of docs/18_ENGINE_SPEC.md.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums

create type area_status as enum ('active','archived');
create type project_status as enum ('active','paused','blocked','completed','archived');
create type task_status as enum ('todo','in_progress','done','cancelled');
create type commitment_status as enum ('active','paused','completed','cancelled');
create type idea_status as enum ('idea','considering','promoted','archived');
create type memory_type as enum ('fact','pattern','risk','preference');
create type memory_status as enum ('active','superseded','archived');
create type event_type as enum (
  'project_progress','task_completed','commitment_completed',
  'commitment_missed','decision_made','project_blocked',
  'project_completed','habit_logged','calendar_action','checkin'
);
create type habit_kind as enum ('binary','frequency','duration','streak');
create type habit_log_status as enum ('done','not_done','partial','skipped');
create type attention_status as enum ('active','resolved','dismissed');
create type attention_kind as enum (
  'stagnation','overload','repetition','contradiction',
  'decision_conflict','deadline','opportunity'
);
create type activation_strategy as enum (
  'reduce_scope','make_concrete','lower_quality_bar',
  'implementation_intention','externalize_commitment',
  'remove_choices','close_loop','physical_activation','other'
);
create type activation_status as enum ('suggested','started','completed','dismissed');

-- S2
create type calendar_provider as enum ('google');
-- S5
create type friction_type as enum (
  'ambiguity','task_too_large','perfectionism','evaluation_fear',
  'boredom','low_energy','distraction','environment',
  'no_external_structure','reward_too_distant','too_many_options','no_time'
);
-- S9
create type budget_category as enum ('work','primary_projects','body','learning','admin');
-- S10
create type load_status as enum ('LOW','HEALTHY','HIGH','OVERLOADED');

-- ---------------------------------------------------------------- json validators

-- S3: {period:'day'|'week'|'month', times:int>=1, days?:int[0..6], minutesPerOccurrence?:int>0}
create or replace function public.is_valid_frequency(f jsonb)
returns boolean language sql immutable as $$
  select coalesce((
    f is not null
    and jsonb_typeof(f) = 'object'
    and (f->>'period') in ('day','week','month')
    and jsonb_typeof(f->'times') = 'number'
    and (f->>'times')::numeric >= 1
    and (f->>'times')::numeric = floor((f->>'times')::numeric)
    and (f->'days' is null or jsonb_typeof(f->'days') = 'array')
    and (f->'minutesPerOccurrence' is null
         or (jsonb_typeof(f->'minutesPerOccurrence') = 'number'
             and (f->>'minutesPerOccurrence')::numeric > 0))
  ), false);
$$;

-- S4: {kind, entityId?, until?, limit?}
create or replace function public.is_valid_scope(s jsonb)
returns boolean language sql immutable as $$
  select coalesce((
    s is not null
    and jsonb_typeof(s) = 'object'
    and (s->>'kind') in (
      'no_new_projects','protect_project','pause_project',
      'pause_area','limit_commitments','custom'
    )
    and (s->'entityId' is null or jsonb_typeof(s->'entityId') = 'string')
    and (s->'until' is null or jsonb_typeof(s->'until') = 'string')
    and (s->'limit' is null or jsonb_typeof(s->'limit') = 'number')
  ), false);
$$;

-- S9: all five categories, numeric >= 0
create or replace function public.is_valid_budget_targets(t jsonb)
returns boolean language sql immutable as $$
  select coalesce((
    t is not null
    and jsonb_typeof(t) = 'object'
    and (select bool_and(coalesce(jsonb_typeof(t->k) = 'number' and (t->>k)::numeric >= 0, false))
         from unnest(array['work','primary_projects','body','learning','admin']) as k)
  ), false);
$$;

-- ---------------------------------------------------------------- users (S1, S6, S9)

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  timezone text not null default 'America/Argentina/Buenos_Aires',
  weekly_available_hours numeric(5,2) not null default 40 check (weekly_available_hours > 0),
  day_start time not null default '09:00',
  day_end time not null default '19:00',
  attention_budget_targets jsonb not null
    default '{"work":0,"primary_projects":0,"body":0,"learning":0,"admin":0}'::jsonb
    check (is_valid_budget_targets(attention_budget_targets)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (day_end > day_start)
);

-- ---------------------------------------------------------------- areas (S9)

create table areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  description text,
  color text,
  position integer not null default 0,
  status area_status not null default 'active',
  budget_category budget_category,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,name)
);

-- ---------------------------------------------------------------- projects

create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  area_id uuid references areas(id) on delete set null,
  name text not null,
  description text,
  status project_status not null default 'active',
  priority smallint not null default 3 check (priority between 1 and 5),
  goal text,
  success_criteria text,
  start_date date,
  target_date date,
  last_activity_at timestamptz,
  next_review_at timestamptz,
  next_action text,
  current_blocker text,
  energy_required smallint check (energy_required is null or energy_required between 1 and 5),
  desired_frequency text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

-- max 1 primary active project per user
create unique index one_primary_project_per_user
  on projects(user_id)
  where is_primary = true and status = 'active';

-- ---------------------------------------------------------------- tasks (S7)

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  description text,
  status task_status not null default 'todo',
  priority smallint not null default 3 check (priority between 1 and 5),
  scheduled_for timestamptz,
  due_date timestamptz,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  energy_level smallint check (energy_level is null or energy_level between 1 and 5),
  reschedule_count integer not null default 0 check (reschedule_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ---------------------------------------------------------------- commitments (S3, S11)

create table commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  description text not null,
  frequency text not null,
  frequency_json jsonb not null check (is_valid_frequency(frequency_json)),
  target_count integer,
  start_date date not null,
  end_date date,
  status commitment_status not null default 'active',
  last_checked_at timestamptz,
  current_streak integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table commitment_logs (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references commitments(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  log_date date not null,
  status habit_log_status not null,
  value numeric,
  note text,
  source text,
  created_at timestamptz not null default now(),
  unique(commitment_id,log_date)
);

-- ---------------------------------------------------------------- ideas

create table ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text,
  area_id uuid references areas(id) on delete set null,
  source text,
  status idea_status not null default 'idea',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  review_at timestamptz
);

-- ---------------------------------------------------------------- decisions (S4)

create table decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  decision text not null,
  reason text,
  scope text,
  scope_json jsonb not null default '{"kind":"custom"}'::jsonb check (is_valid_scope(scope_json)),
  review_date date,
  status memory_status not null default 'active',
  search_vector tsvector generated always as (
    to_tsvector('spanish', coalesce(title,'') || ' ' || coalesce(decision,'') || ' ' || coalesce(reason,''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- observations

create table observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type memory_type not null,
  statement text not null,
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  evidence_count integer not null default 1,
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  status memory_status not null default 'active',
  search_vector tsvector generated always as (to_tsvector('spanish', statement)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- memory events

create table memory_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  event_type event_type not null,
  description text not null,
  project_id uuid references projects(id) on delete set null,
  area_id uuid references areas(id) on delete set null,
  occurred_at timestamptz not null default now(),
  source text,
  importance smallint not null default 3 check (importance between 1 and 5),
  search_vector tsvector generated always as (to_tsvector('spanish', description)) stored,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- habits (S3)

create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  area_id uuid references areas(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  name text not null,
  description text,
  kind habit_kind not null,
  target_count integer,
  target_minutes integer,
  unit text,
  frequency text not null,
  frequency_json jsonb not null check (is_valid_frequency(frequency_json)),
  active boolean not null default true,
  start_date date not null default current_date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  log_date date not null,
  status habit_log_status not null,
  value numeric,
  note text,
  source text,
  created_at timestamptz not null default now(),
  unique(habit_id,log_date)
);

-- ---------------------------------------------------------------- attention

create table attention_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind attention_kind not null,
  status attention_status not null default 'active',
  title text not null,
  evidence text,
  interpretation text,
  recommended_action text,
  severity smallint not null default 3 check (severity between 1 and 5),
  entity_type text,
  entity_id uuid,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table attention_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  snapshot_date date not null,
  primary_focus text,
  available_hours numeric(6,2),
  committed_hours numeric(6,2),
  planned_hours numeric(6,2),
  attention_budget jsonb not null default '{}'::jsonb,
  load_status load_status,
  created_at timestamptz not null default now(),
  unique(user_id,snapshot_date)
);

-- ---------------------------------------------------------------- activation / behavior (S5)

create table activations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  strategy activation_strategy not null,
  rationale text,
  timer_minutes integer check (timer_minutes is null or timer_minutes > 0),
  status activation_status not null default 'suggested',
  suggested_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table behavior_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  entity_type text,
  entity_id uuid,
  friction_type friction_type not null,
  context text,
  context_json jsonb,
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  source text not null default 'reported' check (source in ('structural','reported','checkin')),
  strategy activation_strategy,
  activation_id uuid references activations(id) on delete set null,
  outcome text,
  helpful boolean,
  observed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- conversations

create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  session_id text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  summary text
);

-- ---------------------------------------------------------------- calendar (S8, S12)

create table calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider calendar_provider not null,
  provider_account_email text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  sync_tokens jsonb not null default '{}'::jsonb,
  selected_calendar_ids text[] not null default '{}',
  write_calendar_id text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,provider)
);

create table calendar_events_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider calendar_provider not null,
  external_id text not null,
  calendar_id text,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  calendar_name text,
  status text not null default 'confirmed' check (status in ('confirmed','tentative','cancelled')),
  all_day boolean not null default false,
  transparency text not null default 'opaque' check (transparency in ('opaque','transparent')),
  source text not null default 'google' check (source in ('google','attention_deck')),
  project_id uuid references projects(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  habit_id uuid references habits(id) on delete set null,
  has_attendees boolean not null default false,
  updated_at_remote timestamptz,
  last_synced_at timestamptz not null default now(),
  unique(user_id,provider,external_id),
  check (end_at >= start_at)
);

-- ---------------------------------------------------------------- audit / loop

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  actor text not null,
  action_type text not null,
  entity_type text,
  entity_id uuid,
  input_summary text,
  result_summary text,
  created_at timestamptz not null default now()
);

create table checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  checkin_date date not null,
  raw_summary text,
  accomplishments jsonb not null default '[]'::jsonb,
  unfinished jsonb not null default '[]'::jsonb,
  tomorrow jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id,checkin_date)
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  review_type text not null check (review_type in ('weekly','monthly')),
  period_start date not null,
  period_end date not null,
  summary text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id,review_type,period_start,period_end)
);

-- ---------------------------------------------------------------- indexes

create index projects_user_status_idx on projects(user_id,status);
create index projects_activity_idx on projects(user_id,last_activity_at);
create index tasks_user_status_idx on tasks(user_id,status);
create index tasks_project_idx on tasks(project_id);
create index commitments_user_status_idx on commitments(user_id,status);
create index commitment_logs_user_date_idx on commitment_logs(user_id,log_date);
create index habits_user_active_idx on habits(user_id,active);
create index habit_logs_user_date_idx on habit_logs(user_id,log_date);
create index attention_user_status_idx on attention_items(user_id,status);
create index attention_kind_entity_idx on attention_items(user_id,kind,entity_id);
create index activation_user_status_idx on activations(user_id,status);
create index behavior_observations_idx on behavior_observations(user_id,observed_at desc);
create index memory_events_user_time_idx on memory_events(user_id,occurred_at desc);
create index memory_events_search_idx on memory_events using gin(search_vector);
create index decisions_search_idx on decisions using gin(search_vector);
create index observations_search_idx on observations using gin(search_vector);
create index decisions_user_status_idx on decisions(user_id,status);
create index calendar_events_cache_range_idx on calendar_events_cache(user_id,start_at,end_at);
