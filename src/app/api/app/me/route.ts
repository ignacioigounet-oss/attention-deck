export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getProjectOverview } from "@/application/queries/projects";
import { getAppContext } from "@/server/app-context";

/** JSON view of the authenticated state: user, primary project, active projects. */
export async function GET() {
  const ctx = await getAppContext();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const overview = await getProjectOverview(ctx.repos, ctx.user.id);
  return NextResponse.json({
    user: ctx.user,
    primaryProject: overview.primary,
    activeProjects: overview.active,
    activeCapacity: overview.activeCapacity,
    countsByStatus: overview.countsByStatus,
    areas: overview.areas,
  });
}
