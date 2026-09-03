import { DomainError } from "@/domain/errors";
import type { Repositories } from "@/data/repositories/interfaces";
import type { User } from "@/domain/types";

export interface BootstrapResult {
  user: User;
  /** true when default areas were created on this call */
  bootstrapped: boolean;
}

/**
 * Ensures the signed-in auth user is usable by the application:
 * `public.users` must exist (created by the auth trigger) and the default
 * areas are created once (`bootstrap_defaults` is idempotent; this function
 * only calls it when the user has no areas, to avoid an RPC per request).
 */
export async function ensureUserBootstrapped(repos: Repositories, userId: string): Promise<BootstrapResult> {
  const user = await repos.users.getById(userId);
  if (!user) {
    throw new DomainError(
      `public.users row for ${userId} is missing; the auth trigger did not run or the session is stale`,
      "NOT_FOUND",
    );
  }
  const areas = await repos.areas.listByUser(userId);
  if (areas.length > 0) return { user, bootstrapped: false };
  await repos.users.bootstrapDefaults(userId);
  return { user, bootstrapped: true };
}
