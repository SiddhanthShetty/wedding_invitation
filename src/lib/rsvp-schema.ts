import { z } from "zod";
import { EVENT_IDS, weddingConfig } from "@/config/wedding";
import { phoneKey } from "@/lib/phone";

export const DIETARY_OPTIONS = [
  { value: "none", label: "No preference" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "non-vegetarian", label: "Non-vegetarian" },
  { value: "jain", label: "Jain" },
  { value: "vegan", label: "Vegan" },
  { value: "other", label: "Other (tell us below)" },
] as const;

const dietaryValues = DIETARY_OPTIONS.map((d) => d.value) as [string, ...string[]];
export const MAX_GUESTS = weddingConfig.rsvp.maxGuestsPerInvite;

// Strip control characters so nothing odd reaches the database or the CSV export.
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
const line = (max: number) => z.string().transform(clean).pipe(z.string().max(max));

export const rsvpSchema = z
  .object({
    fullName: z.string().transform(clean).pipe(z.string().min(2, "Please enter your full name.").max(120)),
    // Optional: guests who reply from WhatsApp often skip it.
    email: z
      .string()
      .default("")
      .transform((s) => clean(s).toLowerCase())
      .pipe(z.union([z.literal(""), z.email("Please enter a valid email address, or leave it empty.").max(254)])),
    phone: z
      .string()
      .transform(clean)
      .pipe(z.string().regex(/^\+?[0-9][0-9 ()-]{6,19}$/, "Please enter a valid phone number.")),
    attending: z.enum(["accept", "decline"], "Please let us know if you can come."),
    guestCount: z.coerce.number().int().min(0).max(MAX_GUESTS, `Up to ${MAX_GUESTS} guests per invitation.`).default(0),
    events: z.array(z.enum(EVENT_IDS)).max(EVENT_IDS.length).default([]),
    dietary: z.enum(dietaryValues).default("none"),
    dietaryNotes: line(300).default(""),
    message: line(1000).default(""),
  })
  .superRefine((v, ctx) => {
    if (v.attending !== "accept") return;
    if (v.guestCount < 1) ctx.addIssue({ code: "custom", path: ["guestCount"], message: "Please tell us how many of you are coming." });
    if (v.events.length < 1) ctx.addIssue({ code: "custom", path: ["events"], message: "Please choose at least one event." });
  })
  .transform((v) => ({
    ...v,
    phoneKey: phoneKey(v.phone),
    events: v.attending === "accept" ? [...new Set(v.events)] : [],
    guestCount: v.attending === "accept" ? v.guestCount : 0,
    dietary: v.attending === "accept" ? v.dietary : "none",
    dietaryNotes: v.attending === "accept" ? v.dietaryNotes : "",
  }));

export type RsvpInput = z.output<typeof rsvpSchema>;
export type RsvpFieldErrors = Partial<Record<keyof RsvpInput, string>>;

export function fieldErrors(error: z.ZodError): RsvpFieldErrors {
  const out: RsvpFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof RsvpInput | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
