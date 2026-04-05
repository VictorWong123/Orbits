import { NextRequest, NextResponse } from "next/server";
import { processEventEmailReminders } from "@backend/lib/process-event-email-reminders";

/**
 * Secured cron endpoint: send due event reminder emails.
 * Call with header `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: NextRequest) {
  return runCron(request);
}

export async function POST(request: NextRequest) {
  return runCron(request);
}

async function runCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processEventEmailReminders();
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
