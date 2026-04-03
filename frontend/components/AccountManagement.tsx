"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { signOut } from "@backend/actions";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
import SettingsModal from "@frontend/components/ui/SettingsModal";
import FriendsManager from "@frontend/components/FriendsManager";

/**
 * Account management view shown to authenticated users on the /account page.
 *
 * Displays the signed-in email, the user's Orbit ID (shareable UUID for
 * friend requests), app settings, sign-out, and the FriendsManager section.
 */
export default function AccountManagement() {
  const { userEmail, userId } = useDataStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const openSettings = useCallback(() => setSettingsOpen(true), []);

  /** Copies the Orbit ID to clipboard and shows a brief confirmation. */
  async function handleCopyId() {
    if (!userId) return;
    await navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] p-6">
      <div className="w-full max-w-sm mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#1A3021]">Orbit</h1>
          <p className="text-sm text-[var(--color-accent)] mt-1">Account</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-6 space-y-4">
          <div>
            <p className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wide mb-1">
              Signed in as
            </p>
            <p className="text-sm font-semibold text-[#1A3021] truncate">{userEmail}</p>
          </div>

          {/* Orbit ID — shareable UUID for friend requests */}
          {userId && (
            <div className="border-t border-gray-100 pt-4 space-y-1.5">
              <p className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wide">
                Your Orbit ID
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-[#1A3021] bg-[var(--color-primary-light)] px-3 py-2 rounded-full truncate">
                  {userId}
                </code>
                <button
                  type="button"
                  onClick={handleCopyId}
                  aria-label="Copy Orbit ID"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:opacity-80 transition-opacity shrink-0"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Share this with friends so they can connect with you from a profile page.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={openSettings}
            className="w-full text-left text-sm font-medium text-[#1A3021] py-2.5 border-t border-gray-100 hover:text-[var(--color-primary)] transition-colors"
          >
            App Settings
          </button>

          <form action={signOut} className="border-t border-gray-100 pt-2">
            <button
              type="submit"
              className="w-full text-left text-sm font-medium text-red-400 hover:text-red-500 py-2 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>

        {/* Friends & Reminders section */}
        <FriendsManager />
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
