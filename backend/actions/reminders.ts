"use server";

import { z } from "zod";
import { getAuthenticatedSupabase } from "@backend/lib/auth-helpers";
import { parseOrError } from "@backend/lib/validators";
import { invalidateRemindersCache } from "@backend/lib/cache";

/** Maximum unread reminders one user may have pending to another. */
const MAX_UNREAD_REMINDERS = 10;

const SendReminderSchema = z.object({
  friendId: z.string().uuid("Invalid friend ID"),
  eventId: z.string().uuid("Invalid event ID"),
  message: z.string().min(1, "Message is required"),
});

/**
 * Sends an event-based reminder to an accepted friend.
 *
 * Verifies the following before inserting:
 * 1. The friendship between the sender and receiver is accepted.
 * 2. The referenced event belongs to the sender.
 * 3. The sender has fewer than MAX_UNREAD_REMINDERS pending to this recipient.
 *
 * @param _prevState - Previous form action state (required by useActionState).
 * @param formData   - Must contain `friendId`, `eventId`, `message` fields.
 * @returns null on success, or an error string on failure.
 */
export async function sendReminder(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const auth = await getAuthenticatedSupabase();
  if (!auth) return "Not authenticated";

  const { supabase, user } = auth;

  const result = parseOrError(SendReminderSchema, {
    friendId: formData.get("friendId"),
    eventId: formData.get("eventId"),
    message: formData.get("message"),
  });
  if (typeof result === "string") return result;

  const { friendId, eventId, message } = result;

  const { data: friendship } = await supabase
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${user.id},receiver_id.eq.${friendId}),` +
        `and(requester_id.eq.${friendId},receiver_id.eq.${user.id})`
    )
    .maybeSingle();

  if (!friendship) return "You can only send reminders to accepted friends.";

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!event) return "Event not found or does not belong to you.";

  const { count, error: countError } = await supabase
    .from("reminders")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", user.id)
    .eq("receiver_id", friendId)
    .eq("is_read", false);

  if (countError) return countError.message;
  if ((count ?? 0) >= MAX_UNREAD_REMINDERS) {
    return `You have too many unread reminders pending for this friend (max ${MAX_UNREAD_REMINDERS}).`;
  }

  const { error } = await supabase.from("reminders").insert({
    sender_id: user.id,
    receiver_id: friendId,
    event_id: eventId,
    message,
  });

  if (error) return error.message;

  invalidateRemindersCache();
  return null;
}

/**
 * Marks a received reminder as read (dismissed).
 *
 * Only the receiver may mark their own reminders as read (enforced by RLS
 * and by the explicit receiver_id filter here as defense-in-depth).
 *
 * @param reminderId - UUID of the reminder row to mark as read.
 * @returns null on success, or an error string on failure.
 */
export async function markReminderRead(
  reminderId: string
): Promise<string | null> {
  const auth = await getAuthenticatedSupabase();
  if (!auth) return "Not authenticated";

  const { supabase, user } = auth;

  const { error } = await supabase
    .from("reminders")
    .update({ is_read: true })
    .eq("id", reminderId)
    .eq("receiver_id", user.id);

  if (error) return error.message;

  invalidateRemindersCache();
  return null;
}
