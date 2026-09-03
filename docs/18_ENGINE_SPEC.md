# ATTENTION DECK — ESPECIFICACIÓN OPERATIVA DE ENGINES (V1)

Estado: propuesta para aprobación previa a Phase 1. No introduce features fuera de `00`, `10`, `12`, `14` y `16`. Cada regla tiene definición, inputs, output, ejemplo y criterio testeable. Los valores numéricos son defaults de `policies/defaults.ts` y se inyectan; ningún engine los lee de una constante global.

---

## 0. Convenciones comunes

**Pureza.** Todo engine es `fn(input, policy, now) -> output`. Sin IO, sin `Date.now()`, sin aleatoriedad. "Hoy" y "días" se calculan en `users.timezone`.

**Evidence.** Toda salida que afecte al usuario lleva `evidence: Evidence[]`:

```
Evidence = { kind: string; entityType?: string; entityId?: string; value?: number|string|boolean; text: string }
```

`text` es una frase factual en español ("9 días sin actividad"), nunca interpretación.

**Escalas.** `severity` 1–5 entero. `confidence` 0–1 con dos decimales. `priority` de proyecto 1–5.

**Ventanas.** Semana = lunes a domingo en la zona del usuario. `windowDays` por defecto 14 para señales de comportamiento, 7 para actividad reciente.

**Policy defaults** (referencia rápida; cada sección los explica):

| Clave | Default |
|---|---|
| stagnation.days | 7 |
| stagnation.daysPrimary | 5 |
| stagnation.noNextActionDays | 3 |
| stagnation.minPriority | 3 |
| overload.lowRatio / healthyRatio / highRatio | 0.40 / 0.85 / 1.00 |
| overload.maxActiveCommitments | 5 |
| overload.maxOverdueTasks | 10 |
| repetition.sameFrictionCount / windowDays | 3 / 14 |
| repetition.rescheduleCount | 3 |
| deadline.projectHorizonDays / taskHorizonDays | 14 / 7 |
| opportunity.minWindowMinutes | 90 |
| activation.defaultTimerMinutes | 10 |
| activation.startWindowHours / completeWindowHours | 24 / 48 |
| learning.minSamples / patternMinSamples / patternRate | 3 / 5 / 0.70 |
| behavior.inferThreshold / askMargin | 0.70 / 0.20 |
| behavior.askCooldownDays | 7 |
| continuity.sustainedRate / sustainedPeriods | 0.80 / 4 |
| memory.packetTokenBudget | 3000 |
| calendar.cacheTtlMinutes / syncWindowDays | 15 / [-7, +30] |
| calendar.dayStart / dayEnd | 09:00 / 19:00 |

---

## 1. Correcciones de schema (migración 0001)

Todas motivadas por determinismo o por bugs del schema original. Ninguna agrega comportamiento de producto.

| # | Cambio | Motivo |
|---|---|---|
| S1 | `users.id uuid primary key references auth.users(id) on delete cascade`, sin default. Se elimina `email unique` (viene de auth). Trigger `on auth.users insert` crea la fila en `public.users`. | RLS con `auth.uid()` exige identidad compartida. El seed con UUID fijo se reemplaza por bootstrap idempotente al primer login (crea las 5 áreas por defecto). |
| S2 | `create type calendar_provider as enum ('google')`. | Referenciado y nunca creado; la migración original falla. |
| S3 | `habits.frequency_json jsonb not null` y `commitments.frequency_json jsonb not null` con forma `{period:'day'\|'week'\|'month', times:int≥1, days?:int[0..6], minutesPerOccurrence?:int}`. `frequency text` queda como etiqueta legible. | El Continuity Engine no puede ser determinista sobre texto libre. |
| S4 | `decisions.scope_json jsonb` con forma `{kind:'no_new_projects'\|'protect_project'\|'pause_project'\|'pause_area'\|'limit_commitments'\|'custom', entityId?:uuid, until?:date, limit?:int}`. `decisions.status` pasa a `memory_status`. | Contradicción y política de tools necesitan scope legible por código. |
| S5 | `create type friction_type as enum (...)` (12 valores, sección 3.1). `behavior_observations.friction_type` usa el enum. Se agregan `behavior_observations.context_json jsonb`, `confidence numeric(4,3)`, `source text check (source in ('structural','reported','checkin'))`, `activation_id uuid references activations(id)`. | Taxonomía única entre 04, 05 y 12; datos que el aprendizaje necesita. |
| S6 | `users.weekly_available_hours numeric(5,2) not null default 40`, `users.day_start time not null default '09:00'`, `users.day_end time not null default '19:00'`. | Sobrecarga y ventanas libres necesitan disponibilidad declarada. |
| S7 | `tasks.reschedule_count integer not null default 0`. El repositorio lo incrementa cuando `scheduled_for` cambia de un valor no nulo a otro distinto. | Detector de repetición R3. |
| S8 | `calendar_connections.sync_tokens jsonb not null default '{}'` (calendarId → syncToken), `selected_calendar_ids text[] not null default '{}'`, `write_calendar_id text`. | Sync incremental y elección de calendarios relevantes (14: "relevant calendars"). |
| S9 | `create type budget_category as enum ('work','primary_projects','body','learning','admin')`; `areas.budget_category budget_category`; `users.attention_budget_targets jsonb not null default '{"work":0,"primary_projects":0,"body":0,"learning":0,"admin":0}'` (horas/semana). | Attention Budget de `06` sin adivinar por nombre de área. |
| S10 | `create type load_status as enum ('LOW','HEALTHY','HIGH','OVERLOADED')`; `attention_snapshots.load_status` lo usa. Triggers `updated_at` en todas las tablas con esa columna. RLS `enable` + policy `user_id = auth.uid()` en todas las tablas con `user_id`; `users` con `id = auth.uid()`. | Consistencia con `02_TYPES.ts` y con el comentario final del schema. |

Seed por defecto de áreas (bootstrap): Trabajo→work, Proyectos propios→primary_projects, Estudios→learning, Cuerpo→body, Finanzas→admin.

---

## 2. Attention Engine

**Input** `AttentionInput`: `projects`, `tasks`, `commitments` + `commitmentLogs` (ver 5), `habits` + `habitLogs`, `decisions` activas, `activations` (14 días), `behaviorObservations` (14 días), `calendarEvents` (cache, opcional hasta Phase 7), `existingItems` (attention_items no resueltos), `user` (timezone, disponibilidad, targets), `now`.

**Output** `AttentionState`:

