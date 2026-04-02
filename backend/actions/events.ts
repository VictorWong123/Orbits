"use server";

import { z } from "zod";
import { getAuthenticatedSupabase } from "@backend/lib/auth-helpers";
import { parseOrError } from "@backend/lib/validators";
import { invalidateProfileCache } from "@backend/lib/cache";

const EventSchema = z.object({
  profile_id: z.string().uuid(),
  title: z.string().min(1, "Event title is required"),
  event_date: z
    .string()
    .min(1, "Event date is required")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Event date must be a valid date",
    }),
  notes: z.string().optional(),
});

/**
 * Adds a new event to a profile.
 * Returns an error string on failure, or null on success.
 */
export async function createEvent(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const auth = await getAuthenticatedSupabase();
  if (!auth) return "Not authenticated";

  const { supabase, user } = auth;

  const result = parseOrError(EventSchema, {
    profile_id: formData.get("profile_id"),
    title: formData.get("title"),
    event_date: formData.get("event_date"),
    notes: formData.get("notes") || undefined,
  });
  if (typeof result === "string") return result;

  const { error } = await supabase.from("events").insert({
    ...result,
    user_id: user.id,
  });

  if (error) return error.message;

  invalidateProfileCache(result.profile_id);
  return null;
}

/**
 * Deletes an event by ID.
 * Verifies ownership server-side as defense-in-depth alongside RLS.
 *
 * @returns An error string on failure, or null on success.
 */
export async function deleteEvent(
  eventId: string,
  profileId: string
): Promise<string | null> {
  const auth = await getAuthenticatedSupabase();
  if (!auth) return "Not authenticated";

  const { supabase, user } = auth;

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("user_id", user.id);

  if (error) return error.message;

  invalidateProfileCache(profileId);
  return null;
}
