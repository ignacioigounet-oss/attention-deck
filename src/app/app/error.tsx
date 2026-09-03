"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main>
      <p className="meta">Error</p>
      <h1>Algo falló al cargar el estado.</h1>
      <p className="mono">{error.digest ?? error.message}</p>
      <button type="button" onClick={reset}>
        Reintentar
      </button>
    </main>
  );
}
