import type { Repositories } from "@/data/repositories/interfaces";
import { ensureUserBootstrapped } from "./bootstrap";
import type { AppContext, Session } from "./context";

export interface ContainerDeps {
  /** Resolves the caller's session (null when signed out). */
  getSession: () => Promise<Session | null>;
  /** Builds repositories bound to the caller's credentials. */
  createRepositories: (session: Session) => Repositories;
}

/**
 * Framework-agnostic wiring: given a way to resolve the session and a way to
 * build user-bound repositories, produce the AppContext (or null).
 * The Next.js adapter in `src/server/app-context.ts` supplies real deps;
 * tests supply an in-memory pair.
 */
export function createContainer(deps: ContainerDeps) {
  return {
    async getAppContext(): Promise<AppContext | null> {
      const session = await deps.getSession();
      if (!session) return null;
      const repos = deps.createRepositories(session);
      const { user } = await ensureUserBootstrapped(repos, session.userId);
      return { session, user, repos };
    },
  };
}

export type Container = ReturnType<typeof createContainer>;