```
{
  primaryFocus: AttentionCandidate | null,
  items: AttentionCandidate[],          // ordenados, incluye primaryFocus
  load: WeeklyLoad,
  budget: AttentionBudgetReport,
  directiveInputs: { projectId?, projectName?, kind, daysStalled?, nextAction?, blocker?, suggestedMovement },
  reconciliation: { create: [], resolve: [], keep: [] }
}
AttentionCandidate = { kind, entityType, entityId, severity, score, evidence[], recommendedMovement }
```

### 2.1 Stagnation (S)

Definición. Proyecto `active` o `blocked` con `priority ≥ 3` cumple al menos una:
S-a `daysSince(last_activity_at) ≥ days` (5 si `is_primary`, 7 si no; `last_activity_at` nulo cuenta desde `created_at`).
S-b `next_action` nulo o vacío durante ≥ 3 días (se mide contra `updated_at` del proyecto si `next_action` es nulo).
S-c ≥ 2 commitments vinculados con período fallado en 14 días.

Severidad: 3 base; +1 por cada 7 días completos por encima del umbral; +1 si `is_primary`; +1 si `status = 'blocked'` y `current_blocker` nulo; tope 5.

`last_activity_at` solo lo mueven hechos: tarea completada, activación completada, hábito vinculado con log `done`, evento `project_progress` desde check-in. Conversar sobre el proyecto no lo mueve.

Ejemplo. Portfolio (primario, prioridad 5) con última actividad hace 9 días y `next_action` definido. S-a: 9 ≥ 5 → sí. Severidad 3 + floor((9−5)/7)=0 + 1 primario = 4. Evidence: "9 días sin actividad", "última actividad: tarea 'Editar caso Ygiarto' el 25/08", "próxima acción: Finalizar y publicar el caso Ygiarto".

Test. (1) Seed → un candidato `stagnation` con severidad 4 y tres evidencias. (2) Mismo proyecto con actividad hace 4 días → ningún candidato. (3) Proyecto no primario prioridad 2 con 30 días sin actividad → ninguno. (4) Prioridad 3, 20 días → severidad 3+1=4 (floor(13/7)=1). (5) Tarea completada hoy actualiza `last_activity_at` y elimina el candidato en la siguiente corrida.

### 2.2 Overload (O)

Definición. Temporal: `committed` = horas de eventos del cache en la semana corriente (excluye eventos `transparent`/free y todo el día) + ocurrencias esperadas de commitments en la semana × `minutesPerOccurrence` (default 60); `planned` = suma de `estimated_minutes` (default 60 si nulo) de tareas `todo`/`in_progress` con `scheduled_for` o `due_date` en la semana; `available` = `weekly_available_hours`. `ratio = (committed + planned) / available`. Estado: `LOW` < 0.40 ≤ `HEALTHY` < 0.85 ≤ `HIGH` < 1.00 ≤ `OVERLOADED`. `recoveryMargin = available − committed − planned`.
Estructural (candidato independiente): proyectos activos > 3, o commitments activos > 5, o tareas vencidas abiertas > 10.

Severidad. `HIGH` → 3; `OVERLOADED` → 4; +1 si además el Primary Project tiene 0 horas planificadas ni protegidas en la semana; estructural → 3.

Ejemplo. Disponible 40 h; calendario 22 h; commitments 2×1 h; tareas planificadas 10 h. Ratio 34/40 = 0.85 → `HIGH`, severidad 3, margen 6 h. Evidence: "34 de 40 horas comprometidas esta semana", "margen de recuperación: 6 horas".

Test. (1) 33.9/40 → `HEALTHY`, sin candidato. (2) 34/40 → `HIGH` sev 3. (3) 41/40 y primario sin horas → sev 5. (4) 6 commitments activos → candidato estructural sev 3 aunque ratio sea 0.5. (5) Eventos all-day no suman.

### 2.3 Contradiction (C)

Definición. Discrepancia entre algo declarado (decisión, prioridad, primario) y algo ocurrido (dato estructural). Nunca se infiere de texto conversacional.

| Id | Regla | Sev |
|---|---|---|
| C1 | Decisión activa `no_new_projects` (hasta `until` o sin fecha) y existe proyecto con `created_at > decision.created_at` y `status` ≠ archived. | 4 |
| C2 | Primary Project con 0 minutos de focus block (`source=ATTENTION_DECK`, `projectId` = primario) en los próximos 7 días y ≥ 10 h de eventos de otras categorías en el mismo lapso. Requiere calendario. | 4 |
| C3 | Sin calendario: en 7 días, ≥ 3 tareas completadas en proyectos no primarios y 0 en el primario, y el primario tiene ≥ 1 tarea `todo`. | 3 |
| C4 | Decisión `protect_project(entityId)` activa y ese proyecto cumple S-a. | 4 |
| C5 | Decisión `pause_project(entityId)` o `pause_area(entityId)` activa y hay tarea completada o activación iniciada en esa entidad después de la decisión. | 3 |
| C6 | Commitment activo con `frequency_json` semanal y 0 logs `done` en 2 semanas consecutivas mientras hay ≥ 3 tareas completadas en el mismo lapso. | 3 |

C2 y C3 son excluyentes (C3 solo si no hay conexión de calendario activa).

Ejemplo C1. Decisión 20/08 "No abrir proyectos hasta publicar Portfolio" (`no_new_projects`, `until` nulo). Proyecto "Newsletter" creado 28/08. Candidato C1 sev 4, evidence: "decisión del 20/08: no abrir proyectos", "proyecto 'Newsletter' creado el 28/08".

Test. (1) C1 con `until` = 25/08 y proyecto creado 28/08 → no dispara. (2) C2 con focus block de 30 min → no dispara (umbral es 0). (3) C3 con conexión de calendario activa → no se evalúa. (4) C4 requiere S-a verdadero; con actividad hace 2 días no dispara. (5) Ningún detector C se dispara con solo `behaviorObservations` o resúmenes de conversación.

### 2.4 Repetition (R)

| Id | Regla | Sev |
|---|---|---|
| R1 | Misma `friction_type` sobre la misma `entity_id` ≥ 3 veces en 14 días. | 3 (+1 si ≥ 5) |
| R2 | Commitment con 2 períodos consecutivos fallados. | 3 (+1 si ≥ 4) |
| R3 | Tarea con `reschedule_count ≥ 3` y estado abierto. | 2 (+1 si ≥ 5) |
| R4 | Misma estrategia `dismissed` ≥ 2 veces sobre la misma entidad en 14 días. | 2 |

