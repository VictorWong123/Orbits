"use client";

import type { ReactNode } from "react";

interface Props {
  /** Icon element rendered to the left of the label. */
  icon: ReactNode;
  /** Text label for the menu item. */
  label: string;
  /** Callback invoked when the button is clicked. */
  onClick: () => void;
}

/**
 * A single icon + label row inside a dropdown menu.
 * Provides consistent hover and typography styling across all dropdown menus.
 */
export default function DropdownItem({ icon, label, onClick }: Props) {
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
