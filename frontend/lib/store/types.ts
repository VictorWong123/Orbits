import type { Profile, Fact, Event, ShareableCard, CustomField } from "@backend/types/database";

export type { Profile, Fact, Event, ShareableCard, CustomField };

/** Input shape for creating a new shareable card. */
export interface CreateShareableCardInput {
  card_name: string;
  phone?: string;
  email?: string;
  hobbies?: string;
  fun_facts?: string;
  other_notes?: string;
  /** User-defined extra fields, e.g. LinkedIn, Portfolio. */
  custom_fields?: CustomField[];
}

/**
 * The authenticated user's own optional bio/personal info.
 * Shared with friends via the get_user_profile_by_id RPC.
 */
export interface UserProfile {
  display_name: string | null;
  /** YYYY-MM-DD string, or null when not set. */
  birthday: string | null;
  hobbies: string | null;
  bio: string | null;
}

/** Input shape for upserting the current user's own profile. */
export interface UpdateMyProfileInput {
  display_name?: string;
  birthday?: string;
  hobbies?: string;
  bio?: string;
}

/**
 * A profile row with its associated fact categories, used on the dashboard
 * where only category tags are needed (not full fact content).
 */
export interface ProfileSummary {
  id: string;
  full_name: string;
  birthday: string | null;
  created_at: string;
  facts: { category: string }[];
}

/** Input shape for creating a new profile. */
export interface CreateProfileInput {
  full_name: string;
  /** YYYY-MM-DD string, or omitted for no birthday. */
  birthday?: string;
}

/** Input shape for creating a new fact. */
export interface CreateFactInput {
  profile_id: string;
  content: string;
  /** Defaults to "general" when omitted. */
  category: string;
}

/** Input shape for creating a new event. */
export interface CreateEventInput {
  profile_id: string;
  title: string;
  /** ISO datetime string, e.g. "2026-08-20T14:00". */
  event_date: string;
  notes?: string;
}

/**
 * Abstraction over the two storage backends (localStorage and Supabase).
 *
 * All mutation methods return `string | null`: a non-null string is an error
 * message to surface to the user; null means success. This mirrors the
 * convention used by the existing server actions.
 *
 * Navigation after deleteProfile is the caller's responsibility — this store
 * never redirects.
 */
export interface DataStore {
  // ── Reads ────────────────────────────────────────────────────────────────

  /** Returns all profiles for the current user, sorted by full_name ascending. */
  getProfiles(): Promise<ProfileSummary[]>;

  /** Returns a single profile by ID, or null if not found. */
  getProfile(id: string): Promise<Profile | null>;

  /** Returns all facts for a profile, ordered newest-first. */
  getFacts(profileId: string): Promise<Fact[]>;

  /** Returns all events for a profile, ordered by event_date ascending. */
  getEvents(profileId: string): Promise<Event[]>;

  /** Returns the user's current palette ID (e.g. "sage"). */
  getPaletteId(): Promise<string>;

  // ── Writes ───────────────────────────────────────────────────────────────

  createProfile(input: CreateProfileInput): Promise<string | null>;

  /**
   * Deletes the profile and its associated facts and events.
   * Does NOT navigate — the caller must redirect after a successful deletion.
   */
  deleteProfile(profileId: string): Promise<string | null>;

  createFact(input: CreateFactInput): Promise<string | null>;
  deleteFact(factId: string, profileId: string): Promise<string | null>;

  createEvent(input: CreateEventInput): Promise<string | null>;
  deleteEvent(eventId: string, profileId: string): Promise<string | null>;

  /**
   * Persists the user's palette choice. Also writes the `orbits_palette`
   * cookie so the server-side layout can apply the correct theme without FOUC.
   */
  updatePaletteId(paletteId: string): Promise<string | null>;

  /**
   * Updates the birthday field on a profile.
   * Pass null to clear the birthday.
   * Returns null on success, or an error string on failure.
   */
  updateBirthday(profileId: string, birthday: string | null): Promise<string | null>;

