"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Bell, Pencil, Check, X } from "lucide-react";
import AddFactForm from "@frontend/components/AddFactForm";
import AddEventForm from "@frontend/components/AddEventForm";
import SwipeToDelete from "@frontend/components/ui/SwipeToDelete";
import InfoField from "@frontend/components/ui/InfoField";
import FormError from "@frontend/components/ui/FormError";
import SendReminderModal from "@frontend/components/SendReminderModal";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
import { formatCategory, formatBirthdayDate, formatEventDate } from "@frontend/lib/formatters";
import type { Fact, Event } from "@backend/types/database";

interface Profile {
  id: string;
  full_name: string;
  birthday: string | null;
}

interface Props {
  profile: Profile;
  facts: Fact[];
  events: Event[];
  /** Called after any mutation so the parent can re-fetch fresh data. */
  onMutate: () => void;
}

/**
 * Tab-based UI for the profile detail page.
 *
 * "Notes" tab (default) — read mode: shows all facts, birthday (with inline
 *   edit), structured info fields, events, and category tags.
 * "Add" tab — write mode: AddFactForm and AddEventForm side by side.
 *
 * Optimistic deletes hide an item immediately before the server confirms.
 * If the delete fails, the item is restored.
 */
export default function ProfileTabs({ profile, facts, events, onMutate }: Props) {
  const { store, isAuthenticated } = useDataStore();
  const [activeTab, setActiveTab] = useState<"notes" | "add">("notes");

  // Optimistic delete sets — items hidden before re-fetch completes.
  const [deletedFactIds, setDeletedFactIds] = useState<Set<string>>(new Set());
  const [deletedEventIds, setDeletedEventIds] = useState<Set<string>>(new Set());

  // Clear optimistic sets when parent delivers fresh data.
  useEffect(() => { setDeletedFactIds(new Set()); }, [facts]);
  useEffect(() => { setDeletedEventIds(new Set()); }, [events]);

  // Send Reminder modal state.
  const [reminderEventId, setReminderEventId] = useState<string | null>(null);
  const [reminderEventTitle, setReminderEventTitle] = useState("");

  const visibleFacts = facts.filter((f) => !deletedFactIds.has(f.id));
  const visibleEvents = events.filter((e) => !deletedEventIds.has(e.id));
  const tags = [
    ...new Set(
      visibleFacts.map((f) => f.category).filter((c) => c && c !== "general")
    ),
  ];
  const infoFacts = visibleFacts.filter(
    (f) => f.category && f.category !== "general"
  );

  /**
   * Optimistically removes a fact, then confirms via the store.
   * Rolls back on error.
   */
  const handleDeleteFact = useCallback(
    async (factId: string): Promise<string> => {
      setDeletedFactIds((prev) => new Set([...prev, factId]));
      const err = await store.deleteFact(factId, profile.id);
      if (!err) {
        onMutate();
      } else {
        setDeletedFactIds((prev) => {
          const next = new Set(prev);
          next.delete(factId);
          return next;
        });
      }
      return err ?? "";
    },
    [store, profile.id, onMutate]
  );

  /**
   * Optimistically removes an event, then confirms via the store.
   * Rolls back on error.
   */
  const handleDeleteEvent = useCallback(
    async (eventId: string): Promise<string> => {
      setDeletedEventIds((prev) => new Set([...prev, eventId]));
      const err = await store.deleteEvent(eventId, profile.id);
      if (!err) {
        onMutate();
      } else {
        setDeletedEventIds((prev) => {
          const next = new Set(prev);
          next.delete(eventId);
          return next;
        });
      }
      return err ?? "";
    },
    [store, profile.id, onMutate]
  );

  return (
    <div>
      {/* Sliding pill tab toggle */}
      <div className="relative flex bg-[var(--color-primary-light)] rounded-full p-1 my-5">
        <div
          className="absolute top-1 bottom-1 rounded-full bg-[var(--color-primary)] transition-all duration-200 ease-in-out"
          style={{
            width: "calc(50% - 4px)",
            left: activeTab === "notes" ? "4px" : "50%",
          }}
        />
        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`relative z-10 flex-1 py-2 text-sm font-semibold rounded-full transition-colors ${
            activeTab === "notes" ? "text-white" : "text-[var(--color-primary)]"
          }`}
        >
          Notes{visibleFacts.length > 0 ? ` (${visibleFacts.length})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("add")}
          className={`relative z-10 flex-1 py-2 text-sm font-semibold rounded-full transition-colors ${
            activeTab === "add" ? "text-white" : "text-[var(--color-primary)]"
          }`}
        >
          Add
        </button>
      </div>

      {/* ── Notes tab — read mode ──────────────────────────────────────────── */}
      {activeTab === "notes" && (
        <div className="space-y-6">
          {/* Birthday + structured info fields */}
          {(profile.birthday || infoFacts.length > 0) && (
            <div className="bg-white rounded-3xl shadow-sm px-5 divide-y divide-[var(--color-primary-light)]">
              {profile.birthday !== undefined && (
                <BirthdayField
                  profileId={profile.id}
                  birthday={profile.birthday}
                  onSaved={onMutate}
                />
              )}
              {infoFacts.map((fact) => (
                <InfoField
                  key={fact.id}
                  label={formatCategory(fact.category)}
                  value={fact.content}
                />
              ))}
            </div>
          )}

          {/* Facts / notes */}
          {visibleFacts.length > 0 ? (
            <ul className="space-y-2">
              {visibleFacts.map((fact) => (
                <li key={fact.id} className="overflow-hidden rounded-3xl shadow-sm">
                  <SwipeToDelete
                    onDelete={() => handleDeleteFact(fact.id)}
                    confirmTitle="Delete note?"
                    confirmMessage="This note will be permanently deleted. This cannot be undone."
                    confirmLabel="Delete"
                  >
                    <div className="flex items-start gap-3 bg-white px-4 py-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1A3021]">
                          {fact.content}
                        </p>
                        {fact.category && fact.category !== "general" && (
                          <p className="text-xs text-[var(--color-accent)] mt-1 italic">
                            {fact.category}
                          </p>
                        )}
                      </div>
                    </div>
                  </SwipeToDelete>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm italic text-[var(--color-accent)] text-center py-2">
              No notes yet. Tap <strong>Add</strong> to write one.
            </p>
          )}

          {/* Events */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">
              Events
            </h3>
            {visibleEvents.length > 0 ? (
              <ul className="space-y-2">
                {visibleEvents.map((event) => (
                  <li key={event.id} className="overflow-hidden rounded-3xl shadow-sm">
                    <SwipeToDelete
                      onDelete={() => handleDeleteEvent(event.id)}
                      confirmTitle="Delete event?"
                      confirmMessage="This event will be permanently deleted. This cannot be undone."
                      confirmLabel="Delete"
                    >
                      <div className="flex items-start justify-between gap-3 bg-white px-5 py-4">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-[#1A3021]">
                            {event.title}
                          </p>
                          <p className="text-xs italic text-[var(--color-accent)] mt-0.5">
                            {formatEventDate(event.event_date)}
                          </p>
                          {event.notes && (
                            <p className="text-sm text-[var(--color-primary)] mt-1">
                              {event.notes}
                            </p>
                          )}
                        </div>
                        {isAuthenticated && (
                          <button
                            type="button"
                            aria-label="Send reminder"
                            onClick={() => {
                              setReminderEventId(event.id);
                              setReminderEventTitle(event.title);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--color-accent)] hover:bg-[var(--color-primary-light)] transition-colors shrink-0"
                          >
                            <Bell size={15} />
                          </button>
                        )}
                      </div>
                    </SwipeToDelete>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm italic text-[var(--color-accent)] text-center py-2">
                No events yet. Tap <strong>Add</strong> to create one.
              </p>
            )}
          </div>

          {/* Category tag pills */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-xs font-semibold bg-[var(--color-accent)] text-white rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Add tab — write mode ───────────────────────────────────────────── */}
      {activeTab === "add" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)] mb-3">
              Add a note
            </h3>
            <AddFactForm profileId={profile.id} onSuccess={onMutate} />
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)] mb-3">
              Add an event
            </h3>
            <AddEventForm profileId={profile.id} onSuccess={onMutate} />
          </div>
        </div>
      )}

      {/* Send Reminder modal */}
      <SendReminderModal
        eventId={reminderEventId ?? ""}
        eventTitle={reminderEventTitle}
        isOpen={reminderEventId !== null}
        onClose={() => setReminderEventId(null)}
      />
    </div>
  );
}

// ── BirthdayField ─────────────────────────────────────────────────────────────

interface BirthdayFieldProps {
  profileId: string;
  birthday: string | null;
  /** Called after a successful save so the parent re-fetches the profile. */
  onSaved: () => void;
}

/**
 * Displays the birthday as a label-value pair. A pencil icon activates an
 * inline date input. Saving calls `store.updateBirthday()`.
 */
function BirthdayField({ profileId, birthday, onSaved }: BirthdayFieldProps) {
  const { store } = useDataStore();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(birthday ?? "");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Focuses the date input as soon as it mounts. */
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  /** Persists the new birthday value via the store. */
  async function handleSave() {
    setIsPending(true);
    setError(null);
    const err = await store.updateBirthday(profileId, value || null);
    setIsPending(false);
    if (err) {
      setError(err);
    } else {
      setEditing(false);
      onSaved();
    }
  }

  /** Cancels the edit and resets the local value. */
  function handleCancel() {
    setValue(birthday ?? "");
    setEditing(false);
    setError(null);
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between py-3 group">
        <div className="flex-1">
          {birthday ? (
            <InfoField label="Birthday" value={formatBirthdayDate(birthday)} />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wide">
                Birthday
              </span>
              <span className="text-sm italic text-gray-400">Not set</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Edit birthday"
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 ml-2 w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-accent)] hover:bg-[var(--color-primary-light)] transition-all"
        >
          <Pencil size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="py-3 space-y-2">
      <p className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wide">
        Birthday
      </p>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isPending}
          className="flex-1 border border-[var(--color-primary-light)] rounded-full px-3 py-1.5 text-sm text-[#1A3021] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          aria-label="Save birthday"
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0"
        >
          <Check size={14} />
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          aria-label="Cancel edit"
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:opacity-80 disabled:opacity-50 transition-opacity shrink-0"
        >
          <X size={14} />
        </button>
      </div>
      {error && <FormError error={error} size="xs" />}
    </div>
  );
}
