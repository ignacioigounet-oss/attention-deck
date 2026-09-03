"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/data/supabase/clients/server";
import { APP_PATH, LOGIN_PATH, safeNextPath } from "./access";

export interface SignInState {
  error: string | null;
}

/** Email + password sign-in against Supabase Auth. Signup is disabled (V1 single user). */
export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? ""));
  if (!email || !password) return { error: "Email y contraseña son obligatorios." };

  const client = await createSupabaseServerClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { error: "No se pudo iniciar sesión. Revisá email y contraseña." };
  redirect(next.startsWith(APP_PATH) ? next : APP_PATH);
}

export async function signOut(): Promise<void> {
  const client = await createSupabaseServerClient();
  await client.auth.signOut();
  redirect(LOGIN_PATH);
}
