/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE ONE FILE TO EDIT
 *
 *  Every name, family line, date, time, venue and the music on the
 *  site comes from `weddingDetails` below. Leave a value as `null` until it is
 *  known and the site shows a tasteful "to be announced" in its place.
 *
 *  Dates are "YYYY-MM-DD", times are 24-hour "HH:MM", both in `timezone`.
 *  The file is checked when the site builds; a typo stops the build with a
 *  message naming the field.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { z } from "zod";

export const EVENT_IDS = ["engagement", "haldi", "mehendi", "sangeet", "muhuratham", "reception"] as const;
export type EventId = (typeof EVENT_IDS)[number];

const isoDate = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Use YYYY-MM-DD");
const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM");
const text = z.string().trim().min(1);

const venueSchema = z.object({
  name: text,
  /** Complete postal address, as you would write it on an envelope. */
  address: text,
  /** Optional: paste a Google Maps share link. If null, a directions link is built from the name and address. */
  mapsUrl: z.url().nullable().default(null),
});

const eventSchema = z
  .object({
    id: z.enum(EVENT_IDS),
    name: text,
    date: isoDate.nullable(),
    startTime: clockTime.nullable(),
    endTime: clockTime.nullable(),
    venue: venueSchema.nullable(),
    description: text.nullable(),
    dressCode: text.nullable(),
  })
  .refine((e) => !(e.endTime && !e.startTime), { message: "endTime needs a startTime", path: ["endTime"] })
  .refine((e) => !(e.startTime && !e.date), { message: "startTime needs a date", path: ["startTime"] });

const trackSchema = z.object({
  title: text,
  /** Path under /public, e.g. "/audio/wedding-music.mp3". Replace the file or change the path. */
  src: z.string().startsWith("/"),
  credit: text,
});

const familiesSchema = z.object({
  /** Full names as they should appear in the formal line, e.g. "Sweekruti Shetty". null uses brideName / groomName. */
  brideFullName: text.nullable(),
  groomFullName: text.nullable(),
  /** The bride's parents, written exactly as they should appear, e.g. "Mr Ramesh Shetty and Mrs Sudha Shetty". */
  brideParents: text.nullable(),
  /** The groom's parents, written the same way. */
  groomParents: text.nullable(),
  /**
   * Grandparents, shown under "With the blessings of" at the top of the card, one pair per line.
   * null leaves that side out for guests (the local preview shows a reminder to fill it in).
   */
  brideGrandparents: z.array(text).min(1).nullable(),
  groomGrandparents: z.array(text).min(1).nullable(),
});

