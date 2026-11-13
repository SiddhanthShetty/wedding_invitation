import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";
import { rateLimit } from "@/lib/rate-limit";
import { fieldErrors, rsvpSchema } from "@/lib/rsvp-schema";
import { computeStats } from "@/lib/stats";
import { phoneKey } from "@/lib/phone";
import { fileStore } from "@/lib/storage/file";
import type { RsvpRecord } from "@/lib/storage/types";

const valid = {
  fullName: "  Asha Rao ",
  email: " Asha.Rao@Example.com ",
  phone: "+91 98765 43210",
  attending: "accept",
  guestCount: "3",
  events: ["sangeet", "muhuratham", "muhuratham"],
  dietary: "vegetarian",
  dietaryNotes: "No peanuts",
  message: "Congratulations!",
};

describe("rsvpSchema", () => {
  it("accepts and tidies a good response", () => {
    const r = rsvpSchema.parse(valid);
    expect(r.fullName).toBe("Asha Rao");
    expect(r.email).toBe("asha.rao@example.com");
    expect(r.guestCount).toBe(3);
    expect(r.events).toEqual(["sangeet", "muhuratham"]);
  });

  it("requires name, phone and an answer", () => {
    const r = rsvpSchema.safeParse({ fullName: "", phone: "abc", attending: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(Object.keys(fieldErrors(r.error)).sort()).toEqual(["attending", "fullName", "phone"]);
  });

  it("treats email as optional, but checks it when given", () => {
    const { email: _omit, ...noEmail } = valid;
    expect(rsvpSchema.parse(noEmail).email).toBe("");
    expect(rsvpSchema.parse({ ...valid, email: "   " }).email).toBe("");
    const bad = rsvpSchema.safeParse({ ...valid, email: "nope" });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(fieldErrors(bad.error).email).toMatch(/valid email/);
  });

  it("adds a phone key for matching repeat replies", () => {
    expect(rsvpSchema.parse(valid).phoneKey).toBe("+919876543210");
  });

  it("requires guests and at least one event when accepting", () => {
    const r = rsvpSchema.safeParse({ ...valid, guestCount: "0", events: [] });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error)).toMatchObject({ guestCount: expect.any(String), events: expect.any(String) });
  });

  it("caps the party size and rejects unknown events", () => {
    expect(rsvpSchema.safeParse({ ...valid, guestCount: "99" }).success).toBe(false);
    expect(rsvpSchema.safeParse({ ...valid, events: ["afterparty"] }).success).toBe(false);
  });

  it("clears guests, events and food for a decline", () => {
    const r = rsvpSchema.parse({ ...valid, attending: "decline" });
    expect(r).toMatchObject({ guestCount: 0, events: [], dietary: "none", dietaryNotes: "" });
  });

  it("strips control characters and enforces length limits", () => {
    expect(rsvpSchema.parse({ ...valid, message: "Hi\u0000 there\u0007" }).message).toBe("Hi there");
    expect(rsvpSchema.safeParse({ ...valid, message: "x".repeat(1001) }).success).toBe(false);
  });
});

describe("file store (development storage)", () => {
  let dir = "";
  afterAll(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it("persists responses and replaces a repeat from the same phone number", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "rsvp-"));
    const file = path.join(dir, "rsvps.json");
    const store = fileStore(dir);
    await store.save(rsvpSchema.parse(valid), null);
    await Promise.all([
      store.save(rsvpSchema.parse({ ...valid, email: "", phone: "+353 87 123 4567", fullName: "Bharat K" }), null),
      // Same guest, number typed differently, email left out: replaces the first reply.
      store.save(rsvpSchema.parse({ ...valid, email: "", phone: "98765-43210", guestCount: "2" }), null),
    ]);
    const onDisk = JSON.parse(await readFile(file, "utf8")) as RsvpRecord[];
    expect(onDisk).toHaveLength(2);
    const all = await fileStore(dir).list();
    const asha = all.find((r) => r.fullName === "Asha Rao");
    expect(asha?.guestCount).toBe(2);
    expect(asha?.email).toBe("");
  });
});

