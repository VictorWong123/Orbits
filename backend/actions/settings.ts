"use server";

import { z } from "zod";
import { getAuthenticatedSupabase } from "@backend/lib/auth-helpers";
import { createClient } from "@backend/lib/supabase/server";
import { parseOrError } from "@backend/lib/validators";
import {
  MAX_EVENT_REMINDER_LEAD_MINUTES,
  MIN_EVENT_REMINDER_LEAD_MINUTES,
} from "@backend/lib/event-reminder-constants";
import type { UserSettings, UserProfile } from "@backend/types/database";

/**
 * Fetches the settings row for the currently authenticated user.
 * Returns null when the user is not authenticated or no settings row exists yet.
 */
export async function getSettings(): Promise<UserSettings | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return data ?? null;
}

/**
 * Upserts the user's preferred palette ID.
 * Creates the settings row on first use; updates it on subsequent calls.
 *
 * @param paletteId - One of the palette IDs defined in `frontend/lib/theme.ts`.
 * @returns An error string on failure, or null on success.
 */
export async function updateSettings(paletteId: string): Promise<string | null> {
  const auth = await getAuthenticatedSupabase();
  if (!auth) return "Not authenticated";

  const { supabase, user } = auth;

  const { error } = await supabase.from("user_settings").upsert(
    { user_id: user.id, palette_id: paletteId },
    { onConflict: "user_id" }
  );

  return error ? error.message : null;
}

const UpdateEventReminderLeadMinutesSchema = z.object({
  minutes: z
    .number()
    .int()
    .min(MIN_EVENT_REMINDER_LEAD_MINUTES, "Lead time is too short")
    .max(MAX_EVENT_REMINDER_LEAD_MINUTES, "Lead time is too long"),
});

/**
 * Persists how many minutes before each event the user wants an email reminder.
 * Upserts only `event_reminder_lead_minutes` so the palette and other settings stay unchanged.
 */
export async function updateEventReminderLeadMinutes(
  minutes: number
): Promise<string | null> {
  const auth = await getAuthenticatedSupabase();
  if (!auth) return "Not authenticated";

  const result = parseOrError(UpdateEventReminderLeadMinutesSchema, { minutes });
  if (typeof result === "string") return result;

  const { supabase, user } = auth;

  const { error } = await supabase.from("user_settings").upsert(
    { user_id: user.id, event_reminder_lead_minutes: result.minutes },
    { onConflict: "user_id" }
  );

  return error ? error.message : null;
}

const UpdateUserProfileSchema = z.object({
  display_name: z.string().max(100).optional(),
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Birthday must be YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
  hobbies: z.string().max(500).optional(),
  bio: z.string().max(1000).optional(),
});

/**
 * Returns the authenticated user's own profile row from `user_profiles`.
 * Returns null when not authenticated or no row exists yet.
 */
export async function getMyUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return data ?? null;
}

/**
 * Upserts the authenticated user's profile in `user_profiles`.
 * All fields are optional — only provided fields are written.
 * An empty birthday string is stored as null (treated as "clear").
 *
 * @param formData - May contain display_name, birthday, hobbies, bio.
 * @returns null on success, or an error string on failure.
 */
export async function updateUserProfile(
  formData: FormData
): Promise<string | null> {
  const auth = await getAuthenticatedSupabase();
  if (!auth) return "Not authenticated";

  const { supabase, user } = auth;

  const result = parseOrError(UpdateUserProfileSchema, {
    display_name: formData.get("display_name") ?? undefined,
    birthday: formData.get("birthday") ?? undefined,
    hobbies: formData.get("hobbies") ?? undefined,
    bio: formData.get("bio") ?? undefined,
  });
  if (typeof result === "string") return result;

  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: user.id,
      display_name: result.display_name || null,
      birthday: result.birthday || null,
      hobbies: result.hobbies || null,
      bio: result.bio || null,
    },
    { onConflict: "user_id" }
  );

  return error ? error.message : null;
}
