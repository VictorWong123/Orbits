"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
import ProfileTabs from "@frontend/components/ProfileTabs";
import DeleteProfileButton from "@frontend/components/ui/DeleteProfileButton";
import UserAvatar from "@frontend/components/UserAvatar";
import type { Profile, Fact, Event } from "@backend/types/database";

interface Props {
  profileId: string;
}

/**
 * Client-side profile detail view.
 *
 * Fetches the profile, facts, and events from the active DataStore in
 * parallel. Passes a refresh callback (`loadAll`) to ProfileTabs so that
 * every mutation triggers a clean re-fetch. Redirects to /dashboard if
 * the profile is not found.
 */
export default function ProfileClient({ profileId }: Props) {
  const { store } = useDataStore();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /** Fetches profile + facts + events in parallel. */
  const loadAll = useCallback(async () => {
    const [p, f, e] = await Promise.all([
      store.getProfile(profileId),
      store.getFacts(profileId),
      store.getEvents(profileId),
    ]);

    if (!p) {
      router.replace("/dashboard");
      return;
    }

    setProfile(p);
    setFacts(f);
    setEvents(e);
    setIsLoading(false);
  }, [store, profileId, router]);

  useEffect(() => {
    setIsLoading(true);
    loadAll();
  }, [loadAll]);

  /** Deletes the profile via the store and navigates back to the dashboard. */
  async function handleDeleteProfile(): Promise<string> {
    const err = await store.deleteProfile(profileId);
    if (!err) router.push("/dashboard");
    return err ?? "";
  }

  if (isLoading || !profile) return null;

  return (
    <main className="max-w-md mx-auto bg-[#FDFBF7] min-h-screen">
      {/* Header: back | name | delete | avatar */}
      <header className="flex items-center gap-3 px-6 py-6">
        <Link
          href="/dashboard"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:opacity-80 transition-opacity shrink-0"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-[#1A3021] truncate">{profile.full_name}</h1>
        </div>
        <DeleteProfileButton
          profileName={profile.full_name}
          action={handleDeleteProfile}
        />
        <UserAvatar />
      </header>

      {/* Tabbed content */}
      <div className="px-6 pb-8">
        <ProfileTabs
          profile={{
            id: profile.id,
            full_name: profile.full_name,
            birthday: profile.birthday,
          }}
          facts={facts}
          events={events}
          onMutate={loadAll}
        />
      </div>
    </main>
  );
}