  // ── User Profile ─────────────────────────────────────────────────────────

  /**
   * Returns the current user's own profile bio, or null if not set.
   * LocalDataStore always returns null.
   */
  getMyProfile(): Promise<UserProfile | null>;

  /**
   * Upserts the current user's own profile bio.
   * Returns null on success, or an error string on failure.
   */
  updateMyProfile(input: UpdateMyProfileInput): Promise<string | null>;

  // ── Shareable Cards ──────────────────────────────────────────────────────────

  /**
   * Returns all shareable cards created by the current user, newest first.
   * LocalDataStore always returns an empty array.
   */
  getShareableCards(): Promise<ShareableCard[]>;

  /**
   * Creates a new shareable card.
   * Returns null on success, or an error string on failure.
   * LocalDataStore always returns an error prompting sign-in.
   */
  createShareableCard(input: CreateShareableCardInput): Promise<string | null>;

  /**
   * Updates an existing shareable card's fields.
   * Returns null on success, or an error string on failure.
   * LocalDataStore always returns an error prompting sign-in.
   */
  updateShareableCard(id: string, input: CreateShareableCardInput): Promise<string | null>;

  /**
   * Deletes a shareable card by its UUID.
   * Returns null on success, or an error string on failure.
   * LocalDataStore always returns an error prompting sign-in.
   */
  deleteShareableCard(id: string): Promise<string | null>;

  // ── Friends ──────────────────────────────────────────────────────────────

  /**
   * Returns all friendships for the current user (pending and accepted).
   * LocalDataStore always returns an empty array.
   */
  getFriends(): Promise<Friend[]>;

  /**
   * Sends a friend request to the user with the given Orbit ID (UUID).
   * Returns null on success, or an error string on failure.
   */
  sendFriendRequest(orbitId: string): Promise<string | null>;

  /**
   * Accepts an incoming friend request by its friendship row ID.
   * Returns null on success, or an error string on failure.
   */
  acceptFriendRequest(friendshipId: string): Promise<string | null>;

  /**
   * Removes a friendship (cancels a pending request or unfriends).
   * Returns null on success, or an error string on failure.
   */
  removeFriend(friendshipId: string): Promise<string | null>;

  // ── Reminders ────────────────────────────────────────────────────────────

  /**
   * Returns all reminders received by the current user, unread first.
   * LocalDataStore always returns an empty array.
   */
  getReminders(): Promise<Reminder[]>;

  /**
   * Sends an event-based reminder to a friend.
   * Returns null on success, or an error string on failure.
   */
  sendReminder(
    friendId: string,
    eventId: string,
    message: string
  ): Promise<string | null>;

  /**
   * Marks a received reminder as read.
   * Returns null on success, or an error string on failure.
   */
  markReminderRead(reminderId: string): Promise<string | null>;
}

// ── Friends & Reminders types ────────────────────────────────────────────────

/**
 * A friendship row from the perspective of the current user.
 * `isRequester` is true when the current user initiated the request.
 */
export interface Friend {
  /** The friendship row UUID. */
  id: string;
  /** The other user's Supabase UUID. */
  friendId: string;
  /** The other user's email address (fetched via secure RPC). */
  friendEmail: string;
  /** The other user's optional profile bio, fetched via secure RPC. Null when not set. */
  friendProfile: UserProfile | null;
  /** 'pending' until the receiver accepts; 'accepted' thereafter. */
  status: "pending" | "accepted";
  /** True when auth.uid() === requester_id on the friendship row. */
  isRequester: boolean;
}

/**
 * A reminder row received by the current user.
 */
export interface Reminder {
  /** The reminder row UUID. */
  id: string;
  /** The UUID of the user who sent the reminder. */
  senderId: string;
  /** The sender's email address (fetched via secure RPC). */
  senderEmail: string;
  /** The UUID of the linked event. */
  eventId: string;
  /** The custom message written by the sender. */
  message: string;
  /** False until the receiver dismisses the reminder. */
  isRead: boolean;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
}
