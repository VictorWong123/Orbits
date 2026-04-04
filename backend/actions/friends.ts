"use server";

import { z } from "zod";
import { getAuthenticatedSupabase } from "@backend/lib/auth-helpers";
import { parseOrError } from "@backend/lib/validators";
import { invalidateFriendsCache } from "@backend/lib/cache";

const SendFriendRequestSchema = z.object({
  orbitId: z.string().uuid("Please enter a valid Orbit ID"),
});

/**
 * Sends a friend request to another user by their Orbit ID (UUID).
 *
 * Users share their Orbit ID from the /account page. This avoids email
 * enumeration — no RPC lookup is needed since the UUID is the direct key.
 * Guards against self-friending and duplicate requests.
 *
 * @param _prevState - Previous form action state (required by useActionState).
 * @param formData   - Must contain an `orbitId` field (UUID string).
 * @returns null on success, or an error string on failure.
 */
export async function sendFriendRequest(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const auth = await getAuthenticatedSupabase();
  if (!auth) return "Not authenticated";

  const { supabase, user } = auth;

  const result = parseOrError(SendFriendRequestSchema, {
    orbitId: formData.get("orbitId"),
  });
  if (typeof result === "string") return result;

  const { orbitId: receiverId } = result;

  if (receiverId === user.id) return "You cannot send a friend request to yourself.";

  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    receiver_id: receiverId,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") return "A friend request already exists with this user.";
    return error.message;
  }

  invalidateFriendsCache();
  return null;
}

/**
 * Accepts an incoming friend request.
 *
 * Only the receiver of a friendship row can accept it (enforced by RLS and
 * by the explicit receiver_id filter here as defense-in-depth).
 *
 * @param friendshipId - UUID of the friendship row to accept.
 * @returns null on success, or an error string on failure.
 */
export async function acceptFriendRequest(
  friendshipId: string
): Promise<string | null> {
  const auth = await getAuthenticatedSupabase();
  if (!auth) return "Not authenticated";

  const { supabase, user } = auth;

  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", friendshipId)
    .eq("receiver_id", user.id);

  if (error) return error.message;

  invalidateFriendsCache();
  return null;
}

/**
 * Removes a friendship or cancels a pending friend request.
 *
 * Either the requester or the receiver may remove the friendship row.
 * Defense-in-depth: the OR condition mirrors the RLS DELETE policy.
 *
 * @param friendshipId - UUID of the friendship row to delete.
 * @returns null on success, or an error string on failure.
 */
export async function removeFriend(
  friendshipId: string
): Promise<string | null> {
  const auth = await getAuthenticatedSupabase();
  if (!auth) return "Not authenticated";

  const { supabase, user } = auth;

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId)
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

  if (error) return error.message;

  invalidateFriendsCache();
  return null;
}
