"use client";

import { useState, useRef, useEffect } from "react";
import { Settings, LogOut } from "lucide-react";
import { signOut } from "@backend/actions";
import SettingsModal from "@frontend/components/ui/SettingsModal";

interface Props {
  /** Authenticated user's email address. Used to derive display initials. */
  email: string;
}

/**
 * Derives up to two uppercase initials from an email address.
 * Splits the local part (before @) on common separators (`.`, `_`, `-`, `+`).
 * Single-segment locals use the first two characters.
 * Examples: "victor.wong@x.com" → "VW", "alice@x.com" → "AL"
 */
function emailInitials(email: string): string {
  const [local] = email.split("@");
  const parts = local.split(/[._+\-]/);
  if (parts.length === 1) return local.slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

  /** Closes the dropdown when a click lands outside the component. */
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [dropdownOpen]);

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
          {emailInitials(email)}
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

// ---------------------------------------------------------------------------
// Internal sub-components
// ---------------------------------------------------------------------------

interface DropdownItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

/** A single row inside the account dropdown menu. */
function DropdownItem({ icon, label, onClick }: DropdownItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#1A3021] hover:bg-gray-50 transition-colors"
    >
      <span className="text-gray-400">{icon}</span>
      {label}
    </button>
  );
}
