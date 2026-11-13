import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { TOKEN_PATTERN, inviteLink, inviteMessage, newToken, parseInviteLines, whatsappInviteUrl } from "@/lib/invites";
import { rsvpSchema } from "@/lib/rsvp-schema";
import { fileStore } from "@/lib/storage/file";

describe("invite tokens", () => {
  it("are 12 unguessable characters that fit the link pattern", () => {
    const tokens = new Set(Array.from({ length: 2000 }, () => newToken()));
    expect(tokens.size).toBe(2000);
    for (const t of tokens) {
      expect(t).toHaveLength(12);
      expect(TOKEN_PATTERN.test(t)).toBe(true);
      expect(t).not.toMatch(/[01OIl]/); // no look-alike characters
    }
  });
});

describe("parseInviteLines", () => {
  it("reads name, optional phone and optional guest count", () => {
    const { items, errors } = parseInviteLines("Rao family, +91 98765 43210, 4\n\n  Asha Aunty & Uncle  \nPai family,,2", 6);
    expect(errors).toEqual([]);
    expect(items).toEqual([
      { family: "Rao family", phone: "+91 98765 43210", maxGuests: 4 },
      { family: "Asha Aunty & Uncle", phone: "", maxGuests: null },
      { family: "Pai family", phone: "", maxGuests: 2 },
    ]);
  });

  it("names the line that's wrong", () => {
    const { items, errors } = parseInviteLines("Rao family, 12, 4\nPai family, , 9\n, 98765 43210\nA, B, C, D", 6);
    expect(items).toEqual([]);
    expect(errors).toEqual([
      "Line 1 (Rao family): That phone number doesn't look right.",
      "Line 2 (Pai family): number of guests should be 1 to 6.",
      "Line 3 (no name): Add the family's name.",
      "Line 4: use at most two commas (name, phone, guests). Leave commas out of the name.",
    ]);
  });
});

describe("links and messages", () => {
  it("builds the family's link and WhatsApp message", () => {
    const link = inviteLink("https://sweekruti-siddhanth.com/", "Abc123xyz789");
    expect(link).toBe("https://sweekruti-siddhanth.com/?i=Abc123xyz789");
    const msg = inviteMessage("Rao family", link, "Sweekruti & Siddhanth");
    expect(msg.startsWith("Dear Rao family,")).toBe(true);
    expect(msg).toContain(link);
    const wa = new URL(whatsappInviteUrl({ phone: "98765 43210" }, msg));
    expect(wa.pathname).toBe("/919876543210");
    expect(wa.searchParams.get("text")).toBe(msg);
    expect(new URL(whatsappInviteUrl({ phone: "" }, msg)).pathname).toBe("/");
  });
});

describe("file store: guest list and replies", () => {
  let dir = "";
  afterAll(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it("ties replies to the family and keeps one reply per family", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "invites-"));
    const store = fileStore(dir);
    const [rao, pai] = await store.addInvites([
      { family: "Rao family", phone: "+91 98765 43210", maxGuests: 4 },
      { family: "Pai family", phone: "", maxGuests: null },
    ]);
    expect(await store.findInvite(rao!.token)).toMatchObject({ family: "Rao family", maxGuests: 4 });
    expect(await store.findInvite("Nope12345678")).toBeNull();

    const reply = (over: Record<string, unknown>) =>
      rsvpSchema.parse({ fullName: "Asha Rao", phone: "+91 90000 00001", attending: "accept", guestCount: "2", events: ["muhuratham"], ...over });
    await store.save(reply({}), rao!.id);
    // A second family member replies from another phone through the same link: still one reply.
    await store.save(reply({ fullName: "Ravi Rao", phone: "+91 90000 00002", guestCount: "3" }), rao!.id);
    // Someone replies without a link.
    await store.save(reply({ fullName: "Guest", phone: "+91 90000 00009" }), null);

    const all = await store.list();
    expect(all).toHaveLength(2);
    const raoReply = all.find((r) => r.inviteId === rao!.id)!;
    expect([raoReply.fullName, raoReply.guestCount]).toEqual(["Ravi Rao", 3]);
    expect(all.find((r) => r.inviteId === pai!.id)).toBeUndefined();

    // Removing a family from the list keeps their reply.
    await store.deleteInvite(rao!.id);
    expect((await store.listInvites()).map((i) => i.family)).toEqual(["Pai family"]);
    expect((await store.list()).find((r) => r.fullName === "Ravi Rao")?.inviteId).toBeNull();
  });
});
