"use server";

import { getAuthenticatedSupabase } from "@backend/lib/auth-helpers";
import { createClient } from "@backend/lib/supabase/server";
import type { UserSettings } from "@backend/types/database";

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
