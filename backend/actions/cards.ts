"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthenticatedSupabase } from "@backend/lib/auth-helpers";
import { parseOrError } from "@backend/lib/validators";
import {
  invalidateCardsCache,
  invalidateDashboardCache,
} from "@backend/lib/cache";

const CreateCardSchema = z.object({
  card_name: z.string().min(1, "Card name is required").max(100),
  phone: z.string().max(50).optional(),
  email: z.string().max(254).optional(),
  hobbies: z.string().max(500).optional(),
  fun_facts: z.string().max(1000).optional(),
  other_notes: z.string().max(2000).optional(),
});

/**
 * Creates a new shareable card for the authenticated user.
 *
 * All fields except `card_name` are optional. The card's UUID acts as the
 * share secret — recipients visit `/share/[id]` to view and import the card.
 *
 * @param _prevState - Previous form action state (required by useActionState).
 * @param formData   - Must contain `card_name`; optionally phone, email,
 *                     hobbies, fun_facts, other_notes.
 * @returns null on success, or an error string on failure.
 */
export async function createCard(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const auth = await getAuthenticatedSupabase();
  if (!auth) return "Not authenticated";

  const { supabase, user } = auth;

  const result = parseOrError(CreateCardSchema, {
    card_name: formData.get("card_name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    hobbies: formData.get("hobbies") || undefined,
    fun_facts: formData.get("fun_facts") || undefined,
    other_notes: formData.get("other_notes") || undefined,
  });
  if (typeof result === "string") return result;

  const { error } = await supabase.from("shareable_cards").insert({
    user_id: user.id,
    card_name: result.card_name,
    phone: result.phone ?? null,
    email: result.email ?? null,
    hobbies: result.hobbies ?? null,
    fun_facts: result.fun_facts ?? null,
    other_notes: result.other_notes ?? null,
  });

  if (error) return error.message;

  invalidateCardsCache();
  return null;
}

/**
 * Deletes a shareable card owned by the authenticated user.
 *
 * Applies an explicit `user_id` filter as defense-in-depth on top of the RLS
 * owner policy, ensuring a user cannot delete another user's card even if
 * RLS were misconfigured.
 *
 * @param cardId - UUID of the shareable card to delete.
 * @returns null on success, or an error string on failure.
 */
export async function deleteCard(cardId: string): Promise<string | null> {
  const auth = await getAuthenticatedSupabase();
  if (!auth) return "Not authenticated";

  const { supabase, user } = auth;

  const { error } = await supabase
    .from("shareable_cards")
    .delete()
    .eq("id", cardId)
    .eq("user_id", user.id);

  if (error) return error.message;

  invalidateCardsCache();
  return null;
}

/**
 * Imports a shared card into the current user's Orbit dashboard.
 *
 * Fetches the shareable card by its public UUID (the public SELECT RLS policy
 * allows any role to read a card by ID). Creates a new profile row with the
 * card's name as `full_name` and the full card snapshot stored in
 * `imported_data`. On success, redirects the caller to the new profile page.
 *
 * Designed for use with `useActionState` — accepts `_prevState` and `_formData`
 * to match the `(prevState, formData) => Promise<string>` signature. On failure
 * it returns an error string; on success it calls `redirect()` internally (which
 * throws a special Next.js error and never reaches the return statement).
 *
 * @param cardId    - UUID of the shareable card to import (bound via `.bind`).
 * @param _prevState - Previous useActionState state (unused).
 * @param _formData  - FormData from the enclosing form (unused).
 * @returns An error string on failure; never returns on success (redirect thrown).
 */
export async function importSharedCard(
  cardId: string,
  _prevState: string | null,
  _formData: FormData
): Promise<string> {
  const auth = await getAuthenticatedSupabase();
  if (!auth) return "Not authenticated";

  const { supabase, user } = auth;

  // Fetch the card. The public SELECT RLS policy allows this even for anon clients,
  // but here we use the authenticated server client which also satisfies it.
  const { data: card, error: fetchError } = await supabase
    .from("shareable_cards")
    .select("*")
    .eq("id", cardId)
    .single();

  if (fetchError || !card) return "Card not found or has been removed.";

  // Build the imported_data snapshot, excluding null/empty fields.
  const importedData: Record<string, unknown> = {
    card_id: card.id,
    card_name: card.card_name,
  };
  if (card.phone) importedData.phone = card.phone;
  if (card.email) importedData.email = card.email;
  if (card.hobbies) importedData.hobbies = card.hobbies;
  if (card.fun_facts) importedData.fun_facts = card.fun_facts;
  if (card.other_notes) importedData.other_notes = card.other_notes;
  if (card.custom_fields?.length) importedData.custom_fields = card.custom_fields;

  const { data: newProfile, error: insertError } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      full_name: card.card_name,
      imported_data: importedData,
    })
    .select("id")
    .single();

  if (insertError || !newProfile) {
    return insertError?.message ?? "Failed to create profile.";
  }

  invalidateDashboardCache();

  // redirect() throws a special Next.js error — it must not be caught.
  redirect(`/profile/${newProfile.id}`);
}
