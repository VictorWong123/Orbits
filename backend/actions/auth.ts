"use server";

import { redirect } from "next/navigation";
import { createClient } from "@backend/lib/supabase/server";

/**
 * Signs the user in with email + password via Supabase Auth.
 * Redirects to /dashboard on success; returns an error string on failure.
 */
export async function signIn(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return error.message;

  redirect("/dashboard");
}

/**
 * Signs the user up with email + password via Supabase Auth.
 * Redirects to /dashboard on success; returns an error string on failure.
 */
export async function signUp(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) return error.message;

  redirect("/dashboard");
}

/**
 * Signs the current user out and redirects to /login.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
