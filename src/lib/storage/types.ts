import type { InviteInput, InviteRecord } from "@/lib/invites";
import type { RsvpInput } from "@/lib/rsvp-schema";

export type { InviteRecord } from "@/lib/invites";

export interface RsvpRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  fullName: string;
  /** Empty when the guest didn't give one. */
  email: string;
  phone: string;
  attending: boolean;
  guestCount: number;
  events: string[];
  dietary: string;
  dietaryNotes: string;
  message: string;
  /** The family invitation this reply came through, if any. */
  inviteId: string | null;
}

export interface RsvpStore {
  readonly kind: "supabase" | "file";
  /**
   * Insert a reply, or replace the earlier one from the same family link or
   * the same phone number (both are merged into one if they differ).
   */
  save(input: RsvpInput, inviteId: string | null): Promise<void>;
  list(): Promise<RsvpRecord[]>;

  listInvites(): Promise<InviteRecord[]>;
  findInvite(token: string): Promise<InviteRecord | null>;
  addInvites(items: InviteInput[]): Promise<InviteRecord[]>;
  /** Removes the family from the guest list. Their reply, if any, is kept. */
  deleteInvite(id: string): Promise<void>;
}
