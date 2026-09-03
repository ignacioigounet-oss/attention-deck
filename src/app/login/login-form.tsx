"use client";

import { useActionState } from "react";
import { signIn, signUp, type AuthFormState } from "@/auth/actions";

const initial: AuthFormState = { error: null, message: null };

export function LoginForm({ next, mode }: { next: string; mode: "login" | "register" }) {
  const [state, action, pending] = useActionState(mode === "register" ? signUp : signIn, initial);
  const register = mode === "register";
  return (
    <form action={action} className="stack">
      <input type="hidden" name="next" value={next} />
      {register ? (
        <label>
          Nombre
          <input name="displayName" type="text" autoComplete="name" />
        </label>
      ) : null}
      <label>
        Email
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label>
        Contraseña
        <input
          name="password"
          type="password"
          autoComplete={register ? "new-password" : "current-password"}
          minLength={register ? 8 : undefined}
          required
        />
      </label>
      {state.error ? <p className="error">{state.error}</p> : null}
      {state.message ? <p>{state.message}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? (register ? "Creando…" : "Entrando…") : register ? "Crear cuenta" : "Entrar"}
      </button>
    </form>
  );
}
