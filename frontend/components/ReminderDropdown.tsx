"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
import { useStoreAction } from "@frontend/hooks/useStoreAction";
import { useOutsideClick } from "@frontend/hooks/useOutsideClick";
import type { Reminder } from "@frontend/lib/store/types";

/**
 * Bell-icon button that shows a badge of unread reminder count and opens
 * a dropdown listing all received reminders.
 *
 * Only rendered for authenticated users — returns null for local-only sessions
 * so the header remains uncluttered for unauthenticated users.
 *
 * Unread reminders appear first. Clicking "Dismiss" marks a reminder as read
 * via `store.markReminderRead()`.
 */
export default function ReminderDropdown() {
  const { store, isAuthenticated } = useDataStore();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const closeDropdown = useCallback(() => setIsOpen(false), []);
  useOutsideClick(dropdownRef, closeDropdown, isOpen);

  /** Loads all reminders from the store. */
  const loadReminders = useCallback(async () => {
    const data = await store.getReminders();
    setReminders(data);
  }, [store]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadReminders();
  }, [loadReminders, isAuthenticated]);

  if (!isAuthenticated) return null;

  const unreadCount = reminders.filter((r) => !r.isRead).length;

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell icon trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Reminders"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="relative w-9 h-9 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center text-[var(--color-primary)] hover:opacity-80 transition-opacity"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-40 max-h-96 overflow-y-auto">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wide">
              Reminders
            </p>
          </div>

          {reminders.length === 0 ? (
            <p className="px-4 py-4 text-sm italic text-gray-400">
              No reminders yet.
            </p>
          ) : (
            <ul>
              {reminders.map((reminder) => (
                <ReminderRow
                  key={reminder.id}
                  reminder={reminder}
                  onDismiss={loadReminders}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-component ─────────────────────────────────────────────────────────────

interface ReminderRowProps {
  reminder: Reminder;
  /** Called after the reminder is successfully dismissed so the list refreshes. */
  onDismiss: () => void;
}

/**
 * A single reminder row with sender info, message, and a dismiss button.
 * Unread rows have a subtle accent background.
 */
function ReminderRow({ reminder, onDismiss }: ReminderRowProps) {
  const { store } = useDataStore();

  const markReadAction = useCallback(
    () => store.markReminderRead(reminder.id),
    [store, reminder.id]
  );

  const { isPending, execute } = useStoreAction<void>(markReadAction, onDismiss);

  return (
    <li
      className={`px-4 py-3 border-b border-gray-50 last:border-0 ${
        !reminder.isRead ? "bg-[var(--color-primary-light)]/30" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[var(--color-primary)] truncate">
            {reminder.senderEmail}
          </p>
          <p className="text-sm text-[#1A3021] mt-0.5 break-words">
            {reminder.message}
          </p>
          <p className="text-xs italic text-gray-400 mt-1">
            {new Date(reminder.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        {!reminder.isRead && (
          <button
            type="button"
            onClick={() => execute(undefined)}
            disabled={isPending}
            className="text-xs text-[var(--color-accent)] hover:text-[var(--color-primary)] transition-colors shrink-0 mt-0.5 disabled:opacity-50"
          >
            {isPending ? "…" : "Dismiss"}
          </button>
        )}
      </div>
    </li>
  );
}
