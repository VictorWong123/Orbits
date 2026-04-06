"use server";

import { z } from "zod";
import { getAuthenticatedSupabase } from "@backend/lib/auth-helpers";
import { createClient } from "@backend/lib/supabase/server";
import { parseOrError } from "@backend/lib/validators";
import {
  MAX_EVENT_REMINDER_LEAD_MINUTES,
  MIN_EVENT_REMINDER_LEAD_MINUTES,
} from "@backend/lib/event-reminder-constants";
import { SUPABASE_URL } from "@backend/lib/supabase/config";
import type { UserSettings, UserProfile } from "@backend/types/database";

const AVATAR_BUCKET = "Avatars";
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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

const VALID_PALETTE_IDS = ["sage", "ocean", "lavender", "rose", "amber", "slate"] as const;

const UpdatePaletteSchema = z.object({
  palette_id: z.enum(VALID_PALETTE_IDS, {
    errorMap: () => ({ message: "Invalid palette ID" }),
  }),
});

/**
 * Upserts the user's preferred palette ID.
 * Creates the settings row on first use; updates it on subsequent calls.
 * Only accepts one of the six defined palette IDs.
 *
 * @param paletteId - One of the palette IDs defined in `frontend/lib/theme.ts`.
 * @returns An error string on failure, or null on success.
 */
export async function updateSettings(paletteId: string): Promise<string | null> {
  const auth = await getAuthenticatedSupabase();
  if (!auth) return "Not authenticated";

  const result = parseOrError(UpdatePaletteSchema, { palette_id: paletteId });
  if (typeof result === "string") return result;

  const { supabase, user } = auth;

  const { error } = await supabase.from("user_settings").upsert(
    { user_id: user.id, palette_id: result.palette_id },
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

/**
 * Constructs the public URL for a file stored in a Supabase Storage bucket.
 */
function publicStorageUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Uploads an avatar image to Supabase Storage and persists the public URL
 * in `user_profiles.avatar_url`.
 *
 * Validates file type (JPEG, PNG, WebP, GIF) and size (max 2 MB).
 * Overwrites any existing avatar for the same user.
 *
 * @returns null on success, or an error string on failure.
 */
export async function uploadUserAvatar(formData: FormData): Promise<string | null> {
  const auth = await getAuthenticatedSupabase();
  if (!auth) return "Not authenticated";

  const { supabase, user } = auth;

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) return "No file provided";
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) return "File must be JPEG, PNG, WebP, or GIF";
  if (file.size > MAX_AVATAR_SIZE_BYTES) return "File must be under 2 MB";

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const storagePath = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(storagePath, file, { upsert: true, contentType: file.type });

  if (uploadError) return uploadError.message;

  const avatarUrl = publicStorageUrl(AVATAR_BUCKET, storagePath);

  const { error: dbError } = await supabase.from("user_profiles").upsert(
    { user_id: user.id, avatar_url: avatarUrl },
    { onConflict: "user_id" }
  );

  return dbError ? dbError.message : null;
}

/**
 * Removes the user's avatar image from Supabase Storage and clears the
 * `avatar_url` column in `user_profiles`.
 *
 * @returns null on success, or an error string on failure.
 */
export async function deleteUserAvatar(): Promise<string | null> {
  const auth = await getAuthenticatedSupabase();
  if (!auth) return "Not authenticated";

  const { supabase, user } = auth;

  const { data: files } = await supabase.storage
    .from(AVATAR_BUCKET)
    .list(user.id);

  if (files && files.length > 0) {
    const paths = files.map((f) => `${user.id}/${f.name}`);
    await supabase.storage.from(AVATAR_BUCKET).remove(paths);
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({ avatar_url: null })
    .eq("user_id", user.id);

  return error ? error.message : null;
}
