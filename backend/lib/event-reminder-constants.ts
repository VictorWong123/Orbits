/** Minutes in one hour — used for lead-time UI and validation. */
export const MINUTES_PER_HOUR = 60;

/** Minutes in one day — default lead is 24h. */
export const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

/** Default “email me this long before the event” (24 hours). */
export const DEFAULT_EVENT_REMINDER_LEAD_MINUTES = MINUTES_PER_DAY;

/** Minimum allowed lead (1 minute). */
export const MIN_EVENT_REMINDER_LEAD_MINUTES = 1;

/** Maximum allowed lead (1 year in minutes). */
export const MAX_EVENT_REMINDER_LEAD_MINUTES = 365 * MINUTES_PER_DAY;

/** Max numeric digits for the lead amount input in settings. */
export const EVENT_REMINDER_AMOUNT_INPUT_MAX_LENGTH = 6;