Ejemplo R3. Tarea "Escribir intro del caso" reprogramada 4 veces. Sev 2. Evidence: "reprogramada 4 veces, la última el 01/09".

Test. (1) R1 con 3 observaciones en 15 días → no dispara. (2) R2 con período fallado, luego cumplido, luego fallado → no dispara (no consecutivo). (3) R3 con `reschedule_count = 3` y tarea `done` → no dispara. (4) R4 alimenta cool-down del Activation Engine (ver 4.4).

### 2.5 Deadline (D)

Definición. Proyecto con `target_date` dentro de 14 días o tarea abierta con `due_date` dentro de 7 días. `daysLeft` en zona del usuario. `remainingHours` = suma de `estimated_minutes` de tareas abiertas del proyecto (o de la tarea). `freeHoursBefore` = horas de ventanas libres antes de la fecha dentro de `day_start`–`day_end` (si no hay calendario: `daysLeft × (day_end − day_start) × 0.5`).

Severidad. `daysLeft ≤ 14` → 2; `≤ 7` → 3; `≤ 3` o `remainingHours > freeHoursBefore` → 4; vencido y abierto → 5.

Ejemplo. Entrega de tesina en 6 días; tareas abiertas suman 20 h; ventanas libres 12 h. Sev 4. Evidence: "vence en 6 días", "20 h de trabajo estimado, 12 h libres antes de la fecha".

Test. (1) `target_date` en 15 días → sin candidato. (2) 6 días con 8 h de trabajo y 12 libres → sev 3. (3) Mismo con 20 h → sev 4. (4) Proyecto `completed` con fecha vencida → sin candidato.

### 2.6 Opportunity (Op)

Definición. Solo con calendario. Op1: existe hoy una ventana libre ≥ 90 min dentro del horario declarado, el Primary Project tiene `next_action` y no tiene focus block hoy. Op2: existe una ventana ≥ 90 min mañana y el primario cumple S-a. Sin calendario, el detector no corre.

Severidad. Op1 → 2; Op2 → 2. La oportunidad nunca desplaza a un candidato de severidad ≥ 3 como `primaryFocus`.

Ejemplo. Hoy 14:00–16:30 libre; Portfolio con próxima acción y sin bloque. Candidato Op1, `recommendedMovement: "proteger 14:00–15:30 para Portfolio: Finalizar y publicar el caso Ygiarto"`.

Test. (1) Ventana de 80 min → no dispara. (2) Ventana fuera de `day_start`–`day_end` → no dispara. (3) Primario sin `next_action` → no dispara. (4) Con un candidato S sev 4 presente, Op1 no es `primaryFocus`.

### 2.7 Ranking y primary attention

Definición. `score = severity × 10 + primaryBonus + projectPriority + kindWeight − dismissPenalty`, donde `primaryBonus = 8` si la entidad es el Primary Project (o el candidato es O y el primario está sin horas), `kindWeight` = contradiction 3, deadline 3, stagnation 2, overload 2, repetition 1, opportunity 0, decision_conflict 2, y `dismissPenalty = 15` si existe un item `dismissed` para `(kind, entityId)` con la misma severidad o mayor. Desempate: severidad, luego orden de kind anterior, luego `entityId` ascendente. `primaryFocus` = primer candidato con `score ≥ 30` (severidad ≥ 3 sin penalización); si no hay, `null` y `directiveInputs.kind = 'clear'`.

`decision_conflict` (kind del enum): sev 3 si hay proyectos activos y ninguno primario; sev 3 si el primario cumple S-a con ≥ 14 días y otro proyecto activo tiene ≥ 3× su cantidad de tareas completadas en 14 días. Salida: pregunta con evidencia, nunca cambio de primario.

Reconciliación. Para cada candidato, buscar item existente por `(kind, entity_id)`: si no existe → `create`; si existe `active` → `keep` (actualizar severidad y evidencia); si existe `dismissed` y la severidad nueva > la del item → `create` nuevo (el viejo se conserva); items `active` sin candidato correspondiente → `resolve`.

Ejemplo. Candidatos: S Portfolio sev 4 (primario, prioridad 5): 40+8+5+2 = 55. C1 Newsletter sev 4: 40+0+3+3 = 46. Op1 sev 2: 20+8+5+0 = 33. `primaryFocus` = S Portfolio. `directiveInputs = {projectName:'Portfolio', kind:'stagnation', daysStalled:9, nextAction:'Finalizar y publicar el caso Ygiarto', suggestedMovement:'start_next_action'}`.

Test. (1) El ejemplo produce ese orden exacto. (2) Dismiss del item S con sev 4 → score 40 → C1 pasa a `primaryFocus`. (3) Si S sube a sev 5 tras el dismiss → se crea item nuevo y vuelve a ser primario. (4) Sin candidatos ≥ 30 → `primaryFocus` null y `kind:'clear'`. (5) Dos corridas con el mismo input producen salida idéntica (determinismo).

### 2.8 Attention Budget

Definición. Por categoría de `budget_category`: `target` = `users.attention_budget_targets[cat]`; `actual` = horas de eventos de la semana cuya categoría se resuelve así: (a) focus block con `projectId` → categoría del área del proyecto; (b) evento del cache asociado por `calendar_name` a un área (mapeo en `areas.color`? no: mapeo explícito futuro; en V1 solo a y c); (c) tareas completadas en la semana con `estimated_minutes` → categoría del área del proyecto; hábitos con log `done` y `target_minutes` → categoría del área del hábito. Un evento no atribuible cuenta en `unassigned`. `delta = actual − target`.

Output `AttentionBudgetReport = { week, categories: {cat: {target, actual, delta}}, unassignedHours }`.

Regla de uso. Solo lectura. Alimenta C2, O (severidad +1) y el weekly review. Nunca se muestra como puntaje ni ranking de categorías.

Ejemplo. Target primary_projects 6 h, actual 0; body 3 h target, 2.5 actual. Report con deltas −6 y −0.5.

Test. (1) Focus block de 90 min con `projectId` de Portfolio suma 1.5 h a primary_projects. (2) Evento sin metadata ni tarea asociada suma a `unassignedHours`. (3) Targets todos en 0 → deltas iguales a actual, sin error. (4) El snapshot diario persiste el report en `attention_snapshots.attention_budget`.

---

## 3. Behavior Engine

