import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { newToken, type InviteInput, type InviteRecord } from "@/lib/invites";
import { phoneKey } from "@/lib/phone";
import type { RsvpInput } from "@/lib/rsvp-schema";
import type { RsvpRecord, RsvpStore } from "./types";

/** Local-development store. Writes to .data/ (git-ignored): rsvps.json and invites.json. */
export function fileStore(dir = path.join(/* turbopackIgnore: true */ process.cwd(), ".data")): RsvpStore {
  const rsvpFile = path.join(/* turbopackIgnore: true */ dir, "rsvps.json");
  const inviteFile = path.join(/* turbopackIgnore: true */ dir, "invites.json");
  let queue: Promise<unknown> = Promise.resolve();

  async function read<T>(file: string): Promise<T[]> {
    try {
      return JSON.parse(await readFile(/* turbopackIgnore: true */ file, "utf8")) as T[];
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw e;
    }
  }
  async function write(file: string, rows: unknown[]) {
    await mkdir(/* turbopackIgnore: true */ dir, { recursive: true });
    await writeFile(/* turbopackIgnore: true */ `${file}.tmp`, JSON.stringify(rows, null, 2), { mode: 0o600 });
    await rename(/* turbopackIgnore: true */ `${file}.tmp`, /* turbopackIgnore: true */ file);
  }
  // Writes run one at a time so two quick replies can't overwrite each other.
  function serial<T>(job: () => Promise<T>): Promise<T> {
    const run = queue.then(job);
    queue = run.catch(() => undefined);
    return run;
  }
  const withInvite = (r: RsvpRecord): RsvpRecord => ({ ...r, inviteId: r.inviteId ?? null });

  return {
    kind: "file",
    save(input: RsvpInput, inviteId: string | null) {
      return serial(async () => {
        const all = (await read<RsvpRecord>(rsvpFile)).map(withInvite);
        const now = new Date().toISOString();
        const same = (r: RsvpRecord) => (inviteId !== null && r.inviteId === inviteId) || phoneKey(r.phone) === input.phoneKey;
        const earlier = all.filter(same).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        const first = earlier[0];
        const next: RsvpRecord = {
          id: first?.id ?? randomUUID(),
          createdAt: first?.createdAt ?? now,
          updatedAt: now,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          attending: input.attending === "accept",
          guestCount: input.guestCount,
          events: input.events,
          dietary: input.dietary,
          dietaryNotes: input.dietaryNotes,
          message: input.message,
          inviteId: inviteId ?? earlier.find((r) => r.inviteId)?.inviteId ?? null,
        };
        await write(rsvpFile, [next, ...all.filter((r) => !same(r))]);
      });
    },
    async list() {
      return (await read<RsvpRecord>(rsvpFile)).map(withInvite).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async listInvites() {
      return (await read<InviteRecord>(inviteFile)).sort((a, b) => a.family.localeCompare(b.family));
    },
    async findInvite(token: string) {
      return (await read<InviteRecord>(inviteFile)).find((i) => i.token === token) ?? null;
    },
    addInvites(items: InviteInput[]) {
      return serial(async () => {
        const all = await read<InviteRecord>(inviteFile);
        const now = new Date().toISOString();
        const added = items.map((it) => ({ id: randomUUID(), token: newToken(), family: it.family, phone: it.phone, maxGuests: it.maxGuests, createdAt: now }));
        await write(inviteFile, [...all, ...added]);
        return added;
      });
    },
    deleteInvite(id: string) {
      return serial(async () => {
        await write(inviteFile, (await read<InviteRecord>(inviteFile)).filter((i) => i.id !== id));
        const rsvps = (await read<RsvpRecord>(rsvpFile)).map(withInvite);
        if (rsvps.some((r) => r.inviteId === id)) await write(rsvpFile, rsvps.map((r) => (r.inviteId === id ? { ...r, inviteId: null } : r)));
      });
    },
  };
}
