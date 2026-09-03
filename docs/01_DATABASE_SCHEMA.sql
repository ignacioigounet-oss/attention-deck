-- ATTENTION DECK V1 — PostgreSQL / Supabase
create extension if not exists pgcrypto;

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

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  timezone text not null default 'America/Argentina/Buenos_Aires',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  description text,
  color text,
  position integer not null default 0,
  status area_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,name)
);

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
  energy_required smallint check (energy_required between 1 and 5),
  desired_frequency text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index one_primary_project_per_user
  on projects(user_id)
  where is_primary = true and status = 'active';

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  description text not null,
  frequency text not null,
  target_count integer,
  start_date date not null,
  end_date date,
  status commitment_status not null default 'active',
  last_checked_at timestamptz,
  current_streak integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text,
  area_id uuid references areas(id) on delete set null,
  source text,
  status idea_status not null default 'idea',
  created_at timestamptz not null default now(),
  review_at timestamptz
);

create table decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  decision text not null,
  reason text,
  scope text,
  review_date date,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type memory_type not null,
  statement text not null,
  confidence numeric(4,3) check (confidence between 0 and 1),
  evidence_count integer not null default 1,
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  status memory_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now()
);

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
  friction_type text not null,
  context text,
  strategy activation_strategy,
  outcome text,
  helpful boolean,
  observed_at timestamptz not null default now()
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
  load_status text,
  created_at timestamptz not null default now(),
  unique(user_id,snapshot_date)
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  session_id text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  summary text
);

create table calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider calendar_provider,
  provider_account_email text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table calendar_events_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider calendar_provider,
  external_id text not null,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  calendar_name text,
  last_synced_at timestamptz not null default now(),
  unique(user_id,provider,external_id)
);

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

create index projects_user_status_idx on projects(user_id,status);
create index projects_activity_idx on projects(user_id,last_activity_at);
create index tasks_user_status_idx on tasks(user_id,status);
create index commitments_user_status_idx on commitments(user_id,status);
create index habits_user_active_idx on habits(user_id,active);
create index habit_logs_user_date_idx on habit_logs(user_id,log_date);
create index attention_user_status_idx on attention_items(user_id,status);
create index activation_user_status_idx on activations(user_id,status);
create index behavior_observations_idx on behavior_observations(user_id,observed_at desc);
create index memory_events_user_time_idx on memory_events(user_id,occurred_at desc);

-- Enable RLS on all user-owned tables and create auth.uid()-based policies in Supabase.
