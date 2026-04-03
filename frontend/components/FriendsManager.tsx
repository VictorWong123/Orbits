"use client";

import { useCallback, useEffect, useState } from "react";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
import { useStoreAction } from "@frontend/hooks/useStoreAction";
import FormError from "@frontend/components/ui/FormError";
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

  const pendingReceived = friends.filter(
    (f) => f.status === "pending" && !f.isRequester
  );
  const pendingSent = friends.filter(
    (f) => f.status === "pending" && f.isRequester
  );
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
    <div className="space-y-4">
      {/* Pending received requests */}
      {pendingReceived.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm p-6 space-y-3">
          <h2 className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wide">
            Friend Requests
          </h2>
          <ul className="space-y-2">
            {pendingReceived.map((friend) => (
              <PendingReceivedRow
                key={friend.id}
                friend={friend}
                onMutate={loadFriends}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Accepted friends */}
      <div className="bg-white rounded-3xl shadow-sm p-6 space-y-4">
        <h2 className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wide">
          Friends
        </h2>

        {isLoading ? (
          <p className="text-sm italic text-[var(--color-accent)]">Loading…</p>
        ) : accepted.length > 0 ? (
          <ul className="space-y-2">
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
        <p className="text-xs text-gray-400 pt-2">
          To add a friend, open their profile and paste their Orbit ID in the
          &ldquo;Connect on Orbit&rdquo; section.
        </p>
      </div>

      {/* Sent pending requests */}
      {pendingSent.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm p-6 space-y-3">
          <h2 className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wide">
            Sent Requests
          </h2>
          <ul className="space-y-2">
            {pendingSent.map((friend) => (
              <SentRequestRow
                key={friend.id}
                friend={friend}
                onMutate={loadFriends}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface RowProps {
  friend: Friend;
  onMutate: () => void;
}

/**
 * Row for a pending request received by the current user.
 * Offers "Accept" and "Decline" buttons.
 */
function PendingReceivedRow({ friend, onMutate }: RowProps) {
  const { store } = useDataStore();

  const acceptAction = useCallback(
    () => store.acceptFriendRequest(friend.id),
    [store, friend.id]
  );
  const declineAction = useCallback(
    () => store.removeFriend(friend.id),
    [store, friend.id]
  );

  const { error: acceptError, isPending: acceptPending, execute: accept } =
    useStoreAction<void>(acceptAction, onMutate);
  const { error: declineError, isPending: declinePending, execute: decline } =
    useStoreAction<void>(declineAction, onMutate);

  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-[#1A3021] truncate">
        {friend.friendEmail}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => accept(undefined)}
          disabled={acceptPending || declinePending}
          className="text-xs font-semibold text-white bg-[var(--color-primary)] px-3 py-1 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {acceptPending ? "Accepting…" : "Accept"}
        </button>
        <button
          type="button"
          onClick={() => decline(undefined)}
          disabled={acceptPending || declinePending}
          className="text-xs font-semibold text-[var(--color-accent)] bg-[var(--color-primary-light)] px-3 py-1 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {declinePending ? "Declining…" : "Decline"}
        </button>
      </div>
      {(acceptError || declineError) && (
        <FormError error={(acceptError ?? declineError)!} />
      )}
    </li>
  );
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

  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-[#1A3021] truncate">
        {friend.friendEmail}
      </span>
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

/**
 * Row for a friend request sent by the current user that is still pending.
 * Offers a "Cancel" button.
 */
function SentRequestRow({ friend, onMutate }: RowProps) {
  const { store } = useDataStore();

  const cancelAction = useCallback(
    () => store.removeFriend(friend.id),
    [store, friend.id]
  );

  const { error, isPending, execute } = useStoreAction<void>(cancelAction, onMutate);

  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-[#1A3021] truncate">
        {friend.friendEmail}
        <span className="ml-2 text-xs italic text-[var(--color-accent)]">
          (pending)
        </span>
      </span>
      <button
        type="button"
        onClick={() => execute(undefined)}
        disabled={isPending}
        className="text-xs text-red-400 hover:text-red-500 transition-colors disabled:opacity-50 shrink-0"
      >
        {isPending ? "Cancelling…" : "Cancel"}
      </button>
      {error && <FormError error={error} />}
    </li>
  );
}
