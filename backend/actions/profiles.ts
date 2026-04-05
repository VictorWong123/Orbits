"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthenticatedSupabase } from "@backend/lib/auth-helpers";
import { parseOrError } from "@backend/lib/validators";
import { invalidateDashboardCache } from "@backend/lib/cache";

const ProfileSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  birthday: z.string().date().optional(),
});

/**
 * Creates a new profile row for the authenticated user.
 * Returns an error string on failure, or null on success.
 */
export async function createProfile(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const auth = await getAuthenticatedSupabase();
  if (!auth) return "Not authenticated";

  const { supabase, user } = auth;

  const result = parseOrError(ProfileSchema, {
    full_name: formData.get("full_name"),
    birthday: formData.get("birthday") || undefined,
  });
  if (typeof result === "string") return result;

  const { error } = await supabase.from("profiles").insert({
    ...result,
    user_id: user.id,
  });

  if (error) return error.message;

  invalidateDashboardCache();
  return null;
}

/**
 * Deletes the profile with the given ID (and cascades to its facts/events).
 * Only succeeds if the row belongs to the authenticated user (enforced by RLS).
 *
 * @returns An error string on failure. On success, always redirects to
 *   /dashboard and never returns — redirect() throws internally in Next.js.
 */
export async function deleteProfile(profileId: string): Promise<string> {
  const auth = await getAuthenticatedSupabase();
  if (!auth) return "Not authenticated";

  const { supabase, user } = auth;

  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", profileId)
    .eq("user_id", user.id);

  if (error) return error.message;

  invalidateDashboardCache();
  redirect("/dashboard");
}
