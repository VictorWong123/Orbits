"use client";

import {
  useState,
  useRef,
  useCallback,
  type ChangeEventHandler,
} from "react";
import { DayPicker } from "react-day-picker";
import { format, setHours, setMinutes } from "date-fns";
import { useOutsideClick } from "@frontend/hooks/useOutsideClick";

interface Props {
  /** The `name` attribute forwarded to the hidden `<input>` for form submission. */
  name: string;
  /** Placeholder text rendered when no date has been chosen. */
  placeholder?: string;
}

/**
 * Themed date-time picker built on react-day-picker.
 *
 * Renders a pill-shaped trigger button that, when clicked, opens a floating
 * panel containing a fully themed calendar and a time input. The composed
 * date-time is surfaced via a hidden `<input name={name}>` so it integrates
 * seamlessly with Next.js Server Action `<form>` elements.
 */
export default function DateTimePicker({
  name,
  placeholder = "Pick date & time",
}: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Date | undefined>();
  const [timeValue, setTimeValue] = useState("09:00");
  const containerRef = useRef<HTMLDivElement>(null);

  const closePicker = useCallback(() => setOpen(false), []);
  useOutsideClick(containerRef, closePicker, open);

  /**
   * Updates the time component of the selected date when the time input
   * changes, keeping the date portion intact.
   */
  const handleTimeChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const time = e.target.value;
    setTimeValue(time);
    if (!selected) return;
    const [hours, minutes] = time.split(":").map(Number);
    setSelected(setHours(setMinutes(selected, minutes), hours));
  };

  /**
   * Applies the current time component to the newly selected day so the
   * composed Date is always kept in sync.
   */
  const handleDaySelect = (date: Date | undefined) => {
    if (!date) {
      setSelected(undefined);
      return;
    }
    const [hours, minutes] = timeValue.split(":").map(Number);
    setSelected(setHours(setMinutes(date, minutes), hours));
  };

  /** ISO-ish string passed to the hidden input (valid for `Date.parse`). */
  const hiddenValue = selected
    ? format(selected, "yyyy-MM-dd'T'HH:mm")
    : "";

  /** Human-readable label shown on the trigger button. */
  const triggerLabel = selected
    ? format(selected, "MMM d, yyyy 'at' h:mm a")
    : null;

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger button — matches the pill-input style of the rest of the form */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="bg-[var(--color-primary-light)] rounded-full px-4 py-2.5 text-sm text-left border-0 outline-none focus:ring-2 focus:ring-[var(--color-accent)] whitespace-nowrap w-full"
      >
        {triggerLabel ? (
          <span className="text-[var(--color-primary)] font-medium">
            {triggerLabel}
          </span>
        ) : (
          <span className="text-[var(--color-accent)]">{placeholder}</span>
        )}
      </button>

      {/* Hidden input consumed by the Server Action form */}
      <input type="hidden" name={name} value={hiddenValue} />

      {/* Floating calendar panel */}
      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-3xl shadow-xl p-5 w-72">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleDaySelect}
            classNames={{
              root: "w-full",
              months: "w-full",
              month: "w-full",
              month_caption:
                "flex items-center justify-center relative h-9 mb-1",
              caption_label:
                "text-sm font-semibold text-[#1A3021]",
              nav: "absolute inset-x-0 top-0 h-9 flex items-center justify-between px-0.5",
              button_previous:
                "h-8 w-8 flex items-center justify-center rounded-full hover:bg-[var(--color-primary-light)] text-[var(--color-primary)] transition-colors",
              button_next:
                "h-8 w-8 flex items-center justify-center rounded-full hover:bg-[var(--color-primary-light)] text-[var(--color-primary)] transition-colors",
              chevron: "fill-[var(--color-primary)] w-4 h-4",
              month_grid: "w-full border-collapse mt-1",
              weekdays: "flex",
              weekday:
                "flex-1 text-[11px] font-semibold text-[var(--color-accent)] text-center pb-2",
              week: "flex",
              day: "flex-1 flex items-center justify-center p-0.5",
              day_button:
                "w-8 h-8 text-sm rounded-full flex items-center justify-center transition-colors font-medium text-[#1A3021] hover:bg-[var(--color-primary-light)]",
              selected:
                "bg-[var(--color-primary)] text-white rounded-full hover:bg-[var(--color-primary-dark)]",
              today:
                "font-bold text-[var(--color-primary)] ring-1 ring-[var(--color-primary)] rounded-full",
              outside: "opacity-30",
              disabled: "opacity-25 cursor-not-allowed",
            }}
          />

          {/* Time row */}
          <div className="mt-3 pt-3 border-t border-[var(--color-primary-light)] flex items-center gap-3">
            <span className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wide shrink-0">
              Time
            </span>
            <input
              type="time"
              value={timeValue}
              onChange={handleTimeChange}
              className="flex-1 bg-[var(--color-primary-light)] rounded-full px-3 py-1.5 text-sm text-[var(--color-primary)] border-0 outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>

          {/* Confirm button */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 w-full bg-[var(--color-primary)] text-white rounded-full py-2 text-sm font-semibold hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
