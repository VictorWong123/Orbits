import nodemailer from "nodemailer";

/** SMTP port used when EMAIL_SMTP_PORT is not set (465 = implicit TLS). */
const DEFAULT_SMTP_PORT = 465;

export interface SendEventReminderEmailParams {
  to: string;
  eventTitle: string;
  profileName: string;
  eventDateLabel: string;
}

/**
 * Sends an event reminder email using the SMTP credentials in the environment.
 * Works with Gmail, any SMTP relay, or Supabase's own custom SMTP settings.
 * Returns null on success, or an error message string on failure.
 */
export async function sendEventReminderEmail(
  params: SendEventReminderEmailParams
): Promise<string | null> {
  const host = process.env.EMAIL_SMTP_HOST;
  const user = process.env.EMAIL_SMTP_USER;
  const pass = process.env.EMAIL_SMTP_PASS;
  const from = process.env.EMAIL_FROM ?? user;

  if (!host || !user || !pass || !from) {
    const missing = ["EMAIL_SMTP_HOST", "EMAIL_SMTP_USER", "EMAIL_SMTP_PASS", "EMAIL_FROM"]
      .filter((k) => !process.env[k])
      .join(", ");
    return `Missing email env vars: ${missing}`;
  }

  const port = parseInt(process.env.EMAIL_SMTP_PORT ?? String(DEFAULT_SMTP_PORT), 10);
  const secure = port === DEFAULT_SMTP_PORT;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const subject = `Reminder: ${params.eventTitle}`;
  const html = buildHtml(params);

  try {
    await transporter.sendMail({ from, to: params.to, subject, html });
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Unknown SMTP error";
  }
}

/** Builds the HTML body for the reminder email. */
function buildHtml(params: SendEventReminderEmailParams): string {
  const { eventTitle, profileName, eventDateLabel } = params;
  return `
    <p>You have an upcoming event in your Orbit calendar.</p>
    <p><strong>${escapeHtml(eventTitle)}</strong></p>
    <p>With: ${escapeHtml(profileName)}</p>
    <p>When: ${escapeHtml(eventDateLabel)}</p>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
