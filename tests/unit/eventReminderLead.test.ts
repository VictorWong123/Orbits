import { describe, it, expect } from "vitest";
import {
  minutesToLeadDisplay,
  leadDisplayToMinutes,
  maxLeadAmountForUnit,
} from "@frontend/lib/eventReminderLead";
import {
  DEFAULT_EVENT_REMINDER_LEAD_MINUTES,
  MAX_EVENT_REMINDER_LEAD_MINUTES,
  MINUTES_PER_DAY,
  MINUTES_PER_HOUR,
} from "@backend/lib/event-reminder-constants";

describe("minutesToLeadDisplay / leadDisplayToMinutes", () => {
  it("round-trips the default 24h as 1 day", () => {
    const d = minutesToLeadDisplay(DEFAULT_EVENT_REMINDER_LEAD_MINUTES);
    expect(d).toEqual({ amount: 1, unit: "days" });
    expect(leadDisplayToMinutes(d.amount, d.unit)).toBe(
      DEFAULT_EVENT_REMINDER_LEAD_MINUTES
    );
  });

  it("prefers hours when not divisible by days", () => {
    const d = minutesToLeadDisplay(120);
    expect(d.unit).toBe("hours");
    expect(d.amount).toBe(2);
  });

  it("uses minutes when not divisible by hours", () => {
    const d = minutesToLeadDisplay(61);
    expect(d.unit).toBe("minutes");
    expect(d.amount).toBe(61);
  });

  it("clamps out-of-range minutes to min/max for display", () => {
    const low = minutesToLeadDisplay(0);
    expect(leadDisplayToMinutes(low.amount, low.unit)).toBeGreaterThanOrEqual(
      MINUTES_PER_HOUR / MINUTES_PER_HOUR
    );
    const high = minutesToLeadDisplay(MAX_EVENT_REMINDER_LEAD_MINUTES + 99999);
    expect(leadDisplayToMinutes(high.amount, high.unit)).toBeLessThanOrEqual(
      MAX_EVENT_REMINDER_LEAD_MINUTES
    );
  });

  it("round-trips 7 days", () => {
    const minutes = 7 * MINUTES_PER_DAY;
    const d = minutesToLeadDisplay(minutes);
    expect(d).toEqual({ amount: 7, unit: "days" });
    expect(leadDisplayToMinutes(7, "days")).toBe(minutes);
  });
});

describe("maxLeadAmountForUnit", () => {
  it("caps days amount to one year of days", () => {
    expect(maxLeadAmountForUnit("days")).toBe(365);
  });

  it("caps hours to one year worth of hours", () => {
    expect(maxLeadAmountForUnit("hours")).toBe(
      Math.floor(MAX_EVENT_REMINDER_LEAD_MINUTES / MINUTES_PER_HOUR)
    );
  });

  it("allows full minute range for minutes unit", () => {
    expect(maxLeadAmountForUnit("minutes")).toBe(MAX_EVENT_REMINDER_LEAD_MINUTES);
  });
});
