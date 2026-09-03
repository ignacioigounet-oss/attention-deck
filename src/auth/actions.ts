"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/data/supabase/clients/server";
import { APP_PATH, LOGIN_PATH, safeNextPath } from "./access";

export interface AuthFormState {
  error: string | null;
  /** Informational message (e.g. "check your email") when no redirect happens. */
  message: string | null;
}

const MIN_PASSWORD = 8;

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    next: safeNextPath(String(formData.get("next") ?? "")),
  };
}

/** Email + password sign-in against Supabase Auth. */
export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { email, password, next } = readCredentials(formData);
  if (!email || !password) return { error: "Email y contraseña son obligatorios.", message: null };

  const client = await createSupabaseServerClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { error: "No se pudo iniciar sesión. Revisá email y contraseña.", message: null };
  redirect(next.startsWith(APP_PATH) ? next : APP_PATH);
}

/**
 * Email + password registration. The database trigger creates `public.users`;
 * the first visit to /app bootstraps the default areas. If the Supabase
 * project requires email confirmation, no session is returned and the user
 * is told to check their inbox.
 */
export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { email, password, next } = readCredentials(formData);
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!email || !password) return { error: "Email y contraseña son obligatorios.", message: null };
  if (password.length < MIN_PASSWORD) {
    return { error: `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.`, message: null };
  }

  const client = await createSupabaseServerClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: displayName ? { display_name: displayName } : {} },
  });
  if (error) return { error: `No se pudo crear la cuenta: ${error.message}`, message: null };
  if (!data.session) {
    return { error: null, message: "Cuenta creada. Revisá tu email para confirmarla y después entrá." };
  }
  redirect(next.startsWith(APP_PATH) ? next : APP_PATH);
}

export async function signOut(): Promise<void> {
  const client = await createSupabaseServerClient();
  await client.auth.signOut();
  redirect(LOGIN_PATH);
}
