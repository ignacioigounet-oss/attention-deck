insert into users (id,email,display_name,timezone)
values ('11111111-1111-1111-1111-111111111111','ignacio@example.com','Ignacio','America/Argentina/Buenos_Aires')
on conflict (id) do nothing;

insert into areas (user_id,name,description,position)
select '11111111-1111-1111-1111-111111111111',v.name,v.description,v.position
from (values
 ('Trabajo','Clientes, Ygiarto y producción profesional',1),
 ('Proyectos propios','Portfolio y obra propia',2),
 ('Estudios','Licenciatura y obligaciones académicas',3),
 ('Cuerpo','Entrenamiento y recuperación',4),
 ('Finanzas','Ingresos, gastos, deuda y presupuesto',5)
) v(name,description,position)
where not exists (
 select 1 from areas a
 where a.user_id='11111111-1111-1111-1111-111111111111' and a.name=v.name
);

insert into projects (
 user_id,area_id,name,description,status,priority,goal,next_action,
 last_activity_at,is_primary
)
select
 '11111111-1111-1111-1111-111111111111',
 a.id,
 'Portfolio',
 'Publicar casos profesionales seleccionados.',
 'active',5,
 'Convertir trabajo acumulado en portfolio público.',
 'Finalizar y publicar el caso Ygiarto.',
 now() - interval '9 days',
 true
from areas a
where a.user_id='11111111-1111-1111-1111-111111111111'
and a.name='Proyectos propios';
