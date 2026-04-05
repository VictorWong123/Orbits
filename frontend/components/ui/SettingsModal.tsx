"use client";

import { useState, useTransition, useEffect } from "react";
import { X } from "lucide-react";
import { PALETTES, type PaletteId } from "@frontend/lib/theme";
import { useTheme } from "@frontend/components/ui/ThemeProvider";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
import PaletteSwatch from "@frontend/components/ui/PaletteSwatch";
import FormError from "@frontend/components/ui/FormError";
import { getSettings, updateEventReminderLeadMinutes } from "@backend/actions/settings";
import {
  DEFAULT_EVENT_REMINDER_LEAD_MINUTES,
  EVENT_REMINDER_AMOUNT_INPUT_MAX_LENGTH,
} from "@backend/lib/event-reminder-constants";
import {
  minutesToLeadDisplay,
  leadDisplayToMinutes,
  maxLeadAmountForUnit,
  type EventReminderLeadUnit,
} from "@frontend/lib/eventReminderLead";

interface Props {
  isOpen: boolean;
  /** Called when the modal should close (Cancel, backdrop click, or save success). */
  onClose: () => void;
}

const defaultLeadDisplay = minutesToLeadDisplay(DEFAULT_EVENT_REMINDER_LEAD_MINUTES);

/**
 * Modal dialog for choosing the app's color palette and (when signed in) event email reminder lead time.
 */
export default function SettingsModal({ isOpen, onClose }: Props) {
  const { paletteId, setPaletteId } = useTheme();
  const { store, isAuthenticated } = useDataStore();
  const [selected, setSelected] = useState<PaletteId>(paletteId);
  const [reminderAmount, setReminderAmount] = useState(defaultLeadDisplay.amount);
  const [reminderUnit, setReminderUnit] = useState<EventReminderLeadUnit>(
    defaultLeadDisplay.unit
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  /** When the modal opens, sync the palette from context and load reminder prefs from the server. */
  useEffect(() => {
    if (!isOpen) return;
    setSelected(paletteId);
  }, [isOpen, paletteId]);

  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      const s = await getSettings();
      if (cancelled || !s) return;
      const lead =
        typeof s.event_reminder_lead_minutes === "number"
          ? s.event_reminder_lead_minutes
          : DEFAULT_EVENT_REMINDER_LEAD_MINUTES;
      const d = minutesToLeadDisplay(lead);
      setReminderAmount(d.amount);
      setReminderUnit(d.unit);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, isAuthenticated]);

  if (!isOpen) return null;

  /** Closes the modal when clicking the semi-transparent backdrop. */
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  /** Persists palette and (when signed in) event reminder lead time. */
  function handleSave() {
    setError(null);
    startTransition(async () => {
      const errPalette = await store.updatePaletteId(selected);
      if (errPalette) {
        setError(errPalette);
        return;
      }
      setPaletteId(selected);

      if (isAuthenticated) {
        const minutes = leadDisplayToMinutes(reminderAmount, reminderUnit);
        const errReminder = await updateEventReminderLeadMinutes(minutes);
        if (errReminder) {
          setError(errReminder);
          return;
        }
      }

      onClose();
    });
  }

  function handleReminderAmountChange(raw: string) {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || n < 1) {
      setReminderAmount(1);
      return;
    }
    const cap = maxLeadAmountForUnit(reminderUnit);
    setReminderAmount(Math.min(n, cap));
  }

  function handleReminderUnitChange(unit: EventReminderLeadUnit) {
    setReminderUnit(unit);
    setReminderAmount((prev) => Math.min(prev, maxLeadAmountForUnit(unit)));
  }

  const maxAmount = maxLeadAmountForUnit(reminderUnit);

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

        {isAuthenticated && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Event email reminders
            </p>
            <p className="text-xs text-gray-400">
              Email me at my account address this long before each calendar event.
            </p>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={1}
                max={maxAmount}
                maxLength={EVENT_REMINDER_AMOUNT_INPUT_MAX_LENGTH}
                inputMode="numeric"
                className="w-20 px-3 py-2 rounded-full border border-gray-200 text-sm text-[#1A3021] text-center"
                value={reminderAmount}
                onChange={(e) => handleReminderAmountChange(e.target.value)}
                aria-label="Reminder lead amount"
              />
              <select
                className="flex-1 px-3 py-2 rounded-full border border-gray-200 text-sm text-[#1A3021] bg-white"
                value={reminderUnit}
                onChange={(e) =>
                  handleReminderUnitChange(e.target.value as EventReminderLeadUnit)
                }
                aria-label="Reminder lead unit"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          </div>
        )}

        <FormError error={error} />

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
