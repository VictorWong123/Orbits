"use server";

import { z } from "zod";
import { getAuthenticatedSupabase } from "@backend/lib/auth-helpers";
import type { Profile, Fact, Event } from "@backend/types/database";

const MAX_MIGRATION_ROWS = 500;

const MigrationProfileSchema = z.object({
  id: z.string().uuid("Invalid profile ID"),
  full_name: z.string().min(1).max(200),
  birthday: z.string().nullable(),
  avatar_url: z.string().nullable(),
  created_at: z.string(),
  imported_data: z.unknown().nullable(),
});

const MigrationFactSchema = z.object({
  id: z.string().uuid("Invalid fact ID"),
  profile_id: z.string().uuid("Invalid profile ID reference"),
  content: z.string().min(1).max(5000),
  category: z.string().max(100),
  created_at: z.string(),
});

const MigrationEventSchema = z.object({
  id: z.string().uuid("Invalid event ID"),
  profile_id: z.string().uuid("Invalid profile ID reference"),
  title: z.string().min(1).max(500),
  event_date: z.string(),
  notes: z.string().max(5000).nullable(),
  created_at: z.string(),
});

const LocalSnapshotSchema = z.object({
  profiles: z.array(MigrationProfileSchema).max(MAX_MIGRATION_ROWS),
  facts: z.array(MigrationFactSchema).max(MAX_MIGRATION_ROWS),
  events: z.array(MigrationEventSchema).max(MAX_MIGRATION_ROWS),
});

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
 * All fields are validated with Zod before insertion. Upsert with
 * `onConflict: "id"` makes retries idempotent — if a previous attempt
 * partially succeeded, re-running will not fail on duplicate keys.
 *
 * Rows are upserted in dependency order: profiles first, then facts and events
 * (which reference profile IDs via foreign keys).
 *
 * @returns An error string if validation or any upsert fails, or null on full success.
 */
export async function migrateLocalData(snapshot: LocalSnapshot): Promise<string | null> {
  const auth = await getAuthenticatedSupabase();
  if (!auth) return "Not authenticated";

  const parsed = LocalSnapshotSchema.safeParse(snapshot);
  if (!parsed.success) return parsed.error.errors[0].message;

  const { supabase, user } = auth;

  /** Replaces the local sentinel user_id with the real Supabase user UUID. */
  function remapUserId<T extends { user_id: string }>(rows: T[]): T[] {
    return rows.map((row) => ({ ...row, user_id: user.id }));
  }

  const profiles = remapUserId(snapshot.profiles);
  const facts = remapUserId(snapshot.facts);
  const events = remapUserId(snapshot.events);

  if (profiles.length > 0) {
    const { error } = await supabase
      .from("profiles")
      .upsert(profiles, { onConflict: "id" });
    if (error) return error.message;
  }

  if (facts.length > 0) {
    const { error } = await supabase
      .from("facts")
      .upsert(facts, { onConflict: "id" });
    if (error) return error.message;
  }

  if (events.length > 0) {
    const { error } = await supabase
      .from("events")
      .upsert(events, { onConflict: "id" });
    if (error) return error.message;
  }

  return null;
}
