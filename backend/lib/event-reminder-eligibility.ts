import {
  DEFAULT_EVENT_REMINDER_LEAD_MINUTES,
  MIN_EVENT_REMINDER_LEAD_MINUTES,
} from "@backend/lib/event-reminder-constants";

/**
 * Returns true when an email reminder should be sent now: the notify instant
 * (event time minus lead) is in the past or now, and the event is still in the future.
 */
export function isEventReminderDue(
  nowMs: number,
  eventDateMs: number,
  leadMinutes: number
): boolean {
  if (leadMinutes < MIN_EVENT_REMINDER_LEAD_MINUTES) {
    return false;
  }
  if (eventDateMs <= nowMs) {
    return false;
  }
  const leadMs = leadMinutes * 60 * 1000;
  const notifyAtMs = eventDateMs - leadMs;
  return nowMs >= notifyAtMs;
}

/**
 * Parses an ISO date string to milliseconds, or NaN if invalid.
 */
export function parseEventDateMs(iso: string): number {
  return Date.parse(iso);
}

/**
 * Resolves lead minutes from settings, falling back to the app default.
 */
export function resolveLeadMinutes(leadMinutes: number | null | undefined): number {
  if (
    typeof leadMinutes === "number" &&
    Number.isFinite(leadMinutes) &&
    leadMinutes >= MIN_EVENT_REMINDER_LEAD_MINUTES
  ) {
    return leadMinutes;
  }
  return DEFAULT_EVENT_REMINDER_LEAD_MINUTES;
}
