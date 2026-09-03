import type { Repositories } from "@/data/repositories/interfaces";
import type { Area, Project, ProjectStatus } from "@/domain/types";
import { INVARIANTS } from "@/domain/policies/defaults";

export interface ProjectOverview {
  primary: Project | null;
  active: Project[];
  /** remaining active-project capacity (max 3) */
  activeCapacity: { used: number; max: number };
  countsByStatus: Record<ProjectStatus, number>;
  areas: Area[];
}

/** Read-only view of project state for the shell. No business rules here beyond reading invariants. */
export async function getProjectOverview(repos: Repositories, userId: string): Promise<ProjectOverview> {
  const [all, active, primary, areas] = await Promise.all([
    repos.projects.listByUser(userId),
    repos.projects.listActive(userId),
    repos.projects.getPrimary(userId),
    repos.areas.listActive(userId),
  ]);
  const countsByStatus: Record<ProjectStatus, number> = {
    active: 0,
    paused: 0,
    blocked: 0,
    completed: 0,
    archived: 0,
  };
  for (const p of all) countsByStatus[p.status] += 1;
  return {
    primary,
    active,
    activeCapacity: { used: active.length, max: INVARIANTS.maxActiveProjects },
    countsByStatus,
    areas,
  };
}
