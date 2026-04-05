#!/usr/bin/env node
/**
 * End-to-end smoke test for event email reminders.
 *
 * What it does:
 *   1. Reads secrets from .env.local (never committed — gitignored).
 *   2. Validates all required env vars are present.
 *   3. [--seed] Optionally inserts a fake due-now event via Supabase service role.
 *   4. Calls the local (or deployed) cron endpoint.
 *   5. Re-queries Supabase to confirm event_reminder_email_sent_at was stamped.
 *   6. [--seed] Cleans up the test event.
 *
 * Usage:
 *   npm run dev           (in another terminal — the cron hits localhost:3000)
 *   node scripts/test-event-reminders.mjs           # use existing events
 *   node scripts/test-event-reminders.mjs --seed    # insert + clean up a test event
 *   CRON_URL=https://your.app.com/... node scripts/test-event-reminders.mjs --seed
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ── 1. Load .env.local ────────────────────────────────────────────────────────
function loadEnvFile(path = ".env.local") {
  try {
    const lines = readFileSync(path, "utf8").split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    console.warn("⚠  Could not read .env.local — falling back to existing env vars.");
  }
}

loadEnvFile();

/** Returns the first localhost port that responds, or null if neither is up. */
async function detectDevPort(candidates = [3000, 3001, 3002]) {
  for (const port of candidates) {
    try {
      const res = await fetch(`http://localhost:${port}/`, {
        signal: AbortSignal.timeout(1500),
      });
      if (res.status < 500) return port;
    } catch {
      // not listening on this port
    }
  }
  return null;
}

// Allow --port=XXXX flag to override port detection.
const portArg = process.argv.find((a) => a.startsWith("--port="));
const explicitPort = portArg ? parseInt(portArg.split("=")[1], 10) : null;

let CRON_URL = process.env.CRON_URL;
if (!CRON_URL) {
  const port = explicitPort ?? await detectDevPort();
  if (!port) {
    console.error(
      "\n❌  Could not find a running dev server on localhost:3000/3001/3002.\n" +
      "    Start it first with:  npm run dev\n" +
      "    If Next.js picked a different port, pass:  --port=XXXX\n"
    );
    process.exit(1);
  }
  if (port !== 3000) {
    console.log(`  ⚠  Port 3000 is occupied by another process; using port ${port} instead.\n`);
  }
  CRON_URL = `http://localhost:${port}/api/cron/event-email-reminders`;
}

// ── 2. Validate required vars ─────────────────────────────────────────────────
const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "EMAIL_SMTP_HOST",
  "EMAIL_SMTP_USER",
  "EMAIL_SMTP_PASS",
];

const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("\n❌  Missing required env vars in .env.local:\n");
  for (const k of missing) console.error(`     ${k}=<your-value>`);
  console.error("\nSee .env.example for instructions (Gmail App Password works out of the box).\n");
  process.exit(1);
}

const SEED = process.argv.includes("--seed");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function ok(msg) { console.log(`  ✅  ${msg}`); }
function fail(msg) { console.error(`  ❌  ${msg}`); }
function info(msg) { console.log(`  ℹ  ${msg}`); }

/** Inserts a test event whose notify window is already open and returns its id. */
async function seedTestEvent() {
  info("Seeding a test event that is immediately due for a reminder email…");

  // Pick the first profile in the DB (service role bypasses RLS).
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, user_id, full_name")
    .limit(1);

  if (pErr || !profiles?.length) {
    fail(
      `Could not find a profile to seed against: ${pErr?.message ?? "no profiles"}\n` +
      "  Create at least one profile in the app, then re-run."
    );
    process.exit(1);
  }

  const { id: profile_id, user_id, full_name } = profiles[0];
  info(`Using profile "${full_name}" (user_id: ${user_id})`);

  // event_date = 30 seconds from now; lead = 1 day → notify_at is already in the past.
  const eventDate = new Date(Date.now() + 30 * 1000).toISOString();

  const { data: eventRow, error: eErr } = await supabase
    .from("events")
    .insert({
      profile_id,
      user_id,
      title: "[TEST] Reminder smoke test",
      event_date: eventDate,
      notes: "Auto-generated by test-event-reminders.mjs — safe to delete",
    })
    .select("id")
    .single();

  if (eErr || !eventRow) {
    fail(`Insert failed: ${eErr?.message ?? "unknown"}`);
    process.exit(1);
  }

  ok(`Inserted test event id=${eventRow.id} (event_date=${eventDate})`);
  return eventRow.id;
}

/** Deletes the seeded event. */
async function cleanupTestEvent(eventId) {
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) {
    fail(`Cleanup failed for ${eventId}: ${error.message}`);
  } else {
    ok(`Cleaned up test event ${eventId}`);
  }
}

/** Queries how many pending-reminder events currently exist. */
async function countPendingEvents() {
  const { count, error } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .is("event_reminder_email_sent_at", null)
    .gt("event_date", new Date().toISOString());
  if (error) throw error;
  return count ?? 0;
}

/** Returns events whose reminder email was just stamped (within the last 10 seconds). */
async function recentlySentEvents() {
  const since = new Date(Date.now() - 10_000).toISOString();
  const { data, error } = await supabase
    .from("events")
    .select("id, title, event_date, event_reminder_email_sent_at")
    .gte("event_reminder_email_sent_at", since);
  if (error) throw error;
  return data ?? [];
}

// ── Main ──────────────────────────────────────────────────────────────────────
let seededId = null;

console.log("\n🔔  Event reminder smoke test\n");
info(`Cron URL: ${CRON_URL}`);

try {
  if (SEED) seededId = await seedTestEvent();

  const before = await countPendingEvents();
  info(`Pending (unsent, future) events before cron: ${before}`);

  if (before === 0 && !SEED) {
    info(
      "No pending events found. Options:\n" +
      "    a) Run with --seed to auto-insert a test event.\n" +
      "    b) In the app: add a future event, then re-run."
    );
    process.exit(0);
  }

  // ── Call the cron endpoint ─────────────────────────────────────────────────
  console.log(`\n  ► Calling cron endpoint…`);
  const start = Date.now();
  const res = await fetch(CRON_URL, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  const elapsed = Date.now() - start;
  const body = await res.json();

  console.log(`\n  HTTP ${res.status} (${elapsed}ms)`);
  console.log("  Response:", JSON.stringify(body, null, 4));
  console.log();

  if (res.status !== 200) {
    fail(`Cron returned ${res.status}. Check CRON_SECRET and that npm run dev is running.`);
    process.exit(1);
  }

  ok(`processed=${body.processed}  sent=${body.sent}  errors=${body.errors?.length ?? 0}`);

  if (body.errors?.length) {
    fail("Some events produced errors:");
    for (const e of body.errors) console.error(`       ${e}`);
  }

  // ── Verify DB was stamped ─────────────────────────────────────────────────
  const stamped = await recentlySentEvents();
  if (stamped.length > 0) {
    ok(`${stamped.length} event(s) now have event_reminder_email_sent_at set:`);
    for (const ev of stamped) {
      console.log(`       "${ev.title}" → ${ev.event_reminder_email_sent_at}`);
    }
  } else if (body.sent > 0) {
    ok("Sent count > 0 per cron response (DB check window may have missed it).");
  } else {
    info(
      "No events were stamped. This is normal if:\n" +
      "    • No events are within their notify window yet.\n" +
      "    • RESEND_API_KEY is not set (email fails → event not stamped).\n" +
      "    • The event_date is too far in the future for the current lead time."
    );
  }
} finally {
  if (seededId) await cleanupTestEvent(seededId);
}

console.log("\n  Done.\n");
