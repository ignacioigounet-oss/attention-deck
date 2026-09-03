/** Presentation helpers. No business rules. */
export function daysSince(iso: string | null, now = new Date()): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((now.getTime() - t) / 86_400_000);
}

export function formatDate(iso: string | null, timezone: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-AR", { timeZone: timezone, dateStyle: "medium" }).format(new Date(iso));
}
