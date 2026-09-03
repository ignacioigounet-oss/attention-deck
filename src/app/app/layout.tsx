export const dynamic = "force-dynamic";

import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/auth/actions";
import { requireAppContext } from "@/server/app-context";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user } = await requireAppContext();
  return (
    <>
      <header className="shell">
        <div>
          <span className="meta">Attention Deck</span>
          <nav>
            <Link href="/app">Estado</Link>
            <Link href="/app/projects">Proyectos</Link>
          </nav>
        </div>
        <form action={signOut}>
          <span className="mono">{user.displayName || user.email}</span>{" "}
          <button type="submit" className="quiet">
            Salir
          </button>
        </form>
      </header>
      {children}
    </>
  );
}
