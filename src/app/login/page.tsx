export const dynamic = "force-dynamic";

import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main>
      <p className="meta">Attention Deck · acceso</p>
      <h1>Iniciar sesión</h1>
      <LoginForm next={next ?? ""} />
    </main>
  );
}
