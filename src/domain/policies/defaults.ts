/**
 * Policy defaults from docs/18_ENGINE_SPEC.md §0.
 * Engines (Phase 3+) receive a `Policy` by injection; nothing reads these
 * values globally. Kept in Phase 1 so the contract is typed from day one.
 */
export interface Policy {
  stagnation: { days: number; daysPrimary: number; noNextActionDays: number; minPriority: number };
  overload: {
    lowRatio: number;
    healthyRatio: number;
    highRatio: number;
    maxActiveProjects: number;
    maxActiveCommitments: number;
    maxOverdueTasks: number;
    defaultMinutesPerOccurrence: number;
    defaultTaskMinutes: number;
  };
  repetition: { sameFrictionCount: number; windowDays: number; rescheduleCount: number };
  deadline: { projectHorizonDays: number; taskHorizonDays: number };
  opportunity: { minWindowMinutes: number };
  activation: {
    defaultTimerMinutes: number;
    startWindowHours: number;
    completeWindowHours: number;
    dismissCooldownDays: number;
  };
  learning: { minSamples: number; patternMinSamples: number; patternRate: number; windowDays: number };
  behavior: { inferThreshold: number; askMargin: number; askCooldownDays: number; structuralCap: number };
  continuity: { sustainedRate: number; sustainedPeriods: number; lapsedPeriods: number };
  memory: { packetTokenBudget: number; voicePacketTokenBudget: number; staleObservationDays: number };
  calendar: { cacheTtlMinutes: number; syncWindowDays: [number, number]; confirmationTtlMinutes: number };
}

export const DEFAULT_POLICY: Policy = {
  stagnation: { days: 7, daysPrimary: 5, noNextActionDays: 3, minPriority: 3 },
  overload: {
    lowRatio: 0.4,
    healthyRatio: 0.85,
    highRatio: 1.0,
    maxActiveProjects: 3,
    maxActiveCommitments: 5,
    maxOverdueTasks: 10,
    defaultMinutesPerOccurrence: 60,
    defaultTaskMinutes: 60,
  },
  repetition: { sameFrictionCount: 3, windowDays: 14, rescheduleCount: 3 },
  deadline: { projectHorizonDays: 14, taskHorizonDays: 7 },
  opportunity: { minWindowMinutes: 90 },
  activation: {
    defaultTimerMinutes: 10,
    startWindowHours: 24,
    completeWindowHours: 48,
    dismissCooldownDays: 3,
  },
  learning: { minSamples: 3, patternMinSamples: 5, patternRate: 0.7, windowDays: 180 },
  behavior: { inferThreshold: 0.7, askMargin: 0.2, askCooldownDays: 7, structuralCap: 0.5 },
  continuity: { sustainedRate: 0.8, sustainedPeriods: 4, lapsedPeriods: 2 },
  memory: { packetTokenBudget: 3000, voicePacketTokenBudget: 1500, staleObservationDays: 60 },
  calendar: { cacheTtlMinutes: 15, syncWindowDays: [-7, 30], confirmationTtlMinutes: 10 },
};

/** Product invariants that are also enforced by the database. */
export const INVARIANTS = {
  maxActiveProjects: 3,
  maxPrimaryProjects: 1,
} as const;
