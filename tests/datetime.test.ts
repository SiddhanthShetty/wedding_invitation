import { describe, expect, it } from "vitest";
import { countdownParts, formatDate, formatTime, formatTimeRange, zonedDateTimeToUtc } from "@/lib/datetime";

describe("zonedDateTimeToUtc", () => {
  it("converts India time", () => {
    expect(zonedDateTimeToUtc("2027-02-14", "00:00", "Asia/Kolkata").toISOString()).toBe("2027-02-13T18:30:00.000Z");
  });
  it("handles daylight-saving zones on both sides of the change", () => {
    expect(zonedDateTimeToUtc("2027-01-15", "12:00", "Europe/Dublin").toISOString()).toBe("2027-01-15T12:00:00.000Z");
    expect(zonedDateTimeToUtc("2027-07-15", "12:00", "Europe/Dublin").toISOString()).toBe("2027-07-15T11:00:00.000Z");
    expect(zonedDateTimeToUtc("2027-07-15", "12:00", "America/New_York").toISOString()).toBe("2027-07-15T16:00:00.000Z");
  });
});

describe("formatting", () => {
  it("derives the weekday from the date", () => {
    expect(formatDate("2027-02-14")).toEqual({ weekday: "Sunday", long: "14 February 2027" });
  });
  it("formats times", () => {
    expect(formatTime("00:00")).toBe("12 am");
    expect(formatTime("12:30")).toBe("12:30 pm");
    expect(formatTime("18:05")).toBe("6:05 pm");
    expect(formatTimeRange("10:00", "13:00")).toBe("10 am to 1 pm");
    expect(formatTimeRange("19:00", null)).toBe("7 pm onwards");
  });
});

describe("countdownParts", () => {
  it("splits the remaining time", () => {
    const now = Date.UTC(2027, 0, 1);
    const target = now + ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000;
    expect(countdownParts(target, now)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5, done: false });
  });
  it("never goes negative", () => {
    expect(countdownParts(1000, 5000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, done: true });
  });
});
