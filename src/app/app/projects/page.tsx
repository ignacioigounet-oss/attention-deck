import { getProjectOverview } from "@/application/queries/projects";
import { requireAppContext } from "@/server/app-context";
import { daysSince, formatDate } from "@/ui/format";

export default async function ProjectsPage() {
  const { user, repos } = await requireAppContext();
  const overview = await getProjectOverview(repos, user.id);
  const all = await repos.projects.listByUser(user.id);
  const areaName = new Map(overview.areas.map((a) => [a.id, a.name]));
  const ordered = [...overview.active, ...all.filter((p) => p.status !== "active")];

  return (
    <main>
      <p className="meta">
        Proyectos · {overview.activeCapacity.used}/{overview.activeCapacity.max} activos
      </p>
      <h1>Proyectos</h1>
      {ordered.length === 0 ? (
        <p className="empty">No hay proyectos todavía.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Proyecto</th>
              <th>Área</th>
              <th>Estado</th>
              <th>Prioridad</th>
              <th>Última actividad</th>
              <th>Próxima acción</th>
              <th>Fecha objetivo</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((p) => {
              const days = daysSince(p.lastActivityAt);
              return (
                <tr key={p.id}>
                  <td>
                    <span
                      className="led"
                      data-state={p.isPrimary ? "primary" : p.status}
                      title={p.isPrimary ? "primario" : p.status}
                    />
                  </td>
                  <td>
                    {p.name}
                    {p.isPrimary ? <span className="meta"> · primario</span> : null}
                  </td>
                  <td>{p.areaId ? (areaName.get(p.areaId) ?? "—") : "—"}</td>
                  <td className="mono">{p.status}</td>
                  <td className="mono">{p.priority}</td>
                  <td className="mono">{days === null ? "—" : `${days} d`}</td>
                  <td>{p.nextAction ?? <span className="empty">sin próxima acción</span>}</td>
                  <td className="mono">{formatDate(p.targetDate, user.timezone)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
