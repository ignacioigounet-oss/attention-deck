/** Domain errors shared by all repository implementations. */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: DomainErrorCode,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export type DomainErrorCode =
  | "NOT_FOUND"
  | "ACTIVE_PROJECT_LIMIT"
  | "PRIMARY_NOT_ACTIVE"
  | "PRIMARY_ALREADY_SET"
  | "DUPLICATE"
  | "VALIDATION"
  | "FORBIDDEN"
  | "UNKNOWN";

export const isDomainError = (e: unknown, code?: DomainErrorCode): e is DomainError =>
  e instanceof DomainError && (code === undefined || e.code === code);
