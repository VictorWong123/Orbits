"use server";

import { getAuthenticatedSupabase } from "@backend/lib/auth-helpers";
import type { Profile, Fact, Event } from "@backend/types/database";

/** The local data payload passed from the browser when a user chooses to sync. */
export interface LocalSnapshot {
  profiles: Profile[];
  facts: Fact[];
  events: Event[];
}

/**
 * Migrates a user's local (device-only) data into their Supabase account.
 *
 * Each row's `user_id` is remapped from the local sentinel value ("local")
 * to the real authenticated user UUID. The primary IDs (`id`) are preserved
 * since they were generated with `crypto.randomUUID()` and are valid UUIDs.
 *
 * Rows are inserted in dependency order: profiles first, then facts and events
 * (which reference profile IDs via foreign keys).
 *
 * @returns An error string if any insertion fails, or null on full success.
 */
export async function migrateLocalData(snapshot: LocalSnapshot): Promise<string | null> {
  const auth = await getAuthenticatedSupabase();
  if (!auth) return "Not authenticated";

  const { supabase, user } = auth;

  /** Replaces the local sentinel user_id with the real Supabase user UUID. */
  function remapUserId<T extends { user_id: string }>(rows: T[]): T[] {
    return rows.map((row) => ({ ...row, user_id: user.id }));
  }

  const profiles = remapUserId(snapshot.profiles);
  const facts = remapUserId(snapshot.facts);
  const events = remapUserId(snapshot.events);

  if (profiles.length > 0) {
    const { error } = await supabase.from("profiles").insert(profiles);
    if (error) return error.message;
  }

  if (facts.length > 0) {
    const { error } = await supabase.from("facts").insert(facts);
    if (error) return error.message;
  }

  if (events.length > 0) {
    const { error } = await supabase.from("events").insert(events);
    if (error) return error.message;
  }

  return null;
}
