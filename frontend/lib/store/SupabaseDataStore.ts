import { createClient } from "@frontend/lib/supabase/client";
import type {
  DataStore,
  ProfileSummary,
  CreateProfileInput,
  CreateFactInput,
  CreateEventInput,
  Friend,
  Reminder,
  UserProfile,
  UpdateMyProfileInput,
  ShareableCard,
  CreateShareableCardInput,
} from "./types";
import type { Profile, Fact, Event } from "@backend/types/database";
import { DEFAULT_PALETTE_ID, readPaletteIdFromCookie } from "@frontend/lib/theme";

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

  /** Returns all profiles for the authenticated user, favorites first then A-Z. */
  async getProfiles(): Promise<ProfileSummary[]> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("*, facts(category)")
      .order("is_favorite", { ascending: false })
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
      .maybeSingle();

    const fromDb = (data as { palette_id: string } | null)?.palette_id;
    if (fromDb) return fromDb;
    return readPaletteIdFromCookie() ?? DEFAULT_PALETTE_ID;
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

  /** Deletes a fact by ID. RLS enforces ownership; user_id filter is defense-in-depth. */
  async deleteFact(factId: string, _profileId: string): Promise<string | null> {
    const userId = await this.getUserId();
    if (!userId) return "Not authenticated";

    const { error } = await this.supabase
      .from("facts")
      .delete()
      .eq("id", factId)
      .eq("user_id", userId);
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

  /** Deletes an event by ID. RLS enforces ownership; user_id filter is defense-in-depth. */
  async deleteEvent(eventId: string, _profileId: string): Promise<string | null> {
    const userId = await this.getUserId();
    if (!userId) return "Not authenticated";

    const { error } = await this.supabase
      .from("events")
      .delete()
      .eq("id", eventId)
      .eq("user_id", userId);
    return error?.message ?? null;
  }

  /**
   * Updates the birthday field on a profile row.
   * Pass null to clear the birthday. RLS enforces ownership; user_id filter is defense-in-depth.
   */
  async updateBirthday(
    profileId: string,
    birthday: string | null
  ): Promise<string | null> {
    const userId = await this.getUserId();
    if (!userId) return "Not authenticated";

    const { error } = await this.supabase
      .from("profiles")
      .update({ birthday })
      .eq("id", profileId)
      .eq("user_id", userId);

    return error?.message ?? null;
  }

  /**
   * Toggles the is_favorite flag on a profile.
   * Reads the current value and flips it. RLS enforces ownership.
   */
  async toggleFavorite(profileId: string): Promise<string | null> {
    const userId = await this.getUserId();
    if (!userId) return "Not authenticated";

    const { data } = await this.supabase
      .from("profiles")
      .select("is_favorite")
      .eq("id", profileId)
      .eq("user_id", userId)
      .single();

    if (!data) return "Profile not found";

    const { error } = await this.supabase
      .from("profiles")
      .update({ is_favorite: !data.is_favorite })
      .eq("id", profileId)
      .eq("user_id", userId);

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
      document.cookie = `orbits_palette=${paletteId};path=/;max-age=31536000;SameSite=Lax;Secure`;
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

        const [emailResult, profileResult] = await Promise.all([
          this.supabase.rpc("get_user_email_by_id", { user_id_input: friendId }),
          this.supabase.rpc("get_user_profile_by_id", { user_id_input: friendId }),
        ]);

        const profileRow = Array.isArray(profileResult.data) && profileResult.data.length > 0
          ? profileResult.data[0]
          : null;
        const friendProfile: UserProfile | null = profileRow
          ? {
            display_name: profileRow.display_name ?? null,
            birthday: profileRow.birthday ?? null,
            hobbies: profileRow.hobbies ?? null,
            bio: profileRow.bio ?? null,
            avatar_url: profileRow.avatar_url ?? null,
          }
          : null;

        return {
          id: row.id as string,
          friendId: friendId as string,
          friendEmail: (emailResult.data as string | null) ?? "Unknown",
          friendProfile,
          status: row.status as "pending" | "accepted",
          isRequester,
        };
      })
    );

    return friends;
  }

  /**
   * Connects the current user with the user identified by the given 8-character
   * Orbit Code. Resolves the code to a full UUID via the get_user_id_by_short_code
   * RPC, then inserts a friendship row with status "accepted" immediately —
   * no pending/accept step required.
   */
  async sendFriendRequest(shortCode: string): Promise<string | null> {
    const userId = await this.getUserId();
    if (!userId) return "Not authenticated";

    const trimmed = shortCode.trim().toLowerCase();
    if (!trimmed) return "Orbit Code is required";
    if (!/^[0-9a-f]{8}$/i.test(trimmed)) return "Please enter a valid 8-character Orbit Code";

    const { data: receiverId } = await this.supabase.rpc(
      "get_user_id_by_short_code",
      { code: trimmed }
    );

    if (!receiverId) return "No user found with that Orbit Code";
    if (receiverId === userId) return "That's your own Orbit Code";

    const { error } = await this.supabase.from("friendships").insert({
      requester_id: userId,
      receiver_id: receiverId as string,
      status: "accepted",
    });

    if (error) {
      if (error.code === "23505") return "You're already connected with this person";
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

  // ── User Profile ─────────────────────────────────────────────────────────

  /**
   * Returns the current user's own profile row, or null if none exists yet.
   */
  async getMyProfile(): Promise<UserProfile | null> {
    const userId = await this.getUserId();
    if (!userId) return null;

    const { data } = await this.supabase
      .from("user_profiles")
      .select("display_name, birthday, hobbies, bio, avatar_url")
      .eq("user_id", userId)
      .single();

    if (!data) return null;

    return {
      display_name: data.display_name ?? null,
      birthday: data.birthday ?? null,
      hobbies: data.hobbies ?? null,
      bio: data.bio ?? null,
      avatar_url: data.avatar_url ?? null,
    };
  }

  /**
   * Upserts the current user's own profile bio.
   * Empty strings are stored as null (treated as "clear the field").
   */
  async updateMyProfile(input: UpdateMyProfileInput): Promise<string | null> {
    const userId = await this.getUserId();
    if (!userId) return "Not authenticated";

    const { error } = await this.supabase.from("user_profiles").upsert(
      {
        user_id: userId,
        display_name: input.display_name || null,
        birthday: input.birthday || null,
        hobbies: input.hobbies || null,
        bio: input.bio || null,
      },
      { onConflict: "user_id" }
    );

    return error?.message ?? null;
  }

  // ── Shareable Cards ───────────────────────────────────────────────────────

  /** Returns all shareable cards owned by the current user, newest first. */
  async getShareableCards(): Promise<ShareableCard[]> {
    const userId = await this.getUserId();
    if (!userId) return [];

    const { data, error } = await this.supabase
      .from("shareable_cards")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) return [];
    return (data ?? []) as ShareableCard[];
  }

  /**
   * Creates a new shareable card for the current user.
   * Returns null on success, or an error string on failure.
   */
  async createShareableCard(input: CreateShareableCardInput): Promise<string | null> {
    const userId = await this.getUserId();
    if (!userId) return "Not authenticated";

    const { error } = await this.supabase.from("shareable_cards").insert({
      user_id: userId,
      card_name: input.card_name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      hobbies: input.hobbies ?? null,
      fun_facts: input.fun_facts ?? null,
      other_notes: input.other_notes ?? null,
      custom_fields: input.custom_fields ?? [],
    });

    return error?.message ?? null;
  }

  /**
   * Updates the fields of an existing shareable card.
   * Applies an explicit user_id filter as defense-in-depth on top of RLS.
   * Returns null on success, or an error string on failure.
   */
  async updateShareableCard(id: string, input: CreateShareableCardInput): Promise<string | null> {
    const userId = await this.getUserId();
    if (!userId) return "Not authenticated";

    const { error } = await this.supabase
      .from("shareable_cards")
      .update({
        card_name: input.card_name,
        phone: input.phone ?? null,
        email: input.email ?? null,
        hobbies: input.hobbies ?? null,
        fun_facts: input.fun_facts ?? null,
        other_notes: input.other_notes ?? null,
        custom_fields: input.custom_fields ?? [],
      })
      .eq("id", id)
      .eq("user_id", userId);

    return error?.message ?? null;
  }

  /**
   * Deletes a shareable card by its UUID.
   * Applies an explicit user_id filter as defense-in-depth on top of RLS.
   * Returns null on success, or an error string on failure.
   */
  async deleteShareableCard(id: string): Promise<string | null> {
    const userId = await this.getUserId();
    if (!userId) return "Not authenticated";

    const { error } = await this.supabase
      .from("shareable_cards")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    return error?.message ?? null;
  }
}
