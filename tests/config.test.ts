import { describe, expect, it } from "vitest";
import { EVENT_IDS, configSchema, coupleNames, weddingConfig } from "@/config/wedding";
import { directionsUrl, weddingInstant } from "@/lib/wedding";

const withEvents = (patch: (events: typeof weddingConfig.events) => void) => {
  const copy = structuredClone(weddingConfig);
  patch(copy.events);
  return copy;
};

describe("wedding config", () => {
  it("names the couple exactly as on the invitation", () => {
    expect(coupleNames).toBe("Sweekruti & Siddhanth");
    expect(weddingConfig.monogram).toBe("SS");
  });

  it("lists the six events in the agreed order", () => {
    expect(weddingConfig.events.map((e) => e.name)).toEqual(["Engagement", "Haldi", "Mehendi", "Sangeet", "Muhuratham", "Reception"]);
    expect(weddingConfig.events.map((e) => e.id)).toEqual([...EVENT_IDS]);
  });

  it("rejects events in the wrong order", () => {
    const bad = withEvents((ev) => ev.reverse());
    expect(configSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects malformed dates and times", () => {
    expect(configSchema.safeParse({ ...weddingConfig, weddingDate: "14/02/2027" }).success).toBe(false);
    expect(configSchema.safeParse({ ...weddingConfig, weddingDate: "2027-02-14", weddingTime: "10.30am" }).success).toBe(false);
    expect(configSchema.safeParse({ ...weddingConfig, timezone: "Mangalore/Time" }).success).toBe(false);
  });

  it("does not ship invented dates or venues", () => {
    expect(weddingConfig.weddingDate).toBeNull();
    for (const e of weddingConfig.events) {
      expect(e.date).toBeNull();
      expect(e.venue).toBeNull();
    }
  });
});

describe("venues and directions", () => {
  const venue = { name: "Example Hall", address: "1 Sample Road, Mangaluru 575001", mapsUrl: null };

  it("builds a Google Maps directions link from the name and address", () => {
    const url = new URL(directionsUrl(venue));
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/dir/");
    expect(url.searchParams.get("destination")).toBe("Example Hall, 1 Sample Road, Mangaluru 575001");
  });

  it("prefers a pasted Google Maps link", () => {
    expect(directionsUrl({ ...venue, mapsUrl: "https://maps.app.goo.gl/abc" })).toBe("https://maps.app.goo.gl/abc");
  });
});

describe("countdown target", () => {
  it("is null until a date is set", () => {
    expect(weddingInstant()).toBeNull();
  });

  it("uses India time for the wedding date and time", () => {
    const at = weddingInstant({ ...weddingConfig, weddingDate: "2027-02-14", weddingTime: "10:30" });
    expect(at?.toISOString()).toBe("2027-02-14T05:00:00.000Z");
  });

  it("falls back to the Muhuratham start time, then midnight", () => {
    const cfg = withEvents((ev) => {
      ev[4]!.date = "2027-02-14";
      ev[4]!.startTime = "09:15";
    });
    expect(weddingInstant({ ...cfg, weddingDate: "2027-02-14" })?.toISOString()).toBe("2027-02-14T03:45:00.000Z");
    expect(weddingInstant({ ...weddingConfig, weddingDate: "2027-02-14" })?.toISOString()).toBe("2027-02-13T18:30:00.000Z");
  });
});

describe("good to know", () => {
  it("ships empty, so nothing invented appears to guests", () => {
    expect(Object.values(weddingConfig.goodToKnow).every((v) => v === null)).toBe(true);
  });
  it("only accepts a usable hashtag", () => {
    const g = (hashtag: string) => configSchema.safeParse({ ...weddingConfig, goodToKnow: { ...weddingConfig.goodToKnow, hashtag } }).success;
    expect(g("#SweekrutiWedsSiddhanth")).toBe(true);
    expect(g("SweekrutiWedsSiddhanth")).toBe(true);
    expect(g("#two words")).toBe(false);
  });
});

describe("music", () => {
  it("points at a file that exists, with its credit", async () => {
    const { existsSync } = await import("node:fs");
    const path = await import("node:path");
    expect(existsSync(path.join(process.cwd(), "public", weddingConfig.music.src))).toBe(true);
    expect(weddingConfig.music.credit).toBe("NirvanaSutra Music");
    // The licence-free fallback stays available.
    expect(existsSync(path.join(process.cwd(), "public", "audio", "hamsadhwani.mp3"))).toBe(true);
  });
});
