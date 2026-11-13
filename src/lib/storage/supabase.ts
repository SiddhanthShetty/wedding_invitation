import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { newToken, type InviteInput, type InviteRecord } from "@/lib/invites";
import type { RsvpInput } from "@/lib/rsvp-schema";
import type { RsvpRecord, RsvpStore } from "./types";

type Row = {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string;
  email: string | null;
  phone: string;
  attending: boolean;
  guest_count: number;
  events: string[];
  dietary: string;
  dietary_notes: string;
  message: string;
  invite_id: string | null;
};

type InviteRow = { id: string; created_at: string; token: string; family: string; phone: string; max_guests: number | null };

const toInvite = (r: InviteRow): InviteRecord => ({ id: r.id, token: r.token, family: r.family, phone: r.phone ?? "", maxGuests: r.max_guests, createdAt: r.created_at });

let client: SupabaseClient | null = null;

export function supabaseStore(url: string, serviceKey: string): RsvpStore {
  client ??= createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const db = client;
  const fail = (what: string, error: { message: string } | null) => {
    if (error) throw new Error(`Supabase ${what} failed: ${error.message}`);
  };

  return {
    kind: "supabase",
    async save(input: RsvpInput, inviteId: string | null) {
      const values = {
        full_name: input.fullName,
        email: input.email || null,
        phone: input.phone,
        phone_key: input.phoneKey,
        attending: input.attending === "accept",
        guest_count: input.guestCount,
        events: input.events,
        dietary: input.dietary,
        dietary_notes: input.dietaryNotes,
        message: input.message,
        updated_at: new Date().toISOString(),
      };
      // Earlier replies from this family's link or this phone number.
      const found: { id: string; created_at: string; invite_id: string | null }[] = [];
      const byPhone = await db.from("rsvps").select("id, created_at, invite_id").eq("phone_key", input.phoneKey);
      fail("lookup", byPhone.error);
      found.push(...(byPhone.data ?? []));
      if (inviteId) {
        const byInvite = await db.from("rsvps").select("id, created_at, invite_id").eq("invite_id", inviteId);
        fail("lookup", byInvite.error);
        for (const r of byInvite.data ?? []) if (!found.some((f) => f.id === r.id)) found.push(r);
      }
      found.sort((a, b) => a.created_at.localeCompare(b.created_at));
      const [keep, ...extra] = found;
      if (extra.length) fail("merge", (await db.from("rsvps").delete().in("id", extra.map((r) => r.id))).error);
      const linked = inviteId ?? found.find((r) => r.invite_id)?.invite_id ?? null;
      if (keep) fail("update", (await db.from("rsvps").update({ ...values, invite_id: linked }).eq("id", keep.id)).error);
      else fail("save", (await db.from("rsvps").insert({ ...values, invite_id: linked })).error);
    },
    async list(): Promise<RsvpRecord[]> {
      const { data, error } = await db.from("rsvps").select("*").order("created_at", { ascending: false }).limit(5000);
      fail("read", error);
      return ((data ?? []) as Row[]).map((r) => ({
        id: r.id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        fullName: r.full_name,
        email: r.email ?? "",
        phone: r.phone,
        attending: r.attending,
        guestCount: r.guest_count,
        events: r.events ?? [],
        dietary: r.dietary,
        dietaryNotes: r.dietary_notes ?? "",
        message: r.message ?? "",
        inviteId: r.invite_id ?? null,
      }));
    },
    async listInvites() {
      const { data, error } = await db.from("invites").select("*").order("family").limit(5000);
      fail("read invites", error);
      return ((data ?? []) as InviteRow[]).map(toInvite);
    },
    async findInvite(token: string) {
      const { data, error } = await db.from("invites").select("*").eq("token", token).maybeSingle();
      fail("read invite", error);
      return data ? toInvite(data as InviteRow) : null;
    },
    async addInvites(items: InviteInput[]) {
      const rows = items.map((it) => ({ token: newToken(), family: it.family, phone: it.phone, max_guests: it.maxGuests }));
      const { data, error } = await db.from("invites").insert(rows).select("*");
      fail("add invites", error);
      return ((data ?? []) as InviteRow[]).map(toInvite);
    },
    async deleteInvite(id: string) {
      fail("delete invite", (await db.from("invites").delete().eq("id", id)).error);
    },
  };
}
