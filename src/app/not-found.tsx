import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <p className="meta">404</p>
      <h1>Esa ruta no existe.</h1>
      <p>
        <Link href="/app">Volver al estado</Link>
      </p>
    </main>
  );
}
