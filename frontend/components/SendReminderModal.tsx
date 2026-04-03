"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
import { useStoreAction } from "@frontend/hooks/useStoreAction";
import FormError from "@frontend/components/ui/FormError";
import SubmitButton from "@frontend/components/ui/SubmitButton";
import type { Friend } from "@frontend/lib/store/types";

interface Props {
  /** UUID of the event this reminder is linked to. */
  eventId: string;
  /** Human-readable event title shown in the modal header. */
  eventTitle: string;
  /** Whether the modal is currently visible. */
  isOpen: boolean;
  /** Called when the modal should close (success or cancel). */
  onClose: () => void;
}

/**
 * Modal dialog for sending an event-based reminder to an accepted friend.
 *
 * Loads the current user's accepted friends on open and presents a friend
 * selector and a free-text message field. On success it shows a brief
 * confirmation message before closing.
 *
 * Shows an appropriate message when the user has no accepted friends or
 * is not authenticated.
 */
export default function SendReminderModal({
  eventId,
  eventTitle,
  isOpen,
  onClose,
}: Props) {
  const { store, isAuthenticated } = useDataStore();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [sent, setSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const acceptedFriends = friends.filter((f) => f.status === "accepted");

  /** Loads accepted friends whenever the modal opens. */
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    setSent(false);
    store.getFriends().then(setFriends);
  }, [isOpen, isAuthenticated, store]);

  const sendAction = useCallback(
    (payload: { friendId: string; message: string }) =>
      store.sendReminder(payload.friendId, eventId, payload.message),
    [store, eventId]
  );

  /** Handles a successful send: show confirmation, then close after a brief delay. */
  const handleSuccess = useCallback(() => {
    setSent(true);
    const timer = setTimeout(() => {
      onClose();
      setSent(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const { error, isPending, execute } = useStoreAction(sendAction, handleSuccess);

  /** Reads form values and fires the send action. */
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const friendId = (data.get("friendId") as string | null) ?? "";
    const message = (data.get("message") as string | null)?.trim() ?? "";
    execute({ friendId, message });
  }

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Send reminder"
    >
      {/* Panel */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#1A3021]">Send Reminder</h2>
            <p className="text-xs text-[var(--color-accent)] mt-0.5 truncate">
              {eventTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:opacity-80 transition-opacity shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        {!isAuthenticated ? (
          <p className="text-sm italic text-[var(--color-accent)]">
            Sign in to send reminders.
          </p>
        ) : sent ? (
          <p className="text-sm font-semibold text-[var(--color-primary)] text-center py-4">
            Reminder sent!
          </p>
        ) : acceptedFriends.length === 0 ? (
          <p className="text-sm italic text-[var(--color-accent)]">
            No friends yet. Add one from your{" "}
            <a
              href="/account"
              className="underline text-[var(--color-primary)]"
            >
              account page
            </a>
            .
          </p>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            {/* Friend selector */}
            <div className="space-y-1">
              <label
                htmlFor="friendId"
                className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wide"
              >
                Send to
              </label>
              <select
                id="friendId"
                name="friendId"
                required
                disabled={isPending}
                className="w-full border border-gray-200 rounded-2xl px-4 py-2 text-sm text-[#1A3021] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
              >
                {acceptedFriends.map((f) => (
                  <option key={f.id} value={f.friendId}>
                    {f.friendEmail}
                  </option>
                ))}
              </select>
            </div>

            {/* Message */}
            <div className="space-y-1">
              <label
                htmlFor="message"
                className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wide"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={3}
                required
                placeholder="Don't forget to call her for her birthday!"
                disabled={isPending}
                className="w-full border border-gray-200 rounded-2xl px-4 py-2 text-sm text-[#1A3021] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
              />
            </div>

            {error && <FormError error={error} />}

            <SubmitButton
              isPending={isPending}
              label="Send reminder"
              pendingLabel="Sending…"
              className="w-full bg-[var(--color-primary)] text-white font-semibold py-2.5 rounded-full text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            />
          </form>
        )}
      </div>
    </div>
  );
}