**Input** `BehaviorInput`: `target` (`{type:'task'|'project', id}`), tarea/proyecto, `activations` sobre la entidad (14 días), `behaviorObservations` (14 días), `reportedSignals` del turno actual (`friction_type[]` extraídos por tool o check-in), `calendarContext` (`hasProtectedBlockNext7d`), `load`, `askHistory` (preguntas hechas por entidad e hipótesis), `now`.

**Output** `FrictionHypothesis[]` ordenadas por `confidence` desc, cada una `{frictionType, confidence, evidence[], suggestedStrategies[], nextObservation, mode:'infer'|'ask', question?}`.

### 3.1 Taxonomía (enum `friction_type`)

| Valor | Definición operativa | Detector estructural (conf.) | Pregunta corta |
|---|---|---|---|
| ambiguity | No está claro qué hacer primero. | tarea sin `estimated_minutes` (0.40); proyecto sin `next_action` (0.60); título de tarea sin verbo de acción en las primeras 3 palabras (0.30) | "¿Cuál sería el primer movimiento concreto?" |
| task_too_large | El paso siguiente pide más de una sesión. | `estimated_minutes > 120` (0.60); `> 240` (0.75) | "¿Qué parte se puede cerrar en una sesión?" |
| perfectionism | Se demora por exigencia de calidad antes de existir. | proyecto de área creativa (`primary_projects`) con evento `project_progress` seguido de ≥ 5 días sin actividad (0.40, tope 0.50 estructural) | "¿Lo que frena es que todavía no está bien?" |
| evaluation_fear | Se demora por exposición al juicio. | tarea con verbos publicar/enviar/presentar y `reschedule_count ≥ 2` (0.40, tope 0.50 estructural) | "¿Frena el hacerlo o el mostrarlo?" |
| boredom | Falta interés en la tarea misma. | solo reportado | "¿Es que aburre?" |
| low_energy | Falta energía en el momento. | `context.energy ≤ 2` reportado en check-in del mismo día (0.60) | "¿Cómo venís de energía hoy, del 1 al 5?" |
| distraction | Interrupciones internas/externas. | solo reportado | "¿Qué te sacó?" |
| environment | Lugar o herramientas no acompañan. | solo reportado | "¿Dónde intentaste hacerlo?" |
| no_external_structure | No hay momento ni compromiso externo. | sin focus block próximos 7 días y sin `scheduled_for` (0.60) | "¿Tiene un momento fijado?" |
| reward_too_distant | El resultado queda lejos del esfuerzo. | proyecto con `target_date` > 60 días y sin tareas `done` en 14 días (0.40) | "¿Qué de esto se puede terminar esta semana?" |
| too_many_options | Hay varias cosas posibles y ninguna obvia. | ≥ 4 tareas `todo` con prioridad ≥ 4 en el mismo proyecto (0.60) | "¿Cuál de estas va primero?" |
| no_time | No hay hueco real. | `load.status ∈ {HIGH, OVERLOADED}` (0.50); `recoveryMargin < 0` (0.70) | "¿Cuándo entraría esto esta semana?" |

### 3.2 Confidence

Definición. Cada señal aporta `c_i`. Reportada explícitamente por el usuario: 0.90. Estructural: la tabla. Combinación por noisy-or: `confidence = 1 − Π(1 − c_i)`, tope 0.95. `perfectionism` y `evaluation_fear` tienen tope 0.50 con señales estructurales solamente; solo una señal reportada supera ese tope. Una observación previa `helpful = true` con la misma fricción sobre la misma entidad en 14 días aporta 0.30.

Ejemplo. Tarea sin estimación (0.40) y proyecto sin `next_action` (0.60) → ambiguity = 1 − 0.6 × 0.4 = 0.76.

Test. (1) El ejemplo da 0.76. (2) Tres señales de 0.6 → 0.936, no 1.8. (3) Perfeccionismo con dos señales estructurales de 0.4 → 0.50 (tope), no 0.64. (4) Perfeccionismo reportado → 0.90.

### 3.3 Evidence

Cada hipótesis lleva las evidencias de las señales que sumaron. Texto factual: "tarea sin duración estimada", "proyecto sin próxima acción desde el 28/08", "reportaste energía 2/5 hoy". Prohibido en `text`: adjetivos sobre la persona.

Test. Toda hipótesis con `confidence > 0` tiene ≥ 1 evidencia; la cantidad de evidencias coincide con la de señales aportantes.

### 3.4 Preguntar vs inferir

Definición. `mode = 'infer'` si `top.confidence ≥ 0.70` y `top.confidence − second.confidence ≥ 0.20`. Si no, `mode = 'ask'` con la pregunta de la hipótesis top (una sola). Excepciones: `perfectionism` y `evaluation_fear` siempre `ask` salvo señal reportada; no se repite la misma pregunta sobre la misma entidad e hipótesis dentro de 7 días (`askHistory`), y en ese caso se pasa a `infer` con la confianza que haya o, si es < 0.40, se devuelve lista vacía y el asistente no interviene sobre fricción.

Ejemplo. ambiguity 0.76, no_external_structure 0.60 → margen 0.16 < 0.20 → `ask`: "¿Cuál sería el primer movimiento concreto?".

Test. (1) 0.76 vs 0.50 → `infer`. (2) 0.76 vs 0.60 → `ask`. (3) Misma pregunta hecha hace 3 días → no se repite. (4) `perfectionism` 0.50 estructural sin otras → `ask`.

### 3.5 Qué se registra

En `behavior_observations`: `entity_type`, `entity_id`, `friction_type`, `confidence`, `source` (`structural`|`reported`|`checkin`), `context_json = {timeOfDay:'morning'|'afternoon'|'evening'|'night', energy?:1..5, environment?:string, protectedBlock:boolean, loadStatus}`, `strategy` (si se propuso), `activation_id`, `outcome`, `helpful`, `observed_at`. Las hipótesis en modo `ask` no se registran hasta que el usuario responde. Las estructurales se registran solo si dieron lugar a una activación (para no llenar la tabla con cálculos).

Test. (1) Hipótesis `ask` sin respuesta → 0 filas. (2) Activación creada desde hipótesis → 1 fila con `activation_id` y `source='structural'`. (3) Respuesta del usuario "es que no sé por dónde empezar" → fila `reported`, `friction_type='ambiguity'`, `confidence=0.90`.

---

## 4. Activation Engine

