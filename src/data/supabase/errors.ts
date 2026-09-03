import { DomainError, type DomainErrorCode } from "@/domain/errors";

interface PgError {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

/** Maps PostgREST / PostgreSQL errors to domain errors. */
export function mapSupabaseError(e: PgError, context: string): DomainError {
  const msg = e.message ?? "";
  let code: DomainErrorCode = "UNKNOWN";
  switch (e.code) {
    case "23505":
      code = "DUPLICATE";
      break;
    case "42501":
      code = "FORBIDDEN";
      break;
    case "PGRST116":
      code = "NOT_FOUND";
      break;
    case "23503":
    case "23514":
    case "22P02":
    case "22007":
    case "22008":
    case "23502":
      code = "VALIDATION";
      break;
    case "P0001":
      if (/active project limit/i.test(msg)) code = "ACTIVE_PROJECT_LIMIT";
      else if (/only active projects can be primary/i.test(msg)) code = "PRIMARY_NOT_ACTIVE";
      else code = "VALIDATION";
      break;
    case "P0002":
      code = "NOT_FOUND";
      break;
  }
  return new DomainError(`${context}: ${msg}${e.details ? ` (${e.details})` : ""}`, code);
}
