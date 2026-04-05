import {
  MAX_EVENT_REMINDER_LEAD_MINUTES,
  MIN_EVENT_REMINDER_LEAD_MINUTES,
  MINUTES_PER_DAY,
  MINUTES_PER_HOUR,
} from "@backend/lib/event-reminder-constants";

/** Unit selector for “how long before the event” in settings. */
export type EventReminderLeadUnit = "minutes" | "hours" | "days";

/**
 * Converts stored minutes into a whole-number amount and unit for the UI
 * (prefers days, then hours, then minutes when evenly divisible).
 */
export function minutesToLeadDisplay(
  minutes: number
): { amount: number; unit: EventReminderLeadUnit } {
  const clamped = Math.max(
    MIN_EVENT_REMINDER_LEAD_MINUTES,
    Math.min(MAX_EVENT_REMINDER_LEAD_MINUTES, Math.floor(minutes))
  );
  if (clamped % MINUTES_PER_DAY === 0) {
    return { amount: clamped / MINUTES_PER_DAY, unit: "days" };
  }
  if (clamped % MINUTES_PER_HOUR === 0) {
    return { amount: clamped / MINUTES_PER_HOUR, unit: "hours" };
  }
  return { amount: clamped, unit: "minutes" };
}

/**
 * Converts amount + unit from the form into total minutes for persistence.
 */
export function leadDisplayToMinutes(
  amount: number,
  unit: EventReminderLeadUnit
): number {
  const whole = Math.floor(Math.max(1, amount));
  switch (unit) {
    case "days":
      return whole * MINUTES_PER_DAY;
    case "hours":
      return whole * MINUTES_PER_HOUR;
    default:
      return whole;
  }
}

/** Maximum whole amount allowed for the given unit (maps to {@link MAX_EVENT_REMINDER_LEAD_MINUTES}). */
export function maxLeadAmountForUnit(unit: EventReminderLeadUnit): number {
  switch (unit) {
    case "days":
      return Math.floor(MAX_EVENT_REMINDER_LEAD_MINUTES / MINUTES_PER_DAY);
    case "hours":
      return Math.floor(MAX_EVENT_REMINDER_LEAD_MINUTES / MINUTES_PER_HOUR);
    default:
      return MAX_EVENT_REMINDER_LEAD_MINUTES;
  }
}
