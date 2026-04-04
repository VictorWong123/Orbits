"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
import ProfileTabs from "@frontend/components/ProfileTabs";
import DeleteProfileButton from "@frontend/components/ui/DeleteProfileButton";
import UserAvatar from "@frontend/components/UserAvatar";
import ReminderDropdown from "@frontend/components/ReminderDropdown";
import type { Profile, Fact, Event, ImportedCardData } from "@backend/types/database";

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
        {profile.imported_data && (
          <ImportedDetailsCard data={profile.imported_data} />
        )}

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

// ── ImportedDetailsCard ───────────────────────────────────────────────────────

interface ImportedDetailsCardProps {
  data: ImportedCardData;
}

/**
 * Read-only panel shown at the top of a profile page when the profile was
 * imported from a shareable card.
 *
 * Displays only the non-empty fields from the card snapshot. The dashed border
 * and "read-only" label make it visually distinct from editable content below.
 */
function ImportedDetailsCard({ data }: ImportedDetailsCardProps) {
  const presetFields: { label: string; value: string | undefined }[] = [
    { label: "Phone", value: data.phone },
    { label: "Email", value: data.email },
    { label: "Hobbies", value: data.hobbies },
    { label: "Fun Facts", value: data.fun_facts },
    { label: "Other", value: data.other_notes },
  ];

  const visiblePreset = presetFields.filter((f) => f.value);
  const visibleCustom = (data.custom_fields ?? []).filter(
    (f) => f.label.trim() && f.value.trim()
  );
  const hasAny = visiblePreset.length > 0 || visibleCustom.length > 0;

  return (
    <div className="border-2 border-dashed border-[var(--color-primary-light)] rounded-3xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wide">
          Shared Details
        </p>
        <span className="text-xs text-gray-400 bg-[var(--color-primary-light)] px-2 py-0.5 rounded-full">
          read-only
        </span>
      </div>

      {!hasAny ? (
        <p className="text-sm text-gray-400">No additional details were shared.</p>
      ) : (
        <dl className="space-y-2">
          {visiblePreset.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide">
                {label}
              </dt>
              <dd className="text-sm text-[#1A3021] mt-0.5 whitespace-pre-wrap">{value}</dd>
            </div>
          ))}
          {visibleCustom.map((field, i) => (
            <div key={i}>
              <dt className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide">
                {field.label}
              </dt>
              <dd className="text-sm text-[#1A3021] mt-0.5 whitespace-pre-wrap">{field.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
