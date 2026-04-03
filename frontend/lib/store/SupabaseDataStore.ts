import { createClient } from "@frontend/lib/supabase/client";
import type {
  DataStore,
  ProfileSummary,
  CreateProfileInput,
  CreateFactInput,
  CreateEventInput,
  Friend,
  Reminder,
} from "./types";
import type { Profile, Fact, Event } from "@backend/types/database";

/** Default palette ID used when no user_settings row exists yet. */
const DEFAULT_PALETTE_ID = "sage";

/**
 * Supabase-backed DataStore implementation.
 *
 * Reads use the browser Supabase client directly; Supabase's Row Level
 * Security policy enforces that each user only sees their own rows.
 * Writes also use the browser client, with inline validation mirroring the
 * Zod schemas from the server actions.
 *
 * The `orbits_palette` cookie is written on every palette update so that the
 * server-rendered layout can apply the correct theme without a FOUC even after
 * a full page reload.
 */
export class SupabaseDataStore implements DataStore {
  private supabase = createClient();

  /**
   * Cached user ID after the first successful `getUser` call.
   * Avoids a redundant async round-trip on every subsequent write mutation.
   */
  private cachedUserId: string | null = null;

  /**
   * Returns the authenticated user's ID, fetching it from Supabase on first
   * call and caching the result for the lifetime of this store instance.
   * Returns null if the user is not authenticated.
   */
  private async getUserId(): Promise<string | null> {
    if (this.cachedUserId) return this.cachedUserId;
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    this.cachedUserId = user?.id ?? null;
    return this.cachedUserId;
  }

  /** Returns all profiles for the authenticated user, sorted by name ascending. */
  async getProfiles(): Promise<ProfileSummary[]> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("*, facts(category)")
      .order("full_name", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as ProfileSummary[];
  }

  /** Returns a single profile by ID, or null if not found. */
  async getProfile(id: string): Promise<Profile | null> {
    const { data } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    return (data as Profile | null) ?? null;
  }

  /** Returns all facts for a profile, ordered newest-first. */
  async getFacts(profileId: string): Promise<Fact[]> {
    const { data, error } = await this.supabase
      .from("facts")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as Fact[];
  }

  /** Returns all events for a profile, ordered by event_date ascending. */
  async getEvents(profileId: string): Promise<Event[]> {
    const { data, error } = await this.supabase
      .from("events")
      .select("*")
      .eq("profile_id", profileId)
      .order("event_date", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as Event[];
  }

  /** Returns the authenticated user's saved palette ID. */
  async getPaletteId(): Promise<string> {
    const { data } = await this.supabase
      .from("user_settings")
      .select("palette_id")
      .single();

    return (data as { palette_id: string } | null)?.palette_id ?? DEFAULT_PALETTE_ID;
  }

  /** Creates a new profile for the authenticated user. */
  async createProfile({ full_name, birthday }: CreateProfileInput): Promise<string | null> {
    const trimmed = full_name.trim();
    if (!trimmed) return "Name is required";

    const userId = await this.getUserId();
    if (!userId) return "Not authenticated";

    const { error } = await this.supabase.from("profiles").insert({
      full_name: trimmed,
      birthday: birthday ?? null,
      avatar_url: null,
      user_id: userId,
    });

    return error?.message ?? null;
  }

  /**
   * Deletes the profile row. RLS enforces ownership.
   * Cascaded deletion of facts and events is handled at the database level.
   * Navigation to /dashboard is the caller's responsibility.
   */
  async deleteProfile(profileId: string): Promise<string | null> {
    const { error } = await this.supabase
      .from("profiles")
      .delete()
      .eq("id", profileId);

    return error?.message ?? null;
  }

  /** Creates a new fact for the authenticated user. */
  async createFact({ profile_id, content, category }: CreateFactInput): Promise<string | null> {
    const trimmed = content.trim();
    if (!trimmed) return "Fact content is required";

    const userId = await this.getUserId();
    if (!userId) return "Not authenticated";

    const { error } = await this.supabase.from("facts").insert({
      profile_id,
      content: trimmed,
      category: category || "general",
      user_id: userId,
    });

    return error?.message ?? null;
  }

  /** Deletes a fact by ID. RLS enforces ownership. */
  async deleteFact(factId: string, _profileId: string): Promise<string | null> {
    const { error } = await this.supabase.from("facts").delete().eq("id", factId);
    return error?.message ?? null;
  }

  /** Creates a new event for the authenticated user. */
  async createEvent({
    profile_id,
    title,
    event_date,
    notes,
  }: CreateEventInput): Promise<string | null> {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return "Event title is required";
    if (!event_date) return "Event date is required";
    if (isNaN(Date.parse(event_date))) return "Event date must be a valid date";

    const userId = await this.getUserId();
    if (!userId) return "Not authenticated";

    const { error } = await this.supabase.from("events").insert({
      profile_id,
      title: trimmedTitle,
      event_date,
      notes: notes ?? null,
      user_id: userId,
    });

    return error?.message ?? null;
  }

  /** Deletes an event by ID. RLS enforces ownership. */
  async deleteEvent(eventId: string, _profileId: string): Promise<string | null> {
    const { error } = await this.supabase.from("events").delete().eq("id", eventId);
    return error?.message ?? null;
  }

  /**
   * Updates the birthday field on a profile row.
   * Pass null to clear the birthday. RLS enforces ownership.
   */
  async updateBirthday(
    profileId: string,
    birthday: string | null
  ): Promise<string | null> {
    const { error } = await this.supabase
      .from("profiles")
      .update({ birthday })
      .eq("id", profileId);

    return error?.message ?? null;
  }

  /**
   * Upserts the user's palette preference and writes the `orbits_palette`
   * cookie so the server-rendered layout can apply the correct theme on the
   * next full page load without a FOUC.
   */
  async updatePaletteId(paletteId: string): Promise<string | null> {
    const userId = await this.getUserId();
    if (!userId) return "Not authenticated";

    const { error } = await this.supabase.from("user_settings").upsert(
      { user_id: userId, palette_id: paletteId },
      { onConflict: "user_id" }
    );

    if (!error) {
      document.cookie = `orbits_palette=${paletteId};path=/;max-age=31536000;SameSite=Lax`;
    }

    return error?.message ?? null;
  }

  // ── Friends ──────────────────────────────────────────────────────────────

  /**
   * Fetches all friendships for the current user and resolves each friend's
   * email via the get_user_email_by_id SECURITY DEFINER RPC.
   */
  async getFriends(): Promise<Friend[]> {
    const userId = await this.getUserId();
    if (!userId) return [];

    const { data, error } = await this.supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

    if (error || !data) return [];

    const friends = await Promise.all(
      data.map(async (row) => {
        const isRequester = row.requester_id === userId;
        const friendId = isRequester ? row.receiver_id : row.requester_id;

        const { data: emailData } = await this.supabase.rpc(
          "get_user_email_by_id",
          { user_id_input: friendId }
        );

        return {
          id: row.id as string,
          friendId: friendId as string,
          friendEmail: (emailData as string | null) ?? "Unknown",
          status: row.status as "pending" | "accepted",
          isRequester,
        };
      })
    );

    return friends;
  }

  /**
   * Sends a friend request to the user with the given Orbit ID (UUID).
   * No email lookup RPC is needed — the UUID is used directly as the receiver.
   */
  async sendFriendRequest(orbitId: string): Promise<string | null> {
    const userId = await this.getUserId();
    if (!userId) return "Not authenticated";

    const trimmed = orbitId.trim();
    if (!trimmed) return "Orbit ID is required";

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(trimmed)) return "Please enter a valid Orbit ID";
    if (trimmed === userId) return "You cannot send a friend request to yourself.";

    const { error } = await this.supabase.from("friendships").insert({
      requester_id: userId,
      receiver_id: trimmed,
      status: "pending",
    });

    if (error) {
      if (error.code === "23505") return "A friend request already exists with this user.";
      return error.message;
    }

    return null;
  }

