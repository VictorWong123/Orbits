"use client";

import { useState, useTransition } from "react";
import { migrateLocalData } from "@backend/actions";
import FormError from "@frontend/components/ui/FormError";
import type { Profile, Fact, Event } from "@backend/types/database";

/** localStorage key names read when collecting the migration snapshot. */
const KEYS = {
  profiles: "orbits:profiles",
  facts: "orbits:facts",
  events: "orbits:events",
  palette: "orbits:palette",
} as const;

interface Props {
  /** Number of local profiles awaiting migration, shown in the modal copy. */
  profileCount: number;
  /** Called after data has been successfully migrated and localStorage cleared. */
  onConfirm: () => void;
  /** Called when the user declines migration (local data is left intact). */
  onSkip: () => void;
}

/**
 * Modal that appears after a user signs in or creates an account when local
 * data exists. Offers to sync all local profiles, facts, and events into
 * Supabase, or to start fresh with the Supabase account.
 */
export default function MigrationModal({ profileCount, onConfirm, onSkip }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  /** Reads the full local snapshot, calls the migration server action, then clears localStorage. */
  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const snapshot = {
        profiles: JSON.parse(localStorage.getItem(KEYS.profiles) ?? "[]") as Profile[],
        facts: JSON.parse(localStorage.getItem(KEYS.facts) ?? "[]") as Fact[],
        events: JSON.parse(localStorage.getItem(KEYS.events) ?? "[]") as Event[],
      };

      const err = await migrateLocalData(snapshot);
      if (err) {
        setError(err);
        return;
      }

      // Clear all local data now that it lives in Supabase
      Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
      onConfirm();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/30">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-[#1A3021]">Sync your local data?</h2>
        <p className="text-sm text-[var(--color-primary)]">
          You have{" "}
          <span className="font-semibold">
            {profileCount} {profileCount === 1 ? "person" : "people"}
          </span>{" "}
          saved on this device. Would you like to sync them to your new account so
          you can access them from any device?
        </p>

        <FormError error={error} />

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onSkip}
            disabled={isPending}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            Start fresh
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="flex-1 py-2.5 text-sm font-semibold text-white rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 transition-colors"
          >
            {isPending ? "Syncing…" : "Sync now"}
          </button>
        </div>
      </div>
    </div>
  );
}
