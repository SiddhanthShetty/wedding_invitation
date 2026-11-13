import { weddingConfig, type Venue } from "@/config/wedding";
import { zonedDateTimeToUtc } from "./datetime";

export function directionsUrl(venue: Venue): string {
  if (venue.mapsUrl) return venue.mapsUrl;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${venue.name}, ${venue.address}`)}`;
}

/** Instant the countdown runs to, or null while the date is unannounced. */
export function weddingInstant(config = weddingConfig): Date | null {
  if (!config.weddingDate) return null;
  const muhuratham = config.events.find((e) => e.id === "muhuratham");
  const time =
    config.weddingTime ?? (muhuratham?.date === config.weddingDate ? muhuratham.startTime : null) ?? "00:00";
  return zonedDateTimeToUtc(config.weddingDate, time, config.timezone);
}
