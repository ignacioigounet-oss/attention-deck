-- ATTENTION DECK — Row Level Security
-- Every user-owned table: the caller can only see and write rows where
-- user_id = auth.uid(). users: id = auth.uid(). Service role bypasses RLS.

alter table users enable row level security;

create policy users_select on users for select using (id = auth.uid());
create policy users_update on users for update using (id = auth.uid()) with check (id = auth.uid());
-- inserts into users happen only through the auth trigger (security definer)

do $$
declare t text;
begin
  foreach t in array array[
    'areas','projects','tasks','commitments','commitment_logs','ideas',
    'decisions','observations','memory_events','habits','habit_logs',
    'attention_items','attention_snapshots','activations','behavior_observations',
    'conversations','calendar_connections','calendar_events_cache',
    'audit_log','checkins','reviews'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t || '_owner', t
    );
  end loop;
end $$;

-- Grants for the standard Supabase roles.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to authenticated, service_role;
grant all on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;
alter default privileges in schema public grant all on tables to authenticated, service_role;
alter default privileges in schema public grant all on sequences to authenticated, service_role;
alter default privileges in schema public grant execute on functions to authenticated, service_role;
-- anon gets nothing on tables: the product has no anonymous surface.