**Input**: `hypothesis` (top, en modo infer o ya respondida), `target`, `effectiveness` (tabla derivada, 4.4), `recentActivations` sobre la entidad (14 días), `policy`, `now`.
**Output** `ActivationProposal = { strategy, timerMinutes|null, rationaleInputs, firstStep?, alternatives[] }`. `rationaleInputs` es estructurado; el LLM redacta. El nombre de la estrategia nunca sale al usuario.

### 4.1 Estrategia por fricción

Prior por orden (primera = 1.0, segunda = 0.8, tercera = 0.6):

| Fricción | Candidatas |
|---|---|
| ambiguity | make_concrete, reduce_scope |
| task_too_large | reduce_scope, make_concrete |
| perfectionism | lower_quality_bar, reduce_scope |
| evaluation_fear | lower_quality_bar, externalize_commitment |
| boredom | remove_choices, physical_activation, reduce_scope |
| low_energy | physical_activation, reduce_scope |
| distraction | remove_choices, implementation_intention |
| environment | physical_activation, implementation_intention |
| no_external_structure | externalize_commitment, implementation_intention |
| reward_too_distant | reduce_scope, close_loop |
| too_many_options | remove_choices, close_loop |
| no_time | externalize_commitment, reduce_scope |

`lower_quality_bar` es la implementación de la idea "ugly start": bajar la exigencia inicial. Solo se elige para `perfectionism` y `evaluation_fear`. Sin nombre, sin modo, sin botón. `other` nunca se selecciona por el engine (queda para registro manual).

Selección: `finalScore = prior × effectivenessScore` (4.4). Mayor gana; empate → orden de la tabla. Cool-down: estrategia `dismissed` sobre la misma entidad en los últimos 3 días queda excluida; si todas quedan excluidas, se propone la de mayor prior con `alternatives` vacío.

Ejemplo. ambiguity; efectividad del usuario: make_concrete 0.50 (n=0, Laplace), reduce_scope 0.83 (n=4, 4 helped). `make_concrete 1.0×0.5 = 0.5`, `reduce_scope 0.8×0.83 = 0.67` → reduce_scope. Pero como n=4 ≥ minSamples 3, el desplazamiento es válido.

Test. (1) Sin historial, ambiguity → make_concrete. (2) Con el historial del ejemplo → reduce_scope. (3) Con n=2 para reduce_scope, aunque rate sea 1.0 → make_concrete (no alcanza `minSamples`). (4) `lower_quality_bar` nunca se propone para `ambiguity`. (5) Estrategia dismissed ayer queda excluida.

### 4.2 Timer

Definición. El timer es una herramienta genérica de ejecución. Se adjunta (`timerMinutes = 10`) cuando la estrategia es una de `make_concrete`, `reduce_scope`, `lower_quality_bar`, `remove_choices`, `physical_activation`, `close_loop` y el target tiene una acción ejecutable ahora (tarea o proyecto con `next_action`). `externalize_commitment` e `implementation_intention` no llevan timer (su salida es un bloque de calendario o un plan si-entonces, no una sesión ahora). El usuario puede cambiar la duración; la default no se personaliza en V1.

Estados de `activations`: `suggested` → `started` (timer arrancó) → `completed` (timer terminó o el usuario marcó hecho) o `dismissed`.

Test. (1) reduce_scope sobre tarea → `timerMinutes = 10`. (2) externalize_commitment → `null`. (3) make_concrete sobre proyecto sin `next_action` → `timerMinutes = null` y `firstStep` requerido antes de ofrecer timer.

### 4.3 Medición del resultado

Definición. Para cada activación, `helped` se calcula a las 48 h de `suggested_at` o antes si hay check-in, con tres condiciones: (a) `started_at ≤ suggested_at + 24 h`; (b) `completed_at ≤ suggested_at + 48 h` o hubo actividad registrada sobre la entidad (tarea completada, `last_activity_at` movido) en 48 h; (c) usuario respondió `helpful = true`. `helped = true` si ≥ 2 de 3; `helped = false` si `dismissed`, o si (a) falsa y (b) falsa, o si `helpful = false` explícito; `null` en el resto (no aprende). El resultado se escribe en `behavior_observations.helpful` de la fila con ese `activation_id`.

Ejemplo. Sugerida lunes 10:00, iniciada lunes 10:05, tarea completada martes 09:00, sin respuesta explícita → (a) y (b) → `helped = true`.

Test. (1) El ejemplo → true. (2) Iniciada, sin actividad en 48 h, sin respuesta → null. (3) Dismissed → false. (4) `helpful=false` explícito aunque (a) y (b) sean true → false. (5) Evaluación antes de 48 h sin check-in → sin escritura.

### 4.4 Aprendizaje por usuario

Definición. Tabla derivada (consulta, no tabla física) `effectiveness(friction_type, strategy) = {n, helped, score}` con `score = (helped + 1) / (n + 2)` sobre observaciones con `helpful ∉ null` en los últimos 180 días. `score` participa en 4.1 solo si `n ≥ 3`; si no, vale 0.5 (neutral). Segunda tabla por contexto: `effectiveness(strategy, contextKey)` con `contextKey ∈ {timeOfDay, protectedBlock}`; se usa solo para generar patrones (5.3), no para seleccionar en V1.

Patrón. Si `n ≥ 5` y `score ≥ 0.70` (o `≤ 0.30`), el Memory Engine crea o refuerza una observación `pattern` con `statement` estructurado: "Bajar la exigencia inicial ayudó 5 de 6 veces con perfeccionismo en Portfolio" / "Timer de 10 min no ayudó 4 de 5 veces con baja energía".

Test. (1) 4 helped de 4 → score 0.83. (2) 0 de 0 → 0.5. (3) n=5, helped=4 → 0.71 → patrón creado. (4) Observación de hace 200 días no cuenta. (5) Patrón existente con mismo `(friction, strategy, entity)` → `evidence_count += 1`, no duplicado.

---

## 5. Continuity Engine

**Input**: `habit` o `commitment` con `frequency_json`, `logs` (habit_logs, o commitment logs: en V1 los commitments loguean en `habit_logs` con `habit_id` nulo? No: se agrega `commitment_logs` con la misma forma que `habit_logs` (`commitment_id, log_date, status, value, note`). Corrección S11), `window` `[from, to]`, `now`.
**Output** `ContinuityReport = { expected, done, partial, skipped, missed, adherence, currentStreak, longestStreak, lastMissDate, returnedAfterMiss, processState: 'not_started'|'started'|'returned'|'sustained'|'finished'|'lapsed' }`.

### 5.1 Ocurrencias esperadas

