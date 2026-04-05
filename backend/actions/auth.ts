"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@backend/lib/supabase/server";
import { parseOrError } from "@backend/lib/validators";

const MIN_PASSWORD_LENGTH = 6;

const AuthSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
});

/**
 * Signs the user in with email + password via Supabase Auth.
 * Validates input format before forwarding to Supabase.
 * Redirects to /dashboard on success; returns an error string on failure.
 */
export async function signIn(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const result = parseOrError(AuthSchema, {
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (typeof result === "string") return result;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: result.email,
    password: result.password,
  });

  if (error) return error.message;

  redirect("/dashboard");
}

/**
 * Signs the user up with email + password via Supabase Auth.
 * Validates input format before forwarding to Supabase.
 * Redirects to /dashboard on success; returns an error string on failure.
 */
export async function signUp(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const result = parseOrError(AuthSchema, {
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (typeof result === "string") return result;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: result.email,
    password: result.password,
  });

  if (error) return error.message;

  redirect("/dashboard");
}

/**
 * Signs the current user out and redirects to /login.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/account");
}