  /** Accepts an incoming friend request by its friendship row ID. */
  async acceptFriendRequest(friendshipId: string): Promise<string | null> {
    const userId = await this.getUserId();
    if (!userId) return "Not authenticated";

    const { error } = await this.supabase
      .from("friendships")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", friendshipId)
      .eq("receiver_id", userId);

    return error?.message ?? null;
  }

  /** Removes a friendship or cancels a pending request. */
  async removeFriend(friendshipId: string): Promise<string | null> {
    const userId = await this.getUserId();
    if (!userId) return "Not authenticated";

    const { error } = await this.supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId)
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

    return error?.message ?? null;
  }

  // ── Reminders ────────────────────────────────────────────────────────────

  /**
   * Fetches all reminders received by the current user, resolving the
   * sender's email via RPC. Unread reminders are sorted first.
   */
  async getReminders(): Promise<Reminder[]> {
    const userId = await this.getUserId();
    if (!userId) return [];

    const { data, error } = await this.supabase
      .from("reminders")
      .select("*")
      .eq("receiver_id", userId)
      .order("is_read", { ascending: true })
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    const reminders = await Promise.all(
      data.map(async (row) => {
        const { data: emailData } = await this.supabase.rpc(
          "get_user_email_by_id",
          { user_id_input: row.sender_id }
        );

        return {
          id: row.id as string,
          senderId: row.sender_id as string,
          senderEmail: (emailData as string | null) ?? "Unknown",
          eventId: row.event_id as string,
          message: row.message as string,
          isRead: row.is_read as boolean,
          createdAt: row.created_at as string,
        };
      })
    );

    return reminders;
  }

  /**
   * Sends an event-based reminder to a friend.
   * Spam guard: rejects if MAX_UNREAD_REMINDERS unread messages are already
   * queued from the current user to this friend.
   */
  async sendReminder(
    friendId: string,
    eventId: string,
    message: string
  ): Promise<string | null> {
    const userId = await this.getUserId();
    if (!userId) return "Not authenticated";

    const trimmed = message.trim();
    if (!trimmed) return "Message is required";

    const { data: friendship } = await this.supabase
      .from("friendships")
      .select("id")
      .eq("status", "accepted")
      .or(
        `and(requester_id.eq.${userId},receiver_id.eq.${friendId}),` +
          `and(requester_id.eq.${friendId},receiver_id.eq.${userId})`
      )
      .maybeSingle();

    if (!friendship) return "You can only send reminders to accepted friends.";

    const { count } = await this.supabase
      .from("reminders")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", userId)
      .eq("receiver_id", friendId)
      .eq("is_read", false);

    if ((count ?? 0) >= 10) {
      return "You have too many unread reminders pending for this friend (max 10).";
    }

    const { error } = await this.supabase.from("reminders").insert({
      sender_id: userId,
      receiver_id: friendId,
      event_id: eventId,
      message: trimmed,
    });

    return error?.message ?? null;
  }

  /** Marks a received reminder as read. */
  async markReminderRead(reminderId: string): Promise<string | null> {
    const userId = await this.getUserId();
    if (!userId) return "Not authenticated";

    const { error } = await this.supabase
      .from("reminders")
      .update({ is_read: true })
      .eq("id", reminderId)
      .eq("receiver_id", userId);

    return error?.message ?? null;
  }
}
