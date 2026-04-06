"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronRight, Star } from "lucide-react";
import { getInitials, relativeTime } from "@frontend/lib/formatters";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
import PillInput from "@frontend/components/ui/PillInput";
import SwipeToDelete from "@frontend/components/ui/SwipeToDelete";

interface ProfileFact {
  category: string;
}

interface ProfileWithFacts {
  id: string;
  full_name: string;
  birthday: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  facts: ProfileFact[];
}

interface Props {
  profiles: ProfileWithFacts[];
  /** Called after a profile is successfully deleted so the parent can reload. */
  onDelete?: () => void;
}

/**
 * Searchable, client-side-filtered profile list for the dashboard.
 *
 * Each card supports an Apple-style swipe-left gesture via SwipeToDelete.
 * Swiping reveals a red delete zone; tapping it opens a ConfirmDialog.
 * A short tap (no horizontal movement) navigates to the profile detail page.
 */
export default function ProfileList({ profiles, onDelete }: Props) {
  const [query, setQuery] = useState("");

  const filtered = profiles.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    if (p.full_name.toLowerCase().includes(q)) return true;
    return p.facts.some((f) => f.category?.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-5">
      {/* Search bar */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-accent)] pointer-events-none"
        />
        <PillInput
          variant="white"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, relationship, or tag..."
          className="w-full pl-10 pr-4 py-3"
        />
      </div>

      {/* Profile cards */}
      {filtered.length > 0 ? (
        <ul className="space-y-3">
          {filtered.map((profile) => {
            const tags = [
              ...new Set(
                profile.facts
                  .map((f) => f.category)
                  .filter((c): c is string => Boolean(c) && c !== "general")
              ),
            ];
            return (
              <ProfileCard
                key={profile.id}
                profile={profile}
                tags={tags}
                onDelete={onDelete}
              />
            );
          })}
        </ul>
      ) : (
        <p className="text-sm italic text-[var(--color-accent)] text-center py-4">
          {query.trim() ? "No results found." : "No people yet. Add someone above."}
        </p>
      )}
    </div>
  );
}

// ── ProfileCard ───────────────────────────────────────────────────────────────

interface CardProps {
  profile: ProfileWithFacts;
  tags: string[];
  onDelete?: () => void;
}

/**
 * A single profile card wrapped in SwipeToDelete.
 *
 * Tapping the card navigates to the profile detail page. Swiping left reveals
 * the delete zone; tapping it opens a ConfirmDialog before deleting.
 */
function ProfileCard({ profile, tags, onDelete }: CardProps) {
  const { store } = useDataStore();
  const router = useRouter();

  const profileUrl = `/profile/${profile.id}`;

  useEffect(() => {
    router.prefetch(profileUrl);
  }, [router, profileUrl]);

  const visibleTag = tags[0];
  const overflow = tags.length - 1;

  /** Deletes the profile via the store and notifies the parent to reload. */
  async function handleDelete() {
    const err = await store.deleteProfile(profile.id);
    if (!err) onDelete?.();
  }

  return (
    <li className="overflow-hidden rounded-3xl shadow-sm">
      <SwipeToDelete
        onDelete={handleDelete}
        confirmTitle="Delete person?"
        confirmMessage={`"${profile.full_name}" and all their notes and events will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
      >
        <div
          onClick={() => router.push(profileUrl)}
          className="flex items-center gap-4 p-4 bg-white cursor-pointer select-none"
        >
          {/* Initials avatar */}
          <div className="w-11 h-11 rounded-full bg-[var(--color-accent)] flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-[#1A3021] uppercase">
              {getInitials(profile.full_name)}
            </span>
          </div>

          {/* Name + tags + timestamp */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-base font-semibold text-[#1A3021] leading-tight truncate">
                {profile.full_name}
              </p>
              {profile.is_favorite && (
                <Star size={14} className="text-[var(--color-accent)] shrink-0" fill="currentColor" />
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {visibleTag && (
                <span className="inline-flex items-center px-2.5 py-0.5 bg-[var(--color-accent)] text-white text-xs font-semibold rounded-full">
                  {visibleTag}
                </span>
              )}
              {overflow > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 bg-[var(--color-accent)] text-white text-xs font-semibold rounded-full">
                  +{overflow}
                </span>
              )}
              <span className="text-xs italic text-[var(--color-accent)]">
                Last updated: {relativeTime(profile.updated_at)}
              </span>
            </div>
          </div>

          {/* Trailing chevron */}
          <ChevronRight size={18} className="text-[var(--color-accent)] shrink-0" />
        </div>
      </SwipeToDelete>
    </li>
  );
}