Definición. `period='day'` → una por día (o solo `days` si se listan); `week` → `times` por semana ISO; `month` → `times` por mes calendario. Períodos parciales al inicio (`start_date`) o fin (`end_date`, `now`) se prorratean redondeando hacia abajo. `skipped` reduce `expected` (ausencia planificada); `not_done` es falta; `partial` cuenta 0.5.

Ejemplo. Entrenar `{period:'week', times:3}`; 4 semanas completas → expected 12. Logs: 9 done, 1 partial, 1 skipped, 1 not_done → expected 11 (por el skipped), `adherence = (9 + 0.5) / 11 = 0.86`.

Test. (1) El ejemplo da 0.86. (2) Hábito que empezó el miércoles con `week ×3` → esa semana espera `floor(3 × 5/7) = 2`. (3) `days:[1,3,5]` diario → 3 esperadas por semana. (4) Sin logs → adherence 0, `not_started`.

### 5.2 Streak, miss, return

Definición. La unidad de streak es el período (`day`/`week`/`month`). Un período cuenta si `done + 0.5 × partial ≥ times` (o `≥ 1` para `day`). `currentStreak` = períodos consecutivos cumplidos hasta el último cerrado (el período en curso no rompe el streak hasta cerrar). `missed` = período cerrado no cumplido y no `skipped`. `returnedAfterMiss = true` si el último período cumplido viene inmediatamente después de uno fallado. `lastMissDate` = fin del último período fallado.

`commitments.current_streak` y `last_checked_at` se recomputan por el engine; no se editan a mano.

Ejemplo. Semanas: ✓ ✓ ✗ ✓ (en curso) → `currentStreak = 1` cuando cierre la 4ª si se cumple; `returnedAfterMiss = true`.

Test. (1) ✓✓✗✓ cerrada → streak 1, returned true, longest 2. (2) ✓✓ + semana en curso con 0 logs → streak 2 (no rompe). (3) `skipped` en la semana 3 → streak 3, sin miss.

### 5.3 Estados de proceso

`not_started` (0 done); `started` (≥ 1 done, < 2 períodos cumplidos); `returned` (último cumplido tras miss); `sustained` (adherencia ≥ 0.80 en los últimos 4 períodos cerrados); `lapsed` (≥ 2 períodos consecutivos fallados al cierre); `finished` (commitment con `end_date < now` y adherencia ≥ 0.80, o `status = completed`). Precedencia: finished > sustained > returned > lapsed > started > not_started.

Regla de producto. El LLM reconoce el estado con evidencia ("volviste después de dos semanas") y nunca con puntos. `lapsed` en commitment genera `memory_event commitment_missed` al cierre del período (5.4) y alimenta R2/C6.

Patrones de adherencia. Con ≥ 8 períodos cerrados, comparar adherencia en períodos con `protectedBlock=true` vs false y con `timeOfDay` fijo vs variable; diferencia ≥ 0.25 y n ≥ 4 en cada lado → patrón `"[hábito] es más consistente cuando está protegido en el calendario"` (Memory 6.3).

Test. (1) Adherencia 0.80 en 4 períodos → sustained. (2) ✗✗ al cierre → lapsed. (3) Commitment con end_date ayer y adherencia 0.9 → finished. (4) Patrón no se genera con 6 períodos.

### 5.4 Cierre de período

Definición. Un job diario (Phase 10; en fases previas, invocado por tests y por el endpoint de atención) llama `closePeriods(now)`: para cada hábito/commitment activo cuyo período anterior cerró, calcula cumplimiento y emite eventos (`habit_logged` no; `commitment_missed` o `commitment_completed`). Idempotente por `(entity, periodEnd)`.

Test. Llamar dos veces con el mismo `now` produce un solo evento por entidad y período.

---

## 6. Memory Engine

### 6.1 Qué se guarda

| Tipo | Tabla | Origen | Regla |
|---|---|---|---|
| Decisión | `decisions` | solo tool `remember_decision` o UI explícita | nunca inferida; `scope_json` obligatorio (`custom` permitido) |
| Evento | `memory_events` | `deriveEvents(transition)` en repositorios/servicios | uno por transición de estado listada en el enum; `importance` 3 default, 4 si toca al primario, 5 si `project_completed`/`decision_made` |
| Observación | `observations` | consolidación (4.4, 5.3) o confirmación explícita del usuario | `fact` y `preference` solo por confirmación; `pattern` y `risk` por consolidación con `confidence` = score y `evidence_count` = n |
| Comportamiento | `behavior_observations` | 3.5 | |
| Conversación | `conversations.summary` | al cierre de sesión (Phase 8) | ≤ 600 caracteres, estructurado: decisiones tomadas, acciones ejecutadas, pendientes |
| Snapshot | `attention_snapshots` | 2.x diario | uno por día, upsert |
| Check-in | `checkins` | Phase 10 | estructurado, no transcript completo |

### 6.2 Qué se descarta

Transcripciones y audio. Frases del usuario que no pasaron por `remember_decision` o `record_behavior`. Estados emocionales fuera de `context_json` de una fricción puntual. Cualquier texto sobre salud, diagnóstico o medicación (el handler de `record_behavior` rechaza `context` que contenga términos de una lista corta configurable y devuelve error explicable al LLM). Contenido de eventos de calendario más allá de título, horario, calendario y metadata propia. Salidas del LLM no mediadas por tool. Observaciones `pattern` con `evidence_count = 1` y > 60 días sin refuerzo → `archived` (job semanal).

Test. (1) `record_behavior` con `context` "me recetaron X" → rechazado, 0 filas. (2) Turno del asistente sin tool → 0 escrituras. (3) Patrón de 61 días con `evidence_count 1` → archived; con `evidence_count 2` → no.

### 6.3 Recuperación

Consultas estructuradas, en este orden y con estos topes:
1. Decisiones `active` cuyo `scope_json.kind` es global (`no_new_projects`, `limit_commitments`) o cuyo `entityId` está entre las entidades del packet; máximo 3, más recientes primero.
2. Patrones `active` con `confidence ≥ 0.60` que mencionen entidades del packet o estrategias candidatas; máximo 3 por `last_observed_at`.
3. Eventos de 14 días del Primary Project con `importance ≥ 3`; máximo 5.
4. Señales de comportamiento de 14 días sobre entidades del packet; máximo 5.
5. `search_memory(query)`: `tsvector` en configuración `spanish` sobre `decisions(title, decision, reason)`, `observations(statement)`, `memory_events(description)`, ranking `ts_rank`, `limit ≤ 20`. Sin embeddings en V1.

