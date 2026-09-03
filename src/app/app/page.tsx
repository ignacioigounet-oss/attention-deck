import Link from "next/link";
import { getProjectOverview } from "@/application/queries/projects";
import { requireAppContext } from "@/server/app-context";
import { daysSince } from "@/ui/format";

export default async function AppHome() {
  const { user, session, repos } = await requireAppContext();
  const overview = await getProjectOverview(repos, user.id);
  const stalled = daysSince(overview.primary?.lastActivityAt ?? null);

  return (
    <main>
      <p className="meta">Estado del sistema · fase 2</p>
      <h1>{overview.primary ? overview.primary.name : "Sin proyecto primario"}</h1>
      {overview.primary ? (
        <p className="mono">
          {stalled === null
            ? "SIN ACTIVIDAD REGISTRADA"
            : `${String(stalled).padStart(2, "0")} DÍAS SIN ACTIVIDAD`}
          {overview.primary.nextAction ? ` · PRÓXIMO: ${overview.primary.nextAction}` : ""}
        </p>
      ) : (
        <p className="empty">Todavía no elegiste un proyecto primario.</p>
      )}

      <h2>Sesión</h2>
      <dl className="facts">
        <dt>Usuario</dt>
        <dd>
          {user.displayName || "—"} <span className="mono">{session.email ?? user.email}</span>
        </dd>
        <dt>ID</dt>
        <dd className="mono">{user.id}</dd>
        <dt>Zona horaria</dt>
        <dd>{user.timezone}</dd>
        <dt>Horas semanales</dt>
        <dd>{user.weeklyAvailableHours}</dd>
        <dt>Jornada</dt>
        <dd className="mono">
          {user.dayStart}–{user.dayEnd}
        </dd>
      </dl>

      <h2>Proyectos</h2>
      <dl className="facts">
        <dt>Activos</dt>
        <dd>
          {overview.activeCapacity.used} de {overview.activeCapacity.max}
        </dd>
        <dt>Pausados</dt>
        <dd>{overview.countsByStatus.paused}</dd>
        <dt>Bloqueados</dt>
        <dd>{overview.countsByStatus.blocked}</dd>
        <dt>Completados</dt>
        <dd>{overview.countsByStatus.completed}</dd>
      </dl>
      <p>
        <Link href="/app/projects">Ver proyectos</Link>
      </p>

      <h2>Áreas</h2>
      {overview.areas.length === 0 ? (
        <p className="empty">Sin áreas.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Área</th>
              <th>Categoría</th>
              <th>Objetivo semanal</th>
            </tr>
          </thead>
          <tbody>
            {overview.areas.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td className="mono">{a.budgetCategory ?? "—"}</td>
                <td className="mono">
                  {a.budgetCategory ? `${user.attentionBudgetTargets[a.budgetCategory]} h` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
