import { z } from "zod";
import { phoneKey } from "@/lib/phone";

/** A family on the guest list, with its own invitation link. */
export interface InviteRecord {
  id: string;
  /** The random part of the family's link: https://…/?i=<token> */
  token: string;
  /** How the family is greeted, e.g. "Rao family" or "Asha Aunty & Uncle". */
  family: string;
  /** For the WhatsApp button. Empty when not given. */
  phone: string;
  /** Most guests this family may bring, or null for the site-wide limit. */
  maxGuests: number | null;
  createdAt: string;
}

export const TOKEN_PATTERN = /^[A-Za-z0-9]{10,32}$/;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** 12 characters from a 56-letter alphabet: about 70 bits, so links can't be guessed. */
export function newToken(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  let out = "";
  while (out.length < 12) {
    for (const b of random(16)) {
      // Rejection sampling keeps every character equally likely.
      if (b < 224 && out.length < 12) out += ALPHABET[b % 56];
    }
  }
  return out;
}

export const inviteInputSchema = z.object({
  family: z.string().trim().min(1, "Add the family's name.").max(80, "Keep the name under 80 characters."),
  phone: z
    .string()
    .trim()
    .default("")
    .refine((p) => p === "" || /^\+?[0-9][0-9 ()-]{6,19}$/.test(p), "That phone number doesn't look right."),
  maxGuests: z.number().int().min(1).max(20).nullable().default(null),
});
export type InviteInput = z.output<typeof inviteInputSchema>;

/**
 * Reads the admin's guest-list box: one family per line,
 *   name, phone (optional), number of guests (optional)
 * e.g. "Rao family, +91 98765 43210, 4". Blank lines are ignored.
 */
export function parseInviteLines(text: string, maxPerInvite: number): { items: InviteInput[]; errors: string[] } {
  const items: InviteInput[] = [];
  const errors: string[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length > 3) {
      errors.push(`Line ${i + 1}: use at most two commas (name, phone, guests). Leave commas out of the name.`);
      return;
    }
    const [family = "", phone = "", guests = ""] = parts;
    let maxGuests: number | null = null;
    if (guests) {
      const n = Number(guests);
      if (!Number.isInteger(n) || n < 1 || n > maxPerInvite) {
        errors.push(`Line ${i + 1} (${family || "no name"}): number of guests should be 1 to ${maxPerInvite}.`);
        return;
      }
      maxGuests = n;
    }
    const parsed = inviteInputSchema.safeParse({ family, phone, maxGuests });
    if (!parsed.success) {
      errors.push(`Line ${i + 1} (${family || "no name"}): ${parsed.error.issues[0]?.message}`);
      return;
    }
    items.push(parsed.data);
  });
  return { items, errors };
}

/** wa.me link that opens WhatsApp with the message ready to send. */
export function whatsappInviteUrl(invite: Pick<InviteRecord, "phone">, message: string): string {
  const to = invite.phone ? phoneKey(invite.phone).replace(/^\+/, "") : "";
  return `https://wa.me/${to}?text=${encodeURIComponent(message)}`;
}

export function inviteLink(base: string, token: string): string {
  return `${base.replace(/\/+$/, "")}/?i=${token}`;
}

export function inviteMessage(family: string, link: string, couple: string): string {
  return `Dear ${family},\n\nWith the blessings of our families, we warmly invite you to the wedding of ${couple}.\n\nYour invitation, with the events, directions and a place to reply: ${link}`;
}

export function reminderMessage(family: string, link: string, couple: string): string {
  return `Dear ${family},\n\nA gentle reminder from ${couple}: please let us know if you can join us. It only takes a minute: ${link}`;
}
