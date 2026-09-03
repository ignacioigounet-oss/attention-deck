import type { Repositories } from "@/data/repositories/interfaces";
import type { User } from "@/domain/types";

/** What the auth layer knows about the caller. Independent of any provider. */
export interface Session {
  userId: string;
  email: string | null;
}

/**
 * Per-request application context: the authenticated user plus the
 * repositories bound to that user's credentials (RLS applies).
 * Engines (Phase 3+) and tools (Phase 8) receive this object; nothing in the
 * application layer reaches for a database client directly.
 */
export interface AppContext {
  session: Session;
  user: User;
  repos: Repositories;
}
