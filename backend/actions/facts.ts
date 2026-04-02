"use server";

import { z } from "zod";
import { getAuthenticatedSupabase } from "@backend/lib/auth-helpers";
import { parseOrError } from "@backend/lib/validators";
import { invalidateProfileCache } from "@backend/lib/cache";

const FactSchema = z.object({
  profile_id: z.string().uuid(),
  content: z.string().min(1, "Fact content is required"),
  category: z.string().default("general"),
});

/**
 * Adds a new fact to a profile.
 * Returns an error string on failure, or null on success.
 */
export async function createFact(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const auth = await getAuthenticatedSupabase();
  if (!auth) return "Not authenticated";

  const { supabase, user } = auth;

  const result = parseOrError(FactSchema, {
    profile_id: formData.get("profile_id"),
    content: formData.get("content"),
    category: formData.get("category") || "general",
  });
  if (typeof result === "string") return result;

  const { error } = await supabase.from("facts").insert({
    ...result,
    user_id: user.id,
  });

  if (error) return error.message;

  invalidateProfileCache(result.profile_id);
  return null;
}

/**
 * Deletes a fact by ID.
 * Verifies ownership server-side as defense-in-depth alongside RLS.
 *
 * @returns An error string on failure, or null on success.
 */
export async function deleteFact(
  factId: string,
  profileId: string
): Promise<string | null> {
  const auth = await getAuthenticatedSupabase();
  if (!auth) return "Not authenticated";

  const { supabase, user } = auth;

  const { error } = await supabase
    .from("facts")
    .delete()
    .eq("id", factId)
    .eq("user_id", user.id);

  if (error) return error.message;

  invalidateProfileCache(profileId);
  return null;
}
