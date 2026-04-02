"use client";

import { useState, useCallback } from "react";
import AddFactForm from "@frontend/components/AddFactForm";
import AddEventForm from "@frontend/components/AddEventForm";
import DeleteButton from "@frontend/components/ui/DeleteButton";
import InfoField from "@frontend/components/ui/InfoField";
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
 * "Notes" shows all facts; "Info" shows structured label-value fields,
 * events, and category tag pills. Uses a sliding pill-shaped tab switch.
 */
export default function ProfileTabs({ profile, facts, events, onMutate }: Props) {
  const { store } = useDataStore();
  const [activeTab, setActiveTab] = useState<"notes" | "info">("info");

  /** Unique non-default categories from facts, shown as tag pills in Info tab. */
  const tags = [...new Set(facts.map((f) => f.category).filter((c) => c && c !== "general"))];

  /** Facts with a specific category, rendered as structured fields in Info tab. */
  const infoFacts = facts.filter((f) => f.category && f.category !== "general");

  /** Deletes a fact via the store and triggers a parent re-fetch. */
  const handleDeleteFact = useCallback(
    async (factId: string): Promise<string> => {
      const err = await store.deleteFact(factId, profile.id);
      if (!err) onMutate();
      return err ?? "";
    },
    [store, profile.id, onMutate]
  );

  /** Deletes an event via the store and triggers a parent re-fetch. */
  const handleDeleteEvent = useCallback(
    async (eventId: string): Promise<string> => {
      const err = await store.deleteEvent(eventId, profile.id);
      if (!err) onMutate();
      return err ?? "";
    },
    [store, profile.id, onMutate]
  );

  return (
    <div>
      {/* Sliding pill-shaped tab toggle */}
      <div className="relative flex bg-[var(--color-primary-light)] rounded-full p-1 my-5">
        {/* Animated sliding pill */}
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
          Notes{facts.length > 0 ? ` (${facts.length})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("info")}
          className={`relative z-10 flex-1 py-2 text-sm font-semibold rounded-full transition-colors ${
            activeTab === "info" ? "text-white" : "text-[var(--color-primary)]"
          }`}
        >
          Info
        </button>
      </div>

      {/* Notes tab — all free-form facts */}
      {activeTab === "notes" && (
        <div className="space-y-5">
          <AddFactForm profileId={profile.id} onSuccess={onMutate} />
          {facts.length > 0 ? (
            <ul className="space-y-2">
              {facts.map((fact) => (
                <li
                  key={fact.id}
                  className="flex items-start justify-between gap-3 bg-white rounded-3xl px-4 py-4 shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A3021]">{fact.content}</p>
                    {fact.category && fact.category !== "general" && (
                      <p className="text-xs text-[var(--color-accent)] mt-1 italic">{fact.category}</p>
                    )}
                  </div>
                  <DeleteButton
                    onDelete={() => handleDeleteFact(fact.id)}
                    ariaLabel="Delete note"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm italic text-[var(--color-accent)] text-center py-4">No notes yet.</p>
          )}
        </div>
      )}

      {/* Info tab — structured fields, events, and tags */}
      {activeTab === "info" && (
        <div className="space-y-6">
          {/* Structured label–value fields */}
          {(profile.birthday || infoFacts.length > 0) && (
            <div className="bg-white rounded-3xl shadow-sm px-5 divide-y divide-[var(--color-primary-light)]">
              {profile.birthday && (
                <InfoField
                  label="Birthday"
                  value={formatBirthdayDate(profile.birthday)}
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

          {/* Events section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">
              Events
            </h3>
            <AddEventForm profileId={profile.id} onSuccess={onMutate} />
            {events.length > 0 && (
              <ul className="space-y-2">
                {events.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-start justify-between gap-3 bg-white rounded-3xl px-5 py-4 shadow-sm"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#1A3021]">{event.title}</p>
                      <p className="text-xs italic text-[var(--color-accent)] mt-0.5">
                        {formatEventDate(event.event_date)}
                      </p>
                      {event.notes && (
                        <p className="text-sm text-[var(--color-primary)] mt-1">{event.notes}</p>
                      )}
                    </div>
                    <DeleteButton
                      onDelete={() => handleDeleteEvent(event.id)}
                      ariaLabel="Delete event"
                    />
                  </li>
                ))}
              </ul>
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
    </div>
  );
}
