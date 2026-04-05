-- Event email reminders: lead time per user + dedupe sent timestamps on events.

-- user_settings: how many minutes before event_date to send the owner an email (default 24h).
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS event_reminder_lead_minutes integer NOT NULL DEFAULT 1440;

ALTER TABLE public.user_settings
  DROP CONSTRAINT IF EXISTS user_settings_event_reminder_lead_minutes_check;

ALTER TABLE public.user_settings
  ADD CONSTRAINT user_settings_event_reminder_lead_minutes_check
  CHECK (event_reminder_lead_minutes >= 1 AND event_reminder_lead_minutes <= 525600);

-- events: set when the reminder email was sent (null = not sent yet).
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_reminder_email_sent_at timestamptz;

-- Partial index to speed cron queries for pending reminder emails on future events.
DROP INDEX IF EXISTS idx_events_pending_event_reminder_email;

CREATE INDEX idx_events_pending_event_reminder_email
  ON public.events (user_id, event_date)
  WHERE event_reminder_email_sent_at IS NULL;
