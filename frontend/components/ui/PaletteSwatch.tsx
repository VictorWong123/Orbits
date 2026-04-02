"use client";

import { Check } from "lucide-react";

interface PaletteSwatchData {
  id: string;
  name: string;
  /** Hex color used to fill the swatch circle. */
  primary: string;
}

interface Props {
  /** Palette metadata to display. */
  palette: PaletteSwatchData;
  /** Whether this swatch represents the currently selected palette. */
  isSelected: boolean;
  /** Called when the user clicks the swatch to select this palette. */
  onSelect: () => void;
}

/**
 * A single color swatch button used in the settings palette picker.
 * Shows a filled circle in the palette's primary color and a checkmark overlay
 * when selected. The outer button highlights with a border on selection.
 */
export default function PaletteSwatch({ palette, isSelected, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Select ${palette.name} theme`}
      aria-pressed={isSelected}
      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
        isSelected
          ? "border-[#1A3021] bg-gray-50"
          : "border-transparent hover:bg-gray-50"
      }`}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: palette.primary }}
      >
        {isSelected && <Check size={16} className="text-white" strokeWidth={3} />}
      </div>
      <span className="text-xs font-semibold text-[#1A3021]">{palette.name}</span>
    </button>
  );
}
