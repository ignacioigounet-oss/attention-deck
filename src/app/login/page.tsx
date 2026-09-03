export const dynamic = "force-dynamic";

import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string }>;
}) {
  const { next, mode } = await searchParams;
  const register = mode === "register";
  const nextQuery = next ? `&next=${encodeURIComponent(next)}` : "";
  return (
    <main>
      <p className="meta">Attention Deck · acceso</p>
      <h1>{register ? "Crear cuenta" : "Iniciar sesión"}</h1>
      <LoginForm next={next ?? ""} mode={register ? "register" : "login"} />
      <p>
        {register ? (
          <Link href={`/login?mode=login${nextQuery}`}>Ya tengo cuenta</Link>
        ) : (
          <Link href={`/login?mode=register${nextQuery}`}>Crear una cuenta</Link>
        )}
      </p>
    </main>
  );
}
