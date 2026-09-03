import { tool } from "@openai/agents";
import { z } from "zod";

export const getTodayContext = tool({
  name: "get_today_context",
  description: "Read current calendar, projects, commitments, habits, attention and load.",
  parameters: z.object({}),
  execute: async () => ({ ok: true })
});

export const getAttentionState = tool({
  name: "get_attention_state",
  description: "Return primary attention, active warnings, attention budget and today's directive inputs.",
  parameters: z.object({}),
  execute: async () => ({ ok: true })
});

export const listProjects = tool({
  name: "list_projects",
  description: "List projects by status.",
  parameters: z.object({
    status: z.enum(["active","paused","blocked","completed","archived"]).optional()
  }),
  execute: async ({ status }) => ({ status, projects: [] })
});

export const createProject = tool({
  name: "create_project",
  description: "Create a project only when the user explicitly promotes an idea.",
  parameters: z.object({
    name: z.string().min(1),
    goal: z.string().optional(),
    areaId: z.string().uuid().nullable().optional(),
    priority: z.number().int().min(1).max(5).default(3)
  }),
  execute: async (input) => ({ ok: true, input })
});

export const createTask = tool({
  name: "create_task",
  description: "Create one concrete next action.",
  parameters: z.object({
    title: z.string().min(1),
    projectId: z.string().uuid().nullable().optional(),
    estimatedMinutes: z.number().int().positive().nullable().optional(),
    dueDate: z.string().datetime().nullable().optional()
  }),
  execute: async (input) => ({ ok: true, input })
});

export const completeTask = tool({
  name: "complete_task",
  description: "Complete a task and update project activity.",
  parameters: z.object({ taskId: z.string().uuid() }),
  execute: async ({ taskId }) => ({ ok: true, taskId })
});

export const createCommitment = tool({
  name: "create_commitment",
  description: "Create a recurring commitment after explicit agreement.",
  parameters: z.object({
    description: z.string().min(1),
    frequency: z.string().min(1),
    startDate: z.string(),
    endDate: z.string().nullable().optional(),
    targetCount: z.number().int().positive().nullable().optional(),
    projectId: z.string().uuid().nullable().optional()
  }),
  execute: async (input) => ({ ok: true, input })
});

export const logHabit = tool({
  name: "log_habit",
  description: "Record a habit outcome for a date.",
  parameters: z.object({
    habitId: z.string().uuid(),
    logDate: z.string(),
    status: z.enum(["done","not_done","partial","skipped"]),
    value: z.number().nullable().optional(),
    note: z.string().nullable().optional()
  }),
  execute: async (input) => ({ ok: true, input })
});

export const getCalendarAvailability = tool({
  name: "get_calendar_availability",
  description: "Read Google Calendar and find usable focus windows.",
  parameters: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
    minimumMinutes: z.number().int().positive().default(30)
  }),
  execute: async (input) => ({ ok: true, input, windows: [] })
});

export const createCalendarEvent = tool({
  name: "create_calendar_event",
  description: "Create a Google Calendar event after conflict checking and required confirmation.",
  parameters: z.object({
    title: z.string().min(1),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    description: z.string().optional(),
    calendarId: z.string().optional()
  }),
  execute: async (input) => ({ ok: true, input })
});

export const updateCalendarEvent = tool({
  name: "update_calendar_event",
  description: "Update a Google Calendar event after validation.",
  parameters: z.object({
    eventId: z.string().min(1),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    title: z.string().optional()
  }),
  execute: async (input) => ({ ok: true, input })
});

export const deleteCalendarEvent = tool({
  name: "delete_calendar_event",
  description: "Delete a Google Calendar event only with the appropriate confirmation.",
  parameters: z.object({ eventId: z.string().min(1) }),
  execute: async ({ eventId }) => ({ ok: true, eventId })
});

export const suggestActivation = tool({
  name: "suggest_activation",
  description: "Choose an evidence-informed activation strategy when initiation friction is detected. The strategy is internal; never expose it as a product catalog.",
  parameters: z.object({
    strategy: z.enum([
      "reduce_scope","make_concrete","lower_quality_bar",
      "implementation_intention","externalize_commitment",
      "remove_choices","close_loop","physical_activation","other"
    ]),
    projectId: z.string().uuid().nullable().optional(),
    taskId: z.string().uuid().nullable().optional(),
    timerMinutes: z.number().int().positive().nullable().optional(),
    rationale: z.string().min(1)
  }),
  execute: async (input) => ({ ok: true, input })
});

export const recordBehavior = tool({
  name: "record_behavior",
  description: "Record friction, strategy and outcome for future personalization.",
  parameters: z.object({
    entityId: z.string().uuid().nullable(),
    frictionType: z.string().min(1),
    context: z.string().optional(),
    strategy: z.enum([
      "reduce_scope","make_concrete","lower_quality_bar",
      "implementation_intention","externalize_commitment",
      "remove_choices","close_loop","physical_activation","other"
    ]).nullable().optional(),
    outcome: z.string().optional(),
    helpful: z.boolean().nullable().optional()
  }),
  execute: async (input) => ({ ok: true, input })
});

export const detectStalledProjects = tool({
  name: "detect_stalled_projects",
  description: "Detect important projects with weak activity or repeated misses.",
  parameters: z.object({}),
  execute: async () => ({ ok: true, attentionItems: [] })
});

export const calculateWeeklyLoad = tool({
  name: "calculate_weekly_load",
  description: "Estimate available, committed and planned weekly time.",
  parameters: z.object({ weekStart: z.string() }),
  execute: async ({ weekStart }) => ({ ok: true, weekStart, status: "HEALTHY" })
});

export const generateWeeklyReview = tool({
  name: "generate_weekly_review",
  description: "Generate a continuity-focused weekly review.",
  parameters: z.object({ periodStart: z.string(), periodEnd: z.string() }),
  execute: async (input) => ({ ok: true, input })
});

export const rememberDecision = tool({
  name: "remember_decision",
  description: "Persist an explicit user decision.",
  parameters: z.object({
    title: z.string().min(1),
    decision: z.string().min(1),
    reason: z.string().nullable().optional(),
    reviewDate: z.string().nullable().optional()
  }),
  execute: async (input) => ({ ok: true, input })
});

export const searchMemory = tool({
  name: "search_memory",
  description: "Search structured long-term memory.",
  parameters: z.object({
    query: z.string().min(1),
    limit: z.number().int().min(1).max(20).default(8)
  }),
  execute: async (input) => ({ ok: true, input, results: [] })
});

export const allTools = [
  getTodayContext, getAttentionState, listProjects, createProject,
  createTask, completeTask, createCommitment, logHabit,
  getCalendarAvailability, createCalendarEvent, updateCalendarEvent,
  deleteCalendarEvent, suggestActivation, recordBehavior,
  detectStalledProjects, calculateWeeklyLoad, generateWeeklyReview,
  rememberDecision, searchMemory
];
