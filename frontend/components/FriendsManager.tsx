"use client";

import { useCallback, useEffect, useState } from "react";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
import { useStoreAction } from "@frontend/hooks/useStoreAction";
import FormError from "@frontend/components/ui/FormError";
import AddFriendForm from "@frontend/components/AddFriendForm";
import type { Friend } from "@frontend/lib/store/types";

/**
 * Displays and manages the current user's friends list.
 *
 * Splits friendships into three categories:
 * - Pending received: requests the current user can accept or decline.
 * - Pending sent: requests the current user is waiting on.
 * - Accepted: connected friends the user can remove.
 *
 * Requires authentication — unauthenticated users see a prompt to sign in.
 */
export default function FriendsManager() {
  const { store, isAuthenticated } = useDataStore();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /** Re-fetches the full friends list from the store. */
  const loadFriends = useCallback(async () => {
    const data = await store.getFriends();
    setFriends(data);
    setIsLoading(false);
  }, [store]);

  useEffect(() => {
    setIsLoading(true);
    loadFriends();
  }, [loadFriends]);

  const accepted = friends.filter((f) => f.status === "accepted");

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-3xl shadow-sm p-6">
        <h2 className="text-sm font-bold text-[var(--color-accent)] uppercase tracking-wide mb-3">
          Friends
        </h2>
        <p className="text-sm text-[var(--color-accent)] italic">
          Sign in to add friends and send reminders.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm p-6 space-y-4">
      <h2 className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wide">
        Friends
      </h2>

      {isLoading ? (
        <p className="text-sm italic text-[var(--color-accent)]">Loading…</p>
      ) : accepted.length > 0 ? (
        <ul className="space-y-3">
          {accepted.map((friend) => (
            <AcceptedFriendRow
              key={friend.id}
              friend={friend}
              onMutate={loadFriends}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm italic text-[var(--color-accent)]">
          No friends yet.
        </p>
      )}

      <div className="border-t border-gray-100 pt-4 space-y-2">
        <p className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide">
          Connect with a Friend
        </p>
        <p className="text-xs text-gray-400">
          Enter their 8-character Orbit Code to connect instantly.
        </p>
        <AddFriendForm onSuccess={loadFriends} />
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface RowProps {
  friend: Friend;
  onMutate: () => void;
}

/**
 * Row for an accepted friend.
 * Offers a "Remove" button to unfriend.
 */
function AcceptedFriendRow({ friend, onMutate }: RowProps) {
  const { store } = useDataStore();

  const removeAction = useCallback(
    () => store.removeFriend(friend.id),
    [store, friend.id]
  );

  const { error, isPending, execute } = useStoreAction<void>(removeAction, onMutate);

  const displayName = friend.friendProfile?.display_name ?? friend.friendEmail;
  const snippet = buildProfileSnippet(friend.friendProfile);

  return (
    <li className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <span className="text-sm font-medium text-[#1A3021] truncate block">
          {displayName}
        </span>
        {displayName !== friend.friendEmail && (
          <span className="text-xs text-gray-400 truncate block">
            {friend.friendEmail}
          </span>
        )}
        {snippet && (
          <span className="text-xs text-[var(--color-accent)] truncate block">
            {snippet}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => execute(undefined)}
        disabled={isPending}
        className="text-xs text-red-400 hover:text-red-500 transition-colors disabled:opacity-50 shrink-0"
      >
        {isPending ? "Removing…" : "Remove"}
      </button>
      {error && <FormError error={error} />}
    </li>
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────

import type { UserProfile } from "@frontend/lib/store/types";

/**
 * Builds a one-line profile snippet for display in friend rows.
 * Combines hobbies and/or bio into a short preview string.
 * Returns null when no relevant data is available.
 */
function buildProfileSnippet(profile: UserProfile | null): string | null {
  if (!profile) return null;
  const parts: string[] = [];
  if (profile.hobbies) parts.push(profile.hobbies);
  if (profile.bio) parts.push(profile.bio);
  if (parts.length === 0) return null;
  const combined = parts.join(" · ");
  return combined.length > 80 ? combined.slice(0, 77) + "…" : combined;
}
