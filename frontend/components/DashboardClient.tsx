"use client";

import { useEffect, useState, useCallback } from "react";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
import AddPersonPanel from "@frontend/components/AddPersonPanel";
import ProfileList from "@frontend/components/ProfileList";
import UserAvatar from "@frontend/components/UserAvatar";
import ReminderDropdown from "@frontend/components/ReminderDropdown";
import type { ProfileSummary } from "@frontend/lib/store/types";

/**
 * Client-side dashboard view.
 *
 * Fetches profiles from the active DataStore on mount and after every
 * successful mutation. Renders nothing while the auth session is resolving
 * to avoid a flash of wrong content (local vs Supabase data).
 */
export default function DashboardClient() {
  const { store, userEmail } = useDataStore();
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /** (Re)loads profiles from the active store. Passed as onSuccess to AddProfileForm. */
  const loadProfiles = useCallback(async () => {
    try {
      const data = await store.getProfiles();
      setProfiles(data);
    } catch (err) {
      console.error("Failed to load profiles:", err);
    } finally {
      setIsLoading(false);
    }
  }, [store]);

  // Reload whenever the active store changes (e.g. local → Supabase after sign-in).
  useEffect(() => {
    setIsLoading(true);
    loadProfiles();
  }, [loadProfiles]);

  return (
    <main className="max-w-md mx-auto bg-[#FDFBF7] min-h-screen">
      <header className="flex items-center justify-between px-6 py-6">
        <h1 className="text-2xl font-bold text-[#1A3021]">Orbit</h1>
        <div className="flex items-center gap-2">
          <ReminderDropdown />
          <UserAvatar />
        </div>
      </header>

      <div className="px-6 pb-8 space-y-6">
        <AddPersonPanel
          existingNames={profiles.map((p) => p.full_name)}
          onSuccess={loadProfiles}
        />
        {isLoading ? (
          <p className="text-sm italic text-[var(--color-accent)] text-center py-4">
            Loading…
          </p>
        ) : (
          <ProfileList profiles={profiles} onDelete={loadProfiles} />
        )}
      </div>
    </main>
  );
}
