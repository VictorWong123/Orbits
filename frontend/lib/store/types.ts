import type { Profile, Fact, Event } from "@backend/types/database";

export type { Profile, Fact, Event };

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
}
