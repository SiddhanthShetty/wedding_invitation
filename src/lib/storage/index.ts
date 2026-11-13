import "server-only";
import { fileStore } from "./file";
import { supabaseStore } from "./supabase";
import type { RsvpStore } from "./types";

export type { InviteRecord, RsvpRecord, RsvpStore } from "./types";

/**
 * Returns the RSVP store, or null when none is configured. Callers must treat
 * null as "cannot accept RSVPs" and say so; nothing is ever silently dropped.
 */
export function getStore(): RsvpStore | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (url && key) return supabaseStore(url, key);
  if (process.env.RSVP_STORAGE === "file" && process.env.NODE_ENV !== "production") return fileStore();
  return null;
}
