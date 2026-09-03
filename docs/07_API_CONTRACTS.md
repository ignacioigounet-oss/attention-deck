# API CONTRACTS

POST /api/voice/token
Returns an ephemeral voice client credential.
Never return the permanent OpenAI key.

POST /api/agent/run
Request:
{"message":"¿Qué merece mi atención hoy?"}
Response:
{"message":"...","attention":[],"actions":[],"traceId":"..."}

GET /api/attention/today
Returns today's directive, primary attention, attention items, load, habits and calendar highlights.

POST /api/checkin
Request:
{"date":"2026-09-03","transcript":"Hoy avancé..."}

GET /api/projects
POST /api/projects
GET /api/tasks
POST /api/tasks
POST /api/habits/log
POST /api/activation/suggest
POST /api/behavior
GET /api/calendar/availability
POST /api/calendar/events
PATCH /api/calendar/events/:id
DELETE /api/calendar/events/:id
GET /api/calendar/audit
GET /api/reviews/weekly
GET /api/reviews/monthly
POST /api/memory/decision
GET /api/memory/search

All server-side write operations must enforce user ownership and confirmation policy where required.
