"use client";

import { useState, useTransition } from "react";
import { X, Check } from "lucide-react";
import { PALETTES, type PaletteId } from "@frontend/lib/theme";
import { useTheme } from "@frontend/components/ui/ThemeProvider";
import { updateSettings } from "@backend/actions";

interface Props {
  isOpen: boolean;
  /** Called when the modal should close (Cancel, backdrop click, or save success). */
  onClose: () => void;
}

/**
 * Modal dialog for choosing the app's color palette.
 * Renders a grid of swatches; confirming a selection persists it to the
 * database via a server action and immediately updates the live CSS vars
 * through ThemeContext so the rest of the UI repaints without a reload.
 */
export default function SettingsModal({ isOpen, onClose }: Props) {
  const { paletteId, setPaletteId } = useTheme();
  const [selected, setSelected] = useState<PaletteId>(paletteId);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  /** Closes the modal when clicking the semi-transparent backdrop. */
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  /** Persists the selected palette then updates the live theme. */
  function handleSave() {
    setError(null);
    startTransition(async () => {
      const err = await updateSettings(selected);
      if (err) {
        setError(err);
      } else {
        setPaletteId(selected);
        onClose();
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/30"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#1A3021]">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close settings"
          >
            <X size={14} className="text-gray-400" />
          </button>
        </div>

        {/* App color section */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">App Color</p>
          <div className="grid grid-cols-3 gap-3">
            {Object.values(PALETTES).map((palette) => (
              <PaletteSwatch
                key={palette.id}
                palette={palette}
                isSelected={selected === palette.id}
                onSelect={() => setSelected(palette.id as PaletteId)}
              />
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Action row */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 py-2.5 text-sm font-semibold text-white rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 transition-colors"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal sub-components
// ---------------------------------------------------------------------------

interface PaletteSwatchProps {
  palette: { id: string; name: string; primary: string };
  isSelected: boolean;
  onSelect: () => void;
}

/** A single color swatch button with a checkmark when selected. */
function PaletteSwatch({ palette, isSelected, onSelect }: PaletteSwatchProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Select ${palette.name} theme`}
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
