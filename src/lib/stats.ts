import type { RsvpRecord } from "@/lib/storage/types";

export interface RsvpStats {
  responses: number;
  accepted: number;
  declined: number;
  totalGuests: number;
  byEvent: { id: string; name: string; parties: number; guests: number }[];
}

export function computeStats(records: RsvpRecord[], events: { id: string; name: string }[]): RsvpStats {
  const coming = records.filter((r) => r.attending);
  return {
    responses: records.length,
    accepted: coming.length,
    declined: records.length - coming.length,
    totalGuests: coming.reduce((n, r) => n + r.guestCount, 0),
    byEvent: events.map((e) => {
      const at = coming.filter((r) => r.events.includes(e.id));
      return { id: e.id, name: e.name, parties: at.length, guests: at.reduce((n, r) => n + r.guestCount, 0) };
    }),
  };
}
