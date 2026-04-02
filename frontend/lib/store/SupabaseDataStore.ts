import { createClient } from "@frontend/lib/supabase/client";
import type {
  DataStore,
  ProfileSummary,
  CreateProfileInput,
  CreateFactInput,
  CreateEventInput,
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

    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return "Not authenticated";

    const { error } = await this.supabase.from("profiles").insert({
      full_name: trimmed,
      birthday: birthday ?? null,
      avatar_url: null,
      user_id: user.id,
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

    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return "Not authenticated";

    const { error } = await this.supabase.from("facts").insert({
      profile_id,
      content: trimmed,
      category: category || "general",
      user_id: user.id,
    });

    return error?.message ?? null;
  }

  /** Deletes a fact by ID. RLS enforces ownership. */
  async deleteFact(factId: string): Promise<string | null> {
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

    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return "Not authenticated";

    const { error } = await this.supabase.from("events").insert({
      profile_id,
      title: trimmedTitle,
      event_date,
      notes: notes ?? null,
      user_id: user.id,
    });

    return error?.message ?? null;
  }

  /** Deletes an event by ID. RLS enforces ownership. */
  async deleteEvent(eventId: string): Promise<string | null> {
    const { error } = await this.supabase.from("events").delete().eq("id", eventId);
    return error?.message ?? null;
  }

  /**
   * Upserts the user's palette preference and writes the `orbits_palette`
   * cookie so the server-rendered layout can apply the correct theme on the
   * next full page load without a FOUC.
   */
  async updatePaletteId(paletteId: string): Promise<string | null> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return "Not authenticated";

    const { error } = await this.supabase.from("user_settings").upsert(
      { user_id: user.id, palette_id: paletteId },
      { onConflict: "user_id" }
    );

    if (!error) {
      document.cookie = `orbits_palette=${paletteId};path=/;max-age=31536000;SameSite=Lax`;
    }

    return error?.message ?? null;
  }
}
