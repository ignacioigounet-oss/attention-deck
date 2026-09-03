/** Instant comparison independent of ISO formatting (`Z` vs `+00:00`, fractional seconds). */
export function sameInstant(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return a === b;
  return ta === tb;
}