const configSchema = z
  .object({
    brideName: text,
    groomName: text,
    families: familiesSchema,
    monogram: text,
    /** The wedding day (the Muhuratham). Drives the countdown. */
    weddingDate: isoDate.nullable(),
    /** Time the countdown runs to. If null, the Muhuratham start time is used, else midnight. */
    weddingTime: clockTime.nullable(),
    timezone: z.string().refine((tz) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "Unknown timezone"),
    location: text,
    events: z.array(eventSchema).length(6),
    /** Short practical notes for guests. Each one appears only once it's filled in. */
    goodToKnow: z.object({
      weather: text.nullable(),
      dressCode: text.nullable(),
      hashtag: z.string().trim().regex(/^#?[A-Za-z0-9_]{2,60}$/, "Letters, numbers and _ only, e.g. #SweekrutiWedsSiddhanth").nullable(),
      parking: text.nullable(),
      driversAndStaff: text.nullable(),
    }),
    contact: z.object({ name: text.nullable(), phone: text.nullable(), email: z.email().nullable() }),
    rsvp: z.object({ maxGuestsPerInvite: z.number().int().min(1).max(20), respondBy: isoDate.nullable() }),
    music: trackSchema,
  })
  .refine((c) => c.events.every((e, i) => e.id === EVENT_IDS[i]), {
    message: `events must stay in this order: ${EVENT_IDS.join(", ")}`,
    path: ["events"],
  })
  .refine((c) => !(c.weddingTime && !c.weddingDate), { message: "weddingTime needs a weddingDate", path: ["weddingTime"] });

export type WeddingConfigInput = z.input<typeof configSchema>;
export type WeddingConfig = z.output<typeof configSchema>;
export type WeddingEvent = WeddingConfig["events"][number];
export type Venue = NonNullable<WeddingEvent["venue"]>;
export type Track = WeddingConfig["music"];
export type Families = WeddingConfig["families"];

const weddingDetails: WeddingConfigInput = {
  brideName: "Sweekruti",
  groomName: "Siddhanth",
  monogram: "SS",

  // The formal "request the honour of your presence" lines. Until the parents' names are filled in,
  // the section uses a version that names only the couple.
  families: {
    brideFullName: null, // e.g. "Sweekruti Shetty"
    groomFullName: null, // e.g. "Siddhanth Shetty"
    brideParents: "Mr Krishna Gambhir and Mrs Vanita Gambhir",
    groomParents: "Mr Chandrahas Shetty and Mrs Ramita Shetty",
    brideGrandparents: null, // to be added, e.g. ["Mr … and Mrs …", "Mr … and Mrs …"]
    groomGrandparents: ["Vasu and Gulabi Shetty", "Vasu and Sakubai Shetty"],
  },

  weddingDate: null, // e.g. "2027-02-14"
  weddingTime: null, // e.g. "10:30"
  timezone: "Asia/Kolkata",
  location: "Mangaluru, Karnataka, India",


  // Keep these six in this order. Fill in each as details are confirmed.
  events: [
    {
      id: "engagement",
      name: "Engagement",
      date: null,
      startTime: null,
      endTime: null,
      venue: null, // e.g. { name: "…", address: "…", mapsUrl: null }
      description: "Rings, blessings and the first promise, with both our families gathered around us.",
      dressCode: null,
    },
    {
      id: "haldi",
      name: "Haldi",
      date: null,
      startTime: null,
      endTime: null,
      venue: null,
      description: "Turmeric, marigolds and a good deal of laughter. Wear something you don't mind turning yellow.",
      dressCode: null,
    },
    {
      id: "mehendi",
      name: "Mehendi",
      date: null,
      startTime: null,
      endTime: null,
      venue: null,
      description: "An unhurried afternoon of henna, songs and stories.",
      dressCode: null,
    },
    {
      id: "sangeet",
      name: "Sangeet",
      date: null,
      startTime: null,
      endTime: null,
      venue: null,
      description: "An evening of music and dance from both sides of the family.",
      dressCode: null,
    },
    {
      id: "muhuratham",
      name: "Muhuratham",
      date: null,
      startTime: null,
      endTime: null,
      venue: null,
      description: "The wedding ceremony, at the auspicious hour, in the presence of our elders.",
      dressCode: null,
    },
    {
      id: "reception",
      name: "Reception",
      date: null,
      startTime: null,
      endTime: null,
      venue: null,
      description: "Dinner, good company and a chance for us to thank you in person.",
      dressCode: null,
    },
  ],

  // "Good to know": short notes for guests. Leave any as null to leave it out.
  goodToKnow: {
    weather: null, // e.g. "Warm and humid, around 32 °C in the day. Light cottons are best."
    dressCode: null, // e.g. "Traditional wear for the Muhuratham; colours of your choice for the Sangeet."
    hashtag: null, // e.g. "#SweekrutiWedsSiddhanth"
    parking: null, // e.g. "Free parking at the venue; attendants will guide you."
    driversAndStaff: null, // e.g. "Rooms and meals for drivers are arranged at …"
  },

  contact: { name: null, phone: null, email: null },

  rsvp: { maxGuestsPerInvite: 6, respondBy: null },

  // The background music. It plays only when a guest presses the play button in the top bar,
  // and loops until they pause it. To use your own recording (one you have the rights to),
  // put the file in public/audio and point `src` at it.
  music: {
    title: "Mangala Arambha (Raga Hamsadhwani, veena)",
    src: "/audio/hamsadhwani.mp3",
    credit: "Original piece synthesised for this invitation",
  },

};

function load(): WeddingConfig {
  const parsed = configSchema.safeParse(weddingDetails);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  • ${i.path.join(".") || "(config)"}: ${i.message}`);
    throw new Error(`src/config/wedding.ts has a problem:\n${lines.join("\n")}`);
  }
  return parsed.data;
}

export const weddingConfig = load();
export { configSchema };

export const coupleNames = `${weddingConfig.brideName} & ${weddingConfig.groomName}`;
