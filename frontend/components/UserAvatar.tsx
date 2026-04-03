"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Settings, LogOut, UserPlus, User, Copy, Check } from "lucide-react";
import { signOut } from "@backend/actions";
import { getEmailInitials } from "@frontend/lib/formatters";
import { useOutsideClick } from "@frontend/hooks/useOutsideClick";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
import DropdownItem from "@frontend/components/ui/DropdownItem";
import SettingsModal from "@frontend/components/ui/SettingsModal";

/**
 * Avatar button showing the user's initials (or a generic icon for local users).
 *
 * Clicking opens a dropdown with:
 * - Authenticated users: Settings + Sign Out
 * - Local (unauthenticated) users: Settings + "Create account" link
 *
 * The dropdown closes automatically when clicking outside of it.
 */
export default function UserAvatar() {
  const { userEmail, isAuthenticated, userId } = useDataStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [idCopied, setIdCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const closeDropdown = useCallback(() => setDropdownOpen(false), []);
  useOutsideClick(dropdownRef, closeDropdown, dropdownOpen);

  /** Opens settings and closes the dropdown. */
  function openSettings() {
    setDropdownOpen(false);
    setSettingsOpen(true);
  }

  /** Copies the user's Orbit ID to the clipboard and shows brief confirmation. */
  async function handleCopyOrbitId() {
    if (!userId) return;
    await navigator.clipboard.writeText(userId);
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 2000);
  }

  /** Derives display initials from email, or falls back to a question mark. */
  const initials = userEmail ? getEmailInitials(userEmail) : "?";

  return (
    <>
      <div ref={dropdownRef} className="relative">
        {/* Initials avatar */}
        <button
          type="button"
          onClick={() => setDropdownOpen((open) => !open)}
          aria-label="Account menu"
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
          className="w-9 h-9 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-sm font-bold text-white hover:opacity-90 transition-opacity select-none"
        >
          {initials}
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="absolute right-0 top-11 w-52 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-40">
            {/* User info */}
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs text-gray-400 truncate">
                {isAuthenticated ? userEmail : "Local storage only"}
              </p>
            </div>

            <DropdownItem icon={<Settings size={15} />} label="Settings" onClick={openSettings} />

            {isAuthenticated ? (
              <>
                <Link
                  href="/account"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#1A3021] hover:bg-gray-50 transition-colors"
                >
                  <User size={15} className="text-gray-400" />
                  My Account
                </Link>

                {userId && (
                  <DropdownItem
                    icon={idCopied ? <Check size={15} /> : <Copy size={15} />}
                    label={idCopied ? "Copied!" : "Copy Orbit ID"}
                    onClick={handleCopyOrbitId}
                  />
                )}

                <form action={signOut}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#1A3021] hover:bg-gray-50 transition-colors"
                  >
                    <LogOut size={15} className="text-gray-400" />
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/account"
                onClick={() => setDropdownOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#1A3021] hover:bg-gray-50 transition-colors"
              >
                <UserPlus size={15} className="text-gray-400" />
                Create account
              </Link>
            )}
          </div>
        )}
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
