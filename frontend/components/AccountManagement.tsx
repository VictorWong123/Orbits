"use client";

import { useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
import SettingsModal from "@frontend/components/ui/SettingsModal";
import UserProfileForm from "@frontend/components/UserProfileForm";
import ShareableCardsManager from "@frontend/components/ShareableCardsManager";

/**
 * "My Profiles" page shown to authenticated users at /account.
 *
 * Displays the About Me bio and shareable cards. Sign-out and settings are
 * accessible from the UserAvatar dropdown on the dashboard.
 */
export default function AccountManagement() {
  const { userEmail } = useDataStore();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openSettings = useCallback(() => setSettingsOpen(true), []);

  return (
    <main className="min-h-screen bg-[#FDFBF7] p-6">
      <div className="w-full max-w-sm mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:opacity-80 transition-opacity shrink-0"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[#1A3021]">My Profiles</h1>
            {userEmail && (
              <p className="text-xs text-gray-400 truncate">{userEmail}</p>
            )}
          </div>
          <button
            type="button"
            onClick={openSettings}
            className="text-xs font-medium text-[var(--color-primary)] hover:opacity-70 transition-opacity shrink-0"
          >
            Settings
          </button>
        </div>

        {/* About Me — optional personal bio */}
        <div className="bg-white rounded-3xl shadow-sm p-6 space-y-4">
          <h2 className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wide">
            About Me
          </h2>
          <p className="text-xs text-gray-400">
            Optional info others will see when they import your card.
          </p>
          <UserProfileForm />
        </div>

        {/* Shareable Cards — create links others can use to import you */}
        <ShareableCardsManager />

      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
