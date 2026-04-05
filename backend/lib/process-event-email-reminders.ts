import { sendEventReminderEmail } from "@backend/lib/email/smtp-event-reminder";
import {
  isEventReminderDue,
  parseEventDateMs,
  resolveLeadMinutes,
} from "@backend/lib/event-reminder-eligibility";
import { createServiceRoleClient } from "@backend/lib/supabase/service-role";
import type { Event } from "@backend/types/database";

export interface ProcessEventEmailRemindersResult {
  processed: number;
  sent: number;
  errors: string[];
}

/**
 * Loads pending future events (no reminder email sent yet), sends due reminders,
 * and marks each event with `event_reminder_email_sent_at` after a successful send.
 */
export async function processEventEmailReminders(): Promise<ProcessEventEmailRemindersResult> {
  const supabase = createServiceRoleClient();
  const now = new Date();
  const nowMs = now.getTime();

  const { data: eventRows, error: eventsError } = await supabase
    .from("events")
    .select("id, user_id, profile_id, title, event_date, event_reminder_email_sent_at")
    .is("event_reminder_email_sent_at", null)
    .gt("event_date", now.toISOString());

  if (eventsError) {
    return {
      processed: 0,
      sent: 0,
      errors: [eventsError.message],
    };
  }

  const events = (eventRows ?? []) as Pick<
    Event,
    | "id"
    | "user_id"
    | "profile_id"
    | "title"
    | "event_date"
    | "event_reminder_email_sent_at"
  >[];

  if (events.length === 0) {
    return { processed: 0, sent: 0, errors: [] };
  }

  const userIds = [...new Set(events.map((e) => e.user_id))];
  const profileIds = [...new Set(events.map((e) => e.profile_id))];

  const { data: settingsRows, error: settingsError } = await supabase
    .from("user_settings")
    .select("user_id, event_reminder_lead_minutes")
    .in("user_id", userIds);

  if (settingsError) {
    return { processed: 0, sent: 0, errors: [settingsError.message] };
  }

  const { data: profileRows, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", profileIds);

  if (profilesError) {
    return { processed: 0, sent: 0, errors: [profilesError.message] };
  }

  const leadByUser = new Map(
    (settingsRows ?? []).map((row: { user_id: string; event_reminder_lead_minutes: number }) => [
      row.user_id,
      resolveLeadMinutes(row.event_reminder_lead_minutes),
    ])
  );

  const nameByProfile = new Map(
    (profileRows ?? []).map((row: { id: string; full_name: string }) => [
      row.id,
      row.full_name,
    ])
  );

  const errors: string[] = [];
  let sent = 0;

  for (const event of events) {
    const eventDateMs = parseEventDateMs(event.event_date);
    if (Number.isNaN(eventDateMs)) {
      errors.push(`Invalid event_date for event ${event.id}`);
      continue;
    }

    const leadMinutes =
      leadByUser.get(event.user_id) ?? resolveLeadMinutes(undefined);

    if (!isEventReminderDue(nowMs, eventDateMs, leadMinutes)) {
      continue;
    }

    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(event.user_id);

    if (userError || !userData?.user?.email) {
      errors.push(
        userError?.message ??
          `No email for user ${event.user_id} (event ${event.id})`
      );
      continue;
    }

    const profileName = nameByProfile.get(event.profile_id) ?? "Someone";
    const eventDateLabel = new Date(eventDateMs).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const err = await sendEventReminderEmail({
      to: userData.user.email,
      eventTitle: event.title,
      profileName,
      eventDateLabel,
    });

    if (err) {
      errors.push(`${event.id}: ${err}`);
      continue;
    }

    const { error: updateError } = await supabase
      .from("events")
      .update({ event_reminder_email_sent_at: new Date().toISOString() })
      .eq("id", event.id)
      .eq("user_id", event.user_id);

    if (updateError) {
      errors.push(`Mark sent failed for ${event.id}: ${updateError.message}`);
      continue;
    }

    sent += 1;
  }

  return {
    processed: events.length,
    sent,
    errors,
  };
}
