/** Shared text and date formatting utilities used across frontend components. */

const LOCALE = "en-US";

/**
 * Derives up to two uppercase initials from a full name.
 * Uses the first character of the first and last whitespace-delimited word.
 * Single-word names fall back to the first two characters.
 *
 * @example getInitials("Victor Wong") → "VW"
 * @example getInitials("Alice") → "AL"
 */
export function getInitials(name: string): string {
  if (!name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Derives up to two uppercase initials from an email address.
 * Splits the local part (before @) on common separators (. _ - +).
 * Single-segment locals fall back to the first two characters.
 *
 * @example getEmailInitials("victor.wong@example.com") → "VW"
 * @example getEmailInitials("alice@example.com") → "AL"
 */
export function getEmailInitials(email: string): string {
  const [local] = email.split("@");
  const parts = local.split(/[._+\-]/);
  if (parts.length === 1) return local.slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Returns a human-readable relative time string for a given ISO date string.
 * Granularity: just now → minutes → hours → days → weeks → months.
 *
 * @example relativeTime("2026-03-31T12:00:00Z") → "1 day ago"
 */
export function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? "s" : ""} ago`;
}

/**
 * Converts a snake_case or lowercase category string into a Title Case label.
 *
 * @example formatCategory("lives_in") → "Lives In"
 * @example formatCategory("work_school") → "Work School"
 */
export function formatCategory(category: string): string {
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Formats a YYYY-MM-DD birthday string as a long-form date.
 * Appends a time component to prevent timezone-induced off-by-one shifts.
 *
 * @example formatBirthdayDate("1990-06-15") → "June 15, 1990"
 */
export function formatBirthdayDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(LOCALE, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Formats an event_date ISO string as a short-form date.
 *
 * @example formatEventDate("2026-08-20T14:00:00") → "Aug 20, 2026"
 */
export function formatEventDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
