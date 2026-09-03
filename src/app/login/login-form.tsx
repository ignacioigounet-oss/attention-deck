"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "@/auth/actions";

const initial: SignInState = { error: null };

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, initial);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="next" value={next} />
      <label>
        Email
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label>
        Contraseña
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {state.error ? <p className="error">{state.error}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
