/** Key-case conversion between DB rows (snake_case) and domain objects (camelCase). */

export const toCamel = (s: string): string => s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
export const toSnake = (s: string): string => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Converts top-level keys only; nested JSON values are stored as-is. */
export function camelizeKeys(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[toCamel(k)] = v;
  return out;
}

export function snakeizeKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[toSnake(k)] = v;
  }
  return out;
}

export { isPlainObject };
