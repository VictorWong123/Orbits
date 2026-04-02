import type {
  DataStore,
  ProfileSummary,
  CreateProfileInput,
  CreateFactInput,
  CreateEventInput,
} from "./types";
import type { Profile, Fact, Event } from "@backend/types/database";

/** localStorage key names for each data collection. */
const KEYS = {
  profiles: "orbits:profiles",
  facts: "orbits:facts",
  events: "orbits:events",
  palette: "orbits:palette",
} as const;

/**
 * Sentinel user_id written on every locally-created row.
 * When a local user later creates a Supabase account and migrates,
 * this value is replaced with their real Supabase UUID.
 */
export const LOCAL_USER_ID = "local";

/** Default palette ID used when none has been explicitly saved. */
const DEFAULT_PALETTE_ID = "sage";

// ── localStorage helpers ─────────────────────────────────────────────────────

/**
 * Reads and JSON-parses a localStorage value.
 * Returns `fallback` on missing key or parse error.
 */
function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * JSON-serialises `value` and writes it to localStorage.
 */
function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ── ID / timestamp helpers ───────────────────────────────────────────────────

/** Generates a new random UUID compatible with Supabase's UUID columns. */
function newId(): string {
  return crypto.randomUUID();
}

/** Returns the current time as an ISO-8601 string. */
function nowIso(): string {
  return new Date().toISOString();
}

// ── LocalDataStore ───────────────────────────────────────────────────────────

/**
 * localStorage-backed DataStore implementation.
 *
 * All data is scoped to the current device and browser profile. Records are
 * keyed with `orbits:*` to avoid collisions with other apps. Each record uses
 * `LOCAL_USER_ID` as its `user_id` sentinel so that a later migration to
 * Supabase can bulk-replace it with the real user UUID.
 */
export class LocalDataStore implements DataStore {
  /** Returns all profiles joined with their fact category tags, sorted A→Z. */
  async getProfiles(): Promise<ProfileSummary[]> {
    const profiles = readJson<Profile[]>(KEYS.profiles, []);
    const facts = readJson<Fact[]>(KEYS.facts, []);

    return profiles
      .map((p) => ({
        ...p,
        facts: facts
          .filter((f) => f.profile_id === p.id)
          .map((f) => ({ category: f.category })),
      }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }

  /** Returns a single profile by ID, or null if not found. */
  async getProfile(id: string): Promise<Profile | null> {
    const profiles = readJson<Profile[]>(KEYS.profiles, []);
    return profiles.find((p) => p.id === id) ?? null;
  }

  /** Returns all facts for a profile, ordered newest-first. */
  async getFacts(profileId: string): Promise<Fact[]> {
    const facts = readJson<Fact[]>(KEYS.facts, []);
    return facts
      .filter((f) => f.profile_id === profileId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  /** Returns all events for a profile, ordered by event_date ascending. */
  async getEvents(profileId: string): Promise<Event[]> {
    const events = readJson<Event[]>(KEYS.events, []);
    return events
      .filter((e) => e.profile_id === profileId)
      .sort((a, b) => a.event_date.localeCompare(b.event_date));
  }

  /** Returns the saved palette ID, defaulting to the app default. */
  async getPaletteId(): Promise<string> {
    return localStorage.getItem(KEYS.palette) ?? DEFAULT_PALETTE_ID;
  }

  /** Creates a new profile and persists it to localStorage. */
  async createProfile({ full_name, birthday }: CreateProfileInput): Promise<string | null> {
    const trimmed = full_name.trim();
    if (!trimmed) return "Name is required";

    const profiles = readJson<Profile[]>(KEYS.profiles, []);
    profiles.push({
      id: newId(),
      user_id: LOCAL_USER_ID,
      full_name: trimmed,
      birthday: birthday ?? null,
      avatar_url: null,
      created_at: nowIso(),
    });
    writeJson(KEYS.profiles, profiles);
    return null;
  }

  /**
   * Deletes a profile and cascades to its facts and events.
   * Navigation to /dashboard is the caller's responsibility.
   */
  async deleteProfile(profileId: string): Promise<string | null> {
    writeJson(
      KEYS.profiles,
      readJson<Profile[]>(KEYS.profiles, []).filter((p) => p.id !== profileId)
    );
    writeJson(
      KEYS.facts,
      readJson<Fact[]>(KEYS.facts, []).filter((f) => f.profile_id !== profileId)
    );
    writeJson(
      KEYS.events,
      readJson<Event[]>(KEYS.events, []).filter((e) => e.profile_id !== profileId)
    );
    return null;
  }

  /** Creates a new fact and persists it to localStorage. */
  async createFact({ profile_id, content, category }: CreateFactInput): Promise<string | null> {
    const trimmed = content.trim();
    if (!trimmed) return "Fact content is required";

    const facts = readJson<Fact[]>(KEYS.facts, []);
    facts.push({
      id: newId(),
      profile_id,
      user_id: LOCAL_USER_ID,
      content: trimmed,
      category: category || "general",
      created_at: nowIso(),
    });
    writeJson(KEYS.facts, facts);
    return null;
  }

  /** Deletes a fact by ID. */
  async deleteFact(factId: string): Promise<string | null> {
    writeJson(
      KEYS.facts,
      readJson<Fact[]>(KEYS.facts, []).filter((f) => f.id !== factId)
    );
    return null;
  }

  /** Creates a new event and persists it to localStorage. */
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

    const events = readJson<Event[]>(KEYS.events, []);
    events.push({
      id: newId(),
      profile_id,
      user_id: LOCAL_USER_ID,
      title: trimmedTitle,
      event_date,
      notes: notes ?? null,
      created_at: nowIso(),
    });
    writeJson(KEYS.events, events);
    return null;
  }

  /** Deletes an event by ID. */
  async deleteEvent(eventId: string): Promise<string | null> {
    writeJson(
      KEYS.events,
      readJson<Event[]>(KEYS.events, []).filter((e) => e.id !== eventId)
    );
    return null;
  }

  /**
   * Persists the palette choice to localStorage and to a browser cookie so
   * the server-side layout can apply the correct theme on the next full page
   * load without a flash of the default colour.
   */
  async updatePaletteId(paletteId: string): Promise<string | null> {
    localStorage.setItem(KEYS.palette, paletteId);
    document.cookie = `orbits_palette=${paletteId};path=/;max-age=31536000;SameSite=Lax`;
    return null;
  }
}