Test. (1) Decisión `pause_area(Estudios)` no entra al packet si el packet no toca Estudios. (2) Query "portfolio publicar" devuelve la decisión del 20/08 antes que un evento del 15/07. (3) Nunca más de 3 decisiones en el packet aunque haya 10 activas.

### 6.4 Límites del Context Packet

Topes por sección (texto y voz):

| Sección | Texto | Voz |
|---|---|---|
| activeProjects | 3 | 3 |
| activeAttention | 5 | 3 |
| todayEvents | 8 | 5 |
| openCommitments | 5 | 3 |
| activeHabits | 5 | 3 |
| recentDecisions | 3 | 2 |
| relevantPatterns | 3 | 2 |
| recentBehaviorSignals | 5 | 3 |
| Presupuesto total | 3.000 tokens | 1.500 tokens |

Estimación: `ceil(chars / 4)`. Si excede, se recorta desde el final del ranking de `06_CONTEXT_BUILDER` (behavior → decisions → blockers → habits → commitments → deadlines → attention → calendar; Primary Project y fecha/timezone nunca se recortan). El packet lleva `truncated: string[]` con las secciones recortadas.

Test. (1) Input con 12 eventos → 8 en texto, 5 en voz. (2) Packet que estima 3.400 tokens → recorta `recentBehaviorSignals` primero y marca `truncated`. (3) Primary Project presente aunque el packet haya recortado todo lo demás.

### 6.5 Decisiones que condicionan acciones

Los handlers de `create_project`, `promote_idea`, `create_commitment` y `create_calendar_event` consultan decisiones activas antes de ejecutar: `no_new_projects` bloquea las dos primeras, `limit_commitments(limit)` bloquea la tercera si ya hay ≥ limit, `pause_project(id)` bloquea focus blocks para ese id. Bloqueo = `{requiresConfirmation:true, conflict:{decisionId, title, date}}`; el LLM debe citar la decisión y pedir confirmación; la ejecución posterior requiere `confirm_action(token)`. Una decisión nueva con el mismo `title` normalizado o mismo `(kind, entityId)` marca la anterior `superseded`.

Test. (1) `create_project` con `no_new_projects` activa → sin fila creada, respuesta con `conflict`. (2) Con `confirm_action` válido → fila creada y `audit_log` con `input_summary` que referencia la decisión. (3) Segunda decisión `no_new_projects` → la primera queda `superseded`.

---

## 7. Calendar Engine

### 7.1 Source of truth

Google Calendar: cuándo ocurre cualquier cosa. ATTENTION DECK: qué proyecto/tarea/hábito significa un bloque, decisiones, atención, aprendizaje. Vínculo único: `extendedProperties.private = {source:'ATTENTION_DECK', projectId, taskId?, habitId?}` en eventos creados por la app. `tasks.scheduled_for` es una copia del `start_at` del focus block asociado y se actualiza en cada sync; nunca al revés. Si el usuario mueve o borra el evento en Google, el sync refleja y la app no lo recrea.

Test. (1) Sync trae focus block movido → `tasks.scheduled_for` cambia, `reschedule_count` no cambia (el cambio vino de Google, no de una reprogramación en la app). (2) Focus block borrado en Google → `scheduled_for` nulo, `memory_event calendar_action` con `source:'google'`.

### 7.2 Cache

`calendar_events_cache` con columnas adicionales (corrección S12): `status` (`confirmed`|`tentative`|`cancelled`), `all_day boolean`, `transparency` (`opaque`|`transparent`), `source` (`google`|`attention_deck`), `project_id`, `task_id`, `habit_id`, `updated_at_remote`. Los engines leen solo el cache. Ventana mantenida: [−7, +30] días.

### 7.3 Sync

Definición. `fullSync(calendarId)`: lista eventos en la ventana, upsert por `(user_id, provider, external_id)`, elimina del cache los que ya no están, guarda `nextSyncToken` en `sync_tokens[calendarId]`. `incrementalSync(calendarId)`: usa el token; `410 Gone` → borra token y hace `fullSync`. Disparo: cualquier lectura con `last_synced_at` más viejo que 15 min ejecuta `incrementalSync` antes de responder; cron cada 30 min (Phase 10). Refresh de access token cuando `token_expires_at − now < 5 min`. Tokens cifrados AES-256-GCM con `CALENDAR_TOKEN_ENCRYPTION_KEY` (32 bytes, env; corrección a `08_ENV_EXAMPLE`).

Test (con adaptador mock de Google). (1) Lectura con cache de 14 min → sin sync; 16 min → sync. (2) Respuesta 410 → token borrado y `fullSync` llamado una vez. (3) Evento cancelado en Google → fila eliminada. (4) Token cifrado en base no es igual al token en claro y se descifra al valor original.

### 7.4 Ventanas libres y conflictos

`findWindows(events, from, to, minMinutes, dayStart, dayEnd)`: intervalos dentro de `[dayStart, dayEnd]` de cada día sin solapamiento con eventos `opaque` y `confirmed`/`tentative` no all-day; devuelve `{start, end, minutes}` con `minutes ≥ minMinutes`, ordenados por inicio. `detectConflicts(events, proposed)`: eventos que se solapan con el propuesto, con `own: boolean` (source attention_deck) y `hasAttendees`.

Ejemplo. Día 09–19 con eventos 10:00–11:30 y 15:00–16:00, `minMinutes 90` → ventanas 11:30–15:00 (210) y 16:00–19:00 (180). 09:00–10:00 no entra (60).

Test. (1) El ejemplo. (2) Evento `transparent` no bloquea. (3) All-day no bloquea. (4) Evento que cruza medianoche se recorta al día.

### 7.5 Audit

`audit(events, projects, targets, week, user)` → `{occupiedHours, plannedHours, protectedFocusHours, primaryProjectHours, bodyHours, learningHours, recoveryMargin, flags[]}`. `protectedFocusHours` = suma de focus blocks propios; `primaryProjectHours` = los que tienen `projectId` = primario; `bodyHours`/`learningHours` por categoría del hábito/proyecto vinculado. Flags: `PRIMARY_WITHOUT_PROTECTED_TIME` (primaryProjectHours = 0), `OVERLOAD` (según 2.2), `CONFLICTS` (eventos propios solapados con otros).

