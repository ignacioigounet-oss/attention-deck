-- ATTENTION DECK — local seed (development only, never production)
-- Creates one auth user (the trigger creates public.users), bootstraps
-- default areas and one primary project stalled 9 days, as required by
-- docs/18_ENGINE_SPEC.md §9 test 26.

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data
)
values (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'ignacio@example.com',
  crypt('attention-deck-local', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Ignacio"}'::jsonb
)
on conflict (id) do nothing;

select public.bootstrap_defaults('11111111-1111-1111-1111-111111111111');

insert into projects (
  user_id, area_id, name, description, status, priority, goal, next_action,
  last_activity_at, is_primary
)
select
  '11111111-1111-1111-1111-111111111111',
  a.id,
  'Portfolio',
  'Publicar casos profesionales seleccionados.',
  'active', 5,
  'Convertir trabajo acumulado en portfolio público.',
  'Finalizar y publicar el caso Ygiarto.',
  now() - interval '9 days',
  true
from areas a
where a.user_id = '11111111-1111-1111-1111-111111111111'
  and a.name = 'Proyectos propios'
  and not exists (
    select 1 from projects p
    where p.user_id = '11111111-1111-1111-1111-111111111111' and p.name = 'Portfolio'
  );
