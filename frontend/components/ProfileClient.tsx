"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
import ProfileTabs from "@frontend/components/ProfileTabs";
import DeleteProfileButton from "@frontend/components/ui/DeleteProfileButton";
import UserAvatar from "@frontend/components/UserAvatar";
import ReminderDropdown from "@frontend/components/ReminderDropdown";
import PillInput from "@frontend/components/ui/PillInput";
import SubmitButton from "@frontend/components/ui/SubmitButton";
import FormError from "@frontend/components/ui/FormError";
import { useStoreAction } from "@frontend/hooks/useStoreAction";
import type { Profile, Fact, Event } from "@backend/types/database";

interface Props {
  profileId: string;
}

/**
 * Skeleton placeholder shown while auth is resolving or profile data is loading.
 * Matches the shape of the real layout to prevent layout shift.
 */
function ProfileSkeleton() {
  return (
    <main className="max-w-md mx-auto bg-[#FDFBF7] min-h-screen">
      <header className="flex items-center gap-3 px-6 py-6">
        <div className="w-9 h-9 rounded-full bg-[var(--color-primary-light)] shrink-0 animate-pulse" />
        <div className="flex-1 h-8 bg-[var(--color-primary-light)] rounded-full animate-pulse" />
        <div className="w-9 h-9 rounded-full bg-[var(--color-primary-light)] shrink-0 animate-pulse" />
        <div className="w-9 h-9 rounded-full bg-[var(--color-primary-light)] shrink-0 animate-pulse" />
      </header>
      <div className="px-6 pb-8 space-y-4">
        <div className="h-12 bg-[var(--color-primary-light)] rounded-full animate-pulse" />
        <div className="h-24 bg-[var(--color-primary-light)] rounded-3xl animate-pulse" />
        <div className="h-16 bg-[var(--color-primary-light)] rounded-3xl animate-pulse" />
      </div>
    </main>
  );
}

/**
 * Client-side profile detail view.
 *
 * Defers all data fetching until the auth session has resolved (`userEmail !==
 * undefined`). Without this guard, the component fires `loadAll` with the
 * LocalDataStore before auth completes, causing `getProfile` to return null
 * and incorrectly redirecting authenticated Supabase users to /dashboard.
 *
 * Once auth is resolved, fetches the profile, facts, and events from the
 * active DataStore in parallel. Passes a refresh callback (`loadAll`) to
 * ProfileTabs so that every mutation triggers a clean re-fetch. Redirects
 * to /dashboard if the profile is not found.
 */
export default function ProfileClient({ profileId }: Props) {
  const { store, userEmail } = useDataStore();
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

  // Only begin loading once the auth session has resolved. Without this guard,
  // the effect fires with LocalDataStore while the session check is in-flight,
  // causing getProfile to return null and redirecting to /dashboard.
  useEffect(() => {
    if (userEmail === undefined) return;
    setIsLoading(true);
    loadAll();
  }, [loadAll, userEmail]);

  /** Deletes the profile via the store and navigates back to the dashboard. */
  async function handleDeleteProfile(): Promise<string> {
    const err = await store.deleteProfile(profileId);
    if (!err) router.push("/dashboard");
    return err ?? "";
  }

  if (isLoading || !profile) return <ProfileSkeleton />;

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
        <ReminderDropdown />
        <UserAvatar />
      </header>

      {/* Tabbed content */}
      <div className="px-6 pb-8 space-y-6">
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

        {/* Connect on Orbit — lets the user link this contact to their Orbit account */}
        <ConnectOrbitForm profileName={profile.full_name} />
      </div>
    </main>
  );
}

// ── ConnectOrbitForm ──────────────────────────────────────────────────────────

interface ConnectOrbitFormProps {
  /** Name of the contact, shown in the section heading. */
  profileName: string;
}

/**
 * Small form that lets an authenticated user send a friend request to the
 * contact by pasting their Orbit ID (UUID).
 *
 * Only rendered when the user is signed in; returns null otherwise so the
 * profile page stays uncluttered for local users.
 */
function ConnectOrbitForm({ profileName }: ConnectOrbitFormProps) {
  const { store, isAuthenticated } = useDataStore();
  const formRef = useRef<HTMLFormElement>(null);
  const [sent, setSent] = useState(false);

  const action = useCallback(
    (orbitId: string) => store.sendFriendRequest(orbitId),
    [store]
  );

  const handleSuccess = useCallback(() => {
    setSent(true);
  }, []);

  const { error, isPending, execute } = useStoreAction(action, handleSuccess);

  if (!isAuthenticated) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const orbitId = (data.get("orbitId") as string | null)?.trim() ?? "";
    execute(orbitId);
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm p-5 space-y-3">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">
          Connect on Orbit
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Paste {profileName.split(" ")[0]}&apos;s Orbit ID to send them a friend request.
          They can find it on their account page.
        </p>
      </div>

      {sent ? (
        <p className="text-sm font-semibold text-[var(--color-primary)]">
          Friend request sent!
        </p>
      ) : (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-2">
            <PillInput
              variant="white"
              name="orbitId"
              type="text"
              placeholder="Paste their Orbit ID…"
              required
              disabled={isPending}
              className="flex-1 text-sm font-mono"
            />
            <SubmitButton
              isPending={isPending}
              label="Connect"
              pendingLabel="Sending…"
              className="bg-[var(--color-primary)] text-white font-semibold py-2 px-4 rounded-full text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            />
          </div>
          {error && <FormError error={error} size="xs" />}
        </form>
      )}
    </div>
  );
}
