-- ATTENTION DECK — functions and triggers

-- ---------------------------------------------------------------- updated_at

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'users','areas','projects','tasks','commitments','ideas','decisions',
    'observations','habits','calendar_connections'
  ] loop
    execute format(
      'create trigger %I before update on %I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------- S1: auth.users -> public.users

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email,''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- bootstrap (idempotent)

create or replace function public.bootstrap_defaults(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'bootstrap_defaults: not allowed for another user' using errcode = '42501';
  end if;
  if not exists (select 1 from public.users where id = p_user_id) then
    raise exception 'bootstrap_defaults: user % does not exist', p_user_id using errcode = '23503';
  end if;

  insert into public.areas (user_id, name, description, position, budget_category)
  select p_user_id, v.name, v.description, v.position, v.category::budget_category
  from (values
    ('Trabajo',          'Clientes y producción profesional',        1, 'work'),
    ('Proyectos propios','Portfolio y obra propia',                   2, 'primary_projects'),
    ('Estudios',         'Licenciatura y obligaciones académicas',    3, 'learning'),
    ('Cuerpo',           'Entrenamiento y recuperación',              4, 'body'),
    ('Finanzas',         'Ingresos, gastos, deuda y presupuesto',     5, 'admin')
  ) as v(name, description, position, category)
  on conflict (user_id, name) do nothing;
end $$;

-- ---------------------------------------------------------------- max 3 active projects

create or replace function public.assert_active_project_limit()
returns trigger language plpgsql as $$
declare n integer;
begin
  if new.status = 'active' then
    select count(*) into n
    from public.projects
    where user_id = new.user_id and status = 'active' and id <> new.id;
    if n >= 3 then
      raise exception 'active project limit reached (max 3)' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

create trigger projects_active_limit
  before insert or update of status on projects
  for each row execute function public.assert_active_project_limit();

-- ---------------------------------------------------------------- primary project (atomic)

create or replace function public.set_primary_project(p_project_id uuid)
returns setof public.projects language plpgsql as $$
declare v_user uuid; v_status project_status;
begin
  select user_id, status into v_user, v_status from public.projects where id = p_project_id;
  if v_user is null then
    raise exception 'project not found' using errcode = 'P0002';
  end if;
  if v_status <> 'active' then
    raise exception 'only active projects can be primary' using errcode = 'P0001';
  end if;
  update public.projects set is_primary = false
    where user_id = v_user and is_primary = true and id <> p_project_id;
  update public.projects set is_primary = true where id = p_project_id;
  return query select * from public.projects where id = p_project_id;
end $$;

-- ---------------------------------------------------------------- full-text search (ranked)

-- OR-semantics query: any matching term qualifies, ts_rank orders by how many match.
create or replace function public.memory_tsquery(p_query text)
returns tsquery language sql immutable as $$
  select case
    when plainto_tsquery('spanish', p_query)::text = '' then null::tsquery
    else replace(plainto_tsquery('spanish', p_query)::text, '&', '|')::tsquery
  end;
$$;

create or replace function public.search_memory_events(p_query text, p_limit integer default 8)
returns setof public.memory_events language sql stable as $$
  select e.*
  from public.memory_events e
  where e.search_vector @@ public.memory_tsquery(p_query)
  order by ts_rank(e.search_vector, public.memory_tsquery(p_query)) desc, e.occurred_at desc
  limit least(greatest(p_limit, 1), 20);
$$;

create or replace function public.search_decisions(p_query text, p_limit integer default 8)
returns setof public.decisions language sql stable as $$
  select d.*
  from public.decisions d
  where d.search_vector @@ public.memory_tsquery(p_query)
  order by ts_rank(d.search_vector, public.memory_tsquery(p_query)) desc, d.created_at desc
  limit least(greatest(p_limit, 1), 20);
$$;

create or replace function public.search_observations(p_query text, p_limit integer default 8)
returns setof public.observations language sql stable as $$
  select o.*
  from public.observations o
  where o.search_vector @@ public.memory_tsquery(p_query)
  order by ts_rank(o.search_vector, public.memory_tsquery(p_query)) desc, o.last_observed_at desc
  limit least(greatest(p_limit, 1), 20);
$$;
