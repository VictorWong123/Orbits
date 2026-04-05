import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@backend/lib/process-event-email-reminders", () => ({
  processEventEmailReminders: vi.fn().mockResolvedValue({
    processed: 2,
    sent: 1,
    errors: [],
  }),
}));

import { GET, POST } from "@/app/api/cron/event-email-reminders/route";
import { processEventEmailReminders } from "@backend/lib/process-event-email-reminders";

describe("GET /api/cron/event-email-reminders", () => {
  const originalCron = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "test-cron-secret-xyz";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalCron;
    vi.mocked(processEventEmailReminders).mockClear();
  });

  it("returns 401 when CRON_SECRET is missing", async () => {
    delete process.env.CRON_SECRET;
    const req = new NextRequest("http://localhost/api/cron/event-email-reminders", {
      headers: { authorization: "Bearer test-cron-secret-xyz" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(vi.mocked(processEventEmailReminders)).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization header is missing or wrong", async () => {
    const req = new NextRequest("http://localhost/api/cron/event-email-reminders");
    const res = await GET(req);
    expect(res.status).toBe(401);

    const bad = new NextRequest("http://localhost/api/cron/event-email-reminders", {
      headers: { authorization: "Bearer wrong" },
    });
    expect((await GET(bad)).status).toBe(401);
    expect(vi.mocked(processEventEmailReminders)).not.toHaveBeenCalled();
  });

  it("returns 200 and JSON body when Bearer matches CRON_SECRET", async () => {
    process.env.CRON_SECRET = "test-cron-secret-xyz";
    const req = new NextRequest("http://localhost/api/cron/event-email-reminders", {
      headers: { authorization: "Bearer test-cron-secret-xyz" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ processed: 2, sent: 1, errors: [] });
    expect(vi.mocked(processEventEmailReminders)).toHaveBeenCalledTimes(1);
  });

  it("POST uses the same auth and handler", async () => {
    const req = new NextRequest("http://localhost/api/cron/event-email-reminders", {
      method: "POST",
      headers: { authorization: "Bearer test-cron-secret-xyz" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(vi.mocked(processEventEmailReminders)).toHaveBeenCalled();
  });
});
