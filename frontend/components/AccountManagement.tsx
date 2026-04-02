"use client";

import { useState, useCallback } from "react";
import { signOut } from "@backend/actions";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
import SettingsModal from "@frontend/components/ui/SettingsModal";

/**
 * Account management view shown to authenticated users on the /account page.
 *
 * Displays the signed-in email address, provides access to the Settings
 * palette picker, and offers a sign-out action.
 */
export default function AccountManagement() {
  const { userEmail } = useDataStore();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openSettings = useCallback(() => setSettingsOpen(true), []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FDFBF7] p-6">
      <div className="w-full max-w-sm space-y-6">
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
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
