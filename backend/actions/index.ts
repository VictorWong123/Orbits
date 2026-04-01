"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@backend/lib/supabase/server";
import type { UserSettings } from "@backend/types/database";

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const ProfileSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  birthday: z.string().date().optional(),
});

const FactSchema = z.object({
  profile_id: z.string().uuid(),
  content: z.string().min(1, "Fact content is required"),
  category: z.string().default("general"),
});

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

// ---------------------------------------------------------------------------
// Auth Actions
// ---------------------------------------------------------------------------

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
 * Returns an error string on failure; redirects to /dashboard on success.
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
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------------------------------------------------------------------------
// Settings Actions
// ---------------------------------------------------------------------------

/**
 * Fetches the settings row for the currently authenticated user.
 * Returns null if the user is not authenticated or no settings row exists yet.
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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Not authenticated";

  const { error } = await supabase.from("user_settings").upsert(
    { user_id: user.id, palette_id: paletteId },
    { onConflict: "user_id" }
  );

  return error ? error.message : null;
}

// ---------------------------------------------------------------------------
// Profile Actions
// ---------------------------------------------------------------------------

/**
 * Creates a new profile row for the authenticated user.
 * Returns an error string on failure, or null on success.
 */
export async function createProfile(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Not authenticated";

  const parsed = ProfileSchema.safeParse({
    full_name: formData.get("full_name"),
    birthday: formData.get("birthday") || undefined,
  });

  if (!parsed.success) return parsed.error.errors[0].message;

  const { error } = await supabase.from("profiles").insert({
    ...parsed.data,
    user_id: user.id,
  });

  if (error) return error.message;

  revalidatePath("/dashboard");
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
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", profileId);

  if (error) return error.message;

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// ---------------------------------------------------------------------------
// Fact Actions
// ---------------------------------------------------------------------------

/**
 * Adds a new fact to a profile.
 * Returns an error string on failure, or null on success.
 */
export async function createFact(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Not authenticated";

  const parsed = FactSchema.safeParse({
    profile_id: formData.get("profile_id"),
    content: formData.get("content"),
    category: formData.get("category") || "general",
  });

  if (!parsed.success) return parsed.error.errors[0].message;

  const { error } = await supabase.from("facts").insert({
    ...parsed.data,
    user_id: user.id,
  });

  if (error) return error.message;

  revalidatePath(`/profile/${parsed.data.profile_id}`);
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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Not authenticated";

  const { error } = await supabase
    .from("facts")
    .delete()
    .eq("id", factId)
    .eq("user_id", user.id);

  if (error) return error.message;

  revalidatePath(`/profile/${profileId}`);
  return null;
}

// ---------------------------------------------------------------------------
// Event Actions
// ---------------------------------------------------------------------------

/**
 * Adds a new event to a profile.
 * Returns an error string on failure, or null on success.
 */
export async function createEvent(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Not authenticated";

  const parsed = EventSchema.safeParse({
    profile_id: formData.get("profile_id"),
    title: formData.get("title"),
    event_date: formData.get("event_date"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) return parsed.error.errors[0].message;

  const { error } = await supabase.from("events").insert({
    ...parsed.data,
    user_id: user.id,
  });

  if (error) return error.message;

  revalidatePath(`/profile/${parsed.data.profile_id}`);
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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Not authenticated";

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("user_id", user.id);

  if (error) return error.message;

  revalidatePath(`/profile/${profileId}`);
  return null;
}