Test. (1) Semana con dos focus blocks de 90 min para Portfolio → `primaryProjectHours 3`, sin flag. (2) Sin bloques → flag. (3) Focus block solapado con reunión → `CONFLICTS`.

### 7.6 Confirmation policy

| Operación | Condición | Resultado |
|---|---|---|
| create | horario exacto pedido por el usuario, sin conflicto, sin decisión bloqueante | ejecuta |
| create | conflicto con evento no propio, o decisión bloqueante | `requiresConfirmation` |
| create | la app propone el horario (opportunity, "encontrame 90 min") | `requiresConfirmation` con la propuesta |
| update | evento propio | ejecuta |
| update | evento no propio, o con invitados | `requiresConfirmation` |
| delete | evento propio | ejecuta |
| delete | evento no propio | `requiresConfirmation` |

Token de confirmación: `confirm_action(token)` de un solo uso, TTL 10 min, guarda `{userId, tool, args, hash}`; ejecución solo si `hash(args)` coincide. Toda ejecución escribe `audit_log` con `actor` (`user_text`|`user_voice`|`system_cron`) y `memory_event calendar_action`.

Test. (1) Crear a las 14:00 sin conflicto → evento creado, sin token. (2) Mismo con conflicto → sin evento, token emitido. (3) `confirm_action` con token vencido → error, sin evento. (4) `confirm_action` con args distintos al hash → error. (5) Borrar reunión de cliente → requiere confirmación; borrar focus block propio → directo.

---

## 8. Phase 1 definitiva

Alcance: infraestructura, schema, RLS, repositorios, tipos, tests. Sin LLM, sin voz, sin Calendar API, sin UI (ni shell).

Entregables:

1. Limpieza: `docs/` con los .md; se eliminan `12_IMPLEMENTATION_PLAYBOOK.md` y `15_FABLE_FIRST_PROMPTS.md`; README con orden nuevo; carpeta anidada eliminada; este documento como `docs/18_ENGINE_SPEC.md`.
2. Scaffold: Next.js (App Router), TypeScript `strict` + `noUncheckedIndexedAccess`, ESLint, Prettier, Vitest, scripts `typecheck`, `lint`, `test`, `build`, `db:reset`, `db:types`.
3. Supabase CLI: `supabase/migrations/0001_init.sql` con el schema original más S1–S12; `0002_rls.sql` con policies; `0003_functions.sql` con triggers `updated_at`, `handle_new_user`, `bootstrap_defaults(user_id)` (áreas con `budget_category`); `supabase/seed.sql` solo para entorno local (usuario de prueba vía `auth.users` + Portfolio con 9 días).
4. Tipos generados `src/data/supabase/database.types.ts` y tipos de dominio `src/domain/types/*` (extienden `02_TYPES.ts` a todas las tablas) con esquemas Zod para `frequency_json`, `scope_json`, `context_json`, `attention_budget_targets`.
5. `src/domain/policies/defaults.ts` con la tabla de la sección 0 y tipo `Policy`.
6. Repositorios: interfaz + Supabase + in-memory para `users, areas, projects, tasks, commitments, commitmentLogs, ideas, decisions, observations, memoryEvents, habits, habitLogs, attentionItems, attentionSnapshots, activations, behaviorObservations, conversations, calendarConnections, calendarEventsCache, auditLog, checkins, reviews`. Invariantes en dominio y en base: un primario activo; máximo 3 activos (función SQL `assert_active_project_limit` como trigger `before insert/update`); `reschedule_count` incremental.
7. Clientes Supabase: browser, server (cookies), service role (solo jobs), en `src/data/supabase/`.
8. `.env.example` actualizado (`CALENDAR_TOKEN_ENCRYPTION_KEY`).
9. Reporte de cierre: archivos, decisiones, riesgos abiertos.

No incluye: engines (Phase 3+), servicios de aplicación más allá de los repositorios, endpoints, tools, prompts.

---

## 9. Tests de aceptación de Phase 1

Infraestructura:
1. `supabase db reset` aplica 0001–0003 sin error en Postgres limpio.
2. `db:types` genera tipos y `typecheck` pasa con `strict`.
3. `lint` y `build` pasan.

Schema:
4. Insertar en `calendar_connections` con `provider='google'` funciona; con `'outlook'` falla.
5. Insertar `habits.frequency_json` sin `period` falla por check constraint.
6. Insertar `behavior_observations.friction_type = 'lazy'` falla; `'ambiguity'` funciona.
7. `decisions.status` acepta solo valores de `memory_status`.
8. Trigger `updated_at` cambia el valor en update.
9. Insert en `auth.users` crea fila en `public.users` con `timezone` default y `weekly_available_hours = 40`.
10. `bootstrap_defaults` es idempotente: dos llamadas, cinco áreas, cada una con `budget_category` correcto.

Invariantes:
11. Segundo proyecto `is_primary=true` activo para el mismo usuario falla (índice).
12. Cuarto proyecto `active` falla (trigger); pausar uno y crear otro funciona.
13. `setPrimary(B)` con A primario deja A `is_primary=false` y B `true` en una transacción; `setPrimary` sobre proyecto `paused` falla.
14. Cambiar `tasks.scheduled_for` de un valor a otro incrementa `reschedule_count`; de nulo a valor no incrementa; a nulo no incrementa.
15. `habit_logs` duplicado `(habit_id, log_date)` falla.

RLS (contra Supabase local con dos usuarios):
16. Usuario B no lee proyectos de A (`select` devuelve 0 filas).
17. Usuario B no puede insertar con `user_id = A`.
18. Service role lee ambos.
19. `users`: cada uno lee solo su fila.

Repositorios (in-memory y Supabase con la misma suite):
20. CRUD de cada agregado devuelve tipos de dominio (camelCase, fechas ISO) y no tipos de base.
21. `projects.listActive(userId)` ordena por `priority desc, last_activity_at asc`.
22. `attentionItems.findByKindAndEntity` distingue `active` de `dismissed`.
23. `commitmentLogs`/`habitLogs.listInRange` respeta límites inclusivos en zona del usuario.
24. `decisions.listActiveByScope({kind, entityId})` devuelve globales y las que matchean `entityId`.
25. `memoryEvents.search('portfolio')` (Supabase) devuelve resultados rankeados; in-memory hace match por substring y la suite lo marca como equivalente funcional.

Seed local:
26. Tras `db:reset`, existe Portfolio primario con `last_activity_at` = now − 9 días y `next_action` definido, listo para el test de aceptación de Phase 3 (severidad 4).
