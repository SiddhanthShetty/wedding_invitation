import type { RsvpRecord } from "@/lib/storage/types";

function cell(value: string | number | boolean): string {
  let s = String(value);
  // Stop spreadsheet apps from running guest-typed text as a formula.
  // Plain phone numbers such as "+91 98765 43210" are left as they are.
  const formulaLike = /^[=@\t\r]/.test(s) || (/^[+\-]/.test(s) && !/^[+\-]?[\d\s().-]+$/.test(s));
  if (formulaLike) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(records: RsvpRecord[], events: { id: string; name: string }[], invites: { id: string; family: string }[] = []): string {
  const family = (id: string | null) => (id ? (invites.find((i) => i.id === id)?.family ?? "") : "");
  const header = ["Submitted", "Updated", "Name", "Family link", "Email", "Phone", "Attending", "Guests", ...events.map((e) => e.name), "Dietary", "Dietary notes", "Message"];
  const rows = records.map((r) => [
    r.createdAt,
    r.updatedAt,
    r.fullName,
    family(r.inviteId),
    r.email,
    r.phone,
    r.attending ? "Yes" : "No",
    r.guestCount,
    ...events.map((e) => (r.attending && r.events.includes(e.id) ? r.guestCount : 0)),
    r.dietary,
    r.dietaryNotes,
    r.message,
  ]);
  // BOM so Excel opens names in Kannada, Tulu or other scripts correctly.
  return "﻿" + [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
