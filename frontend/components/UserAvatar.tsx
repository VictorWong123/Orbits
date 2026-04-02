"use client";

import { useState, useRef, useCallback } from "react";
import { Settings, LogOut } from "lucide-react";
import { signOut } from "@backend/actions";
import { getEmailInitials } from "@frontend/lib/formatters";
import { useOutsideClick } from "@frontend/hooks/useOutsideClick";
import DropdownItem from "@frontend/components/ui/DropdownItem";
import SettingsModal from "@frontend/components/ui/SettingsModal";

interface Props {
  /** Authenticated user's email address. Used to derive display initials. */
  email: string;
}

/**
 * Avatar button showing the user's initials. Clicking opens a dropdown with
 * Settings and Sign Out options. Settings launches the palette picker modal.
 * The dropdown closes automatically when clicking outside of it.
 */
export default function UserAvatar({ email }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const closeDropdown = useCallback(() => setDropdownOpen(false), []);
  useOutsideClick(dropdownRef, closeDropdown, dropdownOpen);

  /** Opens settings and closes the dropdown. */
  function openSettings() {
    setDropdownOpen(false);
    setSettingsOpen(true);
  }

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
          {getEmailInitials(email)}
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="absolute right-0 top-11 w-52 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-40">
            {/* User info */}
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs text-gray-400 truncate">{email}</p>
            </div>

            <DropdownItem icon={<Settings size={15} />} label="Settings" onClick={openSettings} />

            <form action={signOut}>
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#1A3021] hover:bg-gray-50 transition-colors"
              >
                <LogOut size={15} className="text-gray-400" />
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