const record = (over: Partial<RsvpRecord>): RsvpRecord => ({
  id: "1",
  createdAt: "2026-12-01T10:00:00.000Z",
  updatedAt: "2026-12-01T10:00:00.000Z",
  fullName: "Asha Rao",
  email: "asha@example.com",
  phone: "+91 98765 43210",
  attending: true,
  guestCount: 2,
  events: ["sangeet", "muhuratham"],
  dietary: "vegetarian",
  dietaryNotes: "",
  message: "",
  inviteId: null,
  ...over,
});

const EVENTS = [
  { id: "sangeet", name: "Sangeet" },
  { id: "muhuratham", name: "Muhuratham" },
  { id: "reception", name: "Reception" },
];

describe("admin statistics", () => {
  it("counts responses, guests and guests per event", () => {
    const stats = computeStats(
      [record({}), record({ id: "2", guestCount: 4, events: ["muhuratham", "reception"] }), record({ id: "3", attending: false, guestCount: 0, events: [] })],
      EVENTS,
    );
    expect(stats).toMatchObject({ responses: 3, accepted: 2, declined: 1, totalGuests: 6 });
    expect(stats.byEvent).toEqual([
      { id: "sangeet", name: "Sangeet", parties: 1, guests: 2 },
      { id: "muhuratham", name: "Muhuratham", parties: 2, guests: 6 },
      { id: "reception", name: "Reception", parties: 1, guests: 4 },
    ]);
  });
});

describe("CSV export", () => {
  it("quotes awkward text and defuses spreadsheet formulas", () => {
    const csv = toCsv([record({ fullName: 'Rao, "Asha"', message: "=HYPERLINK(\"http://x\")\nline two" })], EVENTS);
    const [header, ...rest] = csv.replace("﻿", "").split("\r\n");
    expect(header).toBe("Submitted,Updated,Name,Family link,Email,Phone,Attending,Guests,Sangeet,Muhuratham,Reception,Dietary,Dietary notes,Message");
    expect(rest.join("\r\n")).toContain('"Rao, ""Asha"""');
    expect(rest.join("\r\n")).toContain(`"'=HYPERLINK(""http://x"")\nline two"`);
    expect(rest.join("\r\n")).toContain(",+91 98765 43210,Yes,2,2,2,0,vegetarian,");
    expect(toCsv([record({ inviteId: "inv-1" })], EVENTS, [{ id: "inv-1", family: "Rao family" }])).toContain(",Asha Rao,Rao family,");
    expect(toCsv([record({ message: "+1+cmd|' /C calc'!A0" })], EVENTS)).toContain(`'+1+cmd`);
    expect(toCsv([record({ message: "-2+3" })], EVENTS)).toContain(`,'-2+3`);
  });
});

describe("rateLimit", () => {
  it("blocks after the limit and recovers after the window", () => {
    const key = `t-${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 1000, 1000 + i).ok).toBe(true);
    const blocked = rateLimit(key, 3, 1000, 1500);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(rateLimit(key, 3, 1000, 2100).ok).toBe(true);
  });
});

describe("phoneKey", () => {
  it.each([
    ["+91 98765 43210", "+919876543210"],
    ["0091-98765-43210", "+919876543210"],
    ["98765 43210", "+919876543210"],
    ["098765 43210", "+919876543210"],
    ["(+91) 98765-43210", "+919876543210"],
    ["+353 87 123 4567", "+353871234567"],
    ["00353 87 123 4567", "+353871234567"],
    ["087 123 4567", "0871234567"],
    ["0824 222 3333", "+918242223333"],
  ])("%s → %s", (input, expected) => {
    expect(phoneKey(input)).toBe(expected);
  });
});
