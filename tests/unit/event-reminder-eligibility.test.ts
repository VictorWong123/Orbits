import { describe, it, expect } from "vitest";
import {
  isEventReminderDue,
  parseEventDateMs,
  resolveLeadMinutes,
} from "@backend/lib/event-reminder-eligibility";
import {
  DEFAULT_EVENT_REMINDER_LEAD_MINUTES,
  MIN_EVENT_REMINDER_LEAD_MINUTES,
  MINUTES_PER_DAY,
  MINUTES_PER_HOUR,
} from "@backend/lib/event-reminder-constants";

describe("isEventReminderDue", () => {
  it("returns false when the event has already started", () => {
    const now = Date.parse("2026-06-01T12:00:00.000Z");
    const event = Date.parse("2026-06-01T11:00:00.000Z");
    expect(isEventReminderDue(now, event, MINUTES_PER_DAY)).toBe(false);
  });

  it("returns false before the notify instant", () => {
    const event = Date.parse("2026-06-03T12:00:00.000Z");
    const now = Date.parse("2026-06-01T12:00:00.000Z");
    expect(isEventReminderDue(now, event, MINUTES_PER_DAY)).toBe(false);
  });

  it("returns true on or after notify instant while event is still future", () => {
    const event = Date.parse("2026-06-03T12:00:00.000Z");
    const notifyAt = Date.parse("2026-06-02T12:00:00.000Z");
    expect(isEventReminderDue(notifyAt, event, MINUTES_PER_DAY)).toBe(true);
    const later = notifyAt + 60 * 1000;
    expect(isEventReminderDue(later, event, MINUTES_PER_DAY)).toBe(true);
  });

  it("returns false when lead is below minimum (invalid)", () => {
    const now = Date.parse("2026-06-10T12:00:00.000Z");
    const event = Date.parse("2026-06-11T12:00:00.000Z");
    expect(isEventReminderDue(now, event, 0)).toBe(false);
  });

  it("supports short leads (minutes) without waiting — notify window already open", () => {
    const event = Date.parse("2026-04-05T15:10:00.000Z");
    const now = Date.parse("2026-04-05T15:05:00.000Z");
    const leadMinutes = 5;
    expect(isEventReminderDue(now, event, leadMinutes)).toBe(true);
  });

  it("does not fire until 1 minute before when lead is 1 minute", () => {
    const event = Date.parse("2026-04-05T15:10:00.000Z");
    const tooEarly = Date.parse("2026-04-05T15:08:00.000Z");
    expect(isEventReminderDue(tooEarly, event, 1)).toBe(false);
    const atNotify = Date.parse("2026-04-05T15:09:00.000Z");
    expect(isEventReminderDue(atNotify, event, 1)).toBe(true);
  });

  it("catch-up: if notify instant was missed, still sends while event is future", () => {
    const event = Date.parse("2026-04-07T18:00:00.000Z");
    const now = Date.parse("2026-04-07T12:00:00.000Z");
    const leadMinutes = 7 * MINUTES_PER_DAY;
    expect(isEventReminderDue(now, event, leadMinutes)).toBe(true);
  });
});

describe("parseEventDateMs", () => {
  it("parses ISO datetimes", () => {
    expect(parseEventDateMs("2026-08-20T14:30:00.000Z")).toBe(
      Date.parse("2026-08-20T14:30:00.000Z")
    );
  });

  it("returns NaN for invalid input", () => {
    expect(Number.isNaN(parseEventDateMs("not-a-date"))).toBe(true);
  });
});

describe("resolveLeadMinutes", () => {
  it("uses default when undefined or null", () => {
    expect(resolveLeadMinutes(undefined)).toBe(DEFAULT_EVENT_REMINDER_LEAD_MINUTES);
    expect(resolveLeadMinutes(null)).toBe(DEFAULT_EVENT_REMINDER_LEAD_MINUTES);
  });

  it("uses default when value is below minimum", () => {
    expect(resolveLeadMinutes(0)).toBe(DEFAULT_EVENT_REMINDER_LEAD_MINUTES);
  });

  it("returns stored value when valid", () => {
    expect(resolveLeadMinutes(90)).toBe(90);
    expect(resolveLeadMinutes(3 * MINUTES_PER_HOUR)).toBe(3 * MINUTES_PER_HOUR);
  });
});

describe("end-to-end instant math (no wall-clock)", () => {
  it("matches cron decision: due iff now >= event - lead and event > now", () => {
    const eventIso = "2026-12-01T20:00:00.000Z";
    const eventMs = parseEventDateMs(eventIso);
    const leadMinutes = 24 * MINUTES_PER_HOUR;
    const notifyMs = eventMs - leadMinutes * 60 * 1000;

    expect(isEventReminderDue(notifyMs - 1000, eventMs, leadMinutes)).toBe(false);
    expect(isEventReminderDue(notifyMs, eventMs, leadMinutes)).toBe(true);
    expect(isEventReminderDue(eventMs - 1, eventMs, leadMinutes)).toBe(true);
    expect(isEventReminderDue(eventMs, eventMs, leadMinutes)).toBe(false);
  });
});
