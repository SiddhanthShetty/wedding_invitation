import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { TOKEN_PATTERN } from "@/lib/invites";
import { fieldErrors, rsvpSchema } from "@/lib/rsvp-schema";
import { getStore } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8 * 1024;

const json = (body: object, status: number, headers?: HeadersInit) => NextResponse.json(body, { status, headers });

export async function POST(request: Request) {
  // Only accept posts from the invitation itself.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin) {
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      /* malformed origin falls through to the rejection below */
    }
    if (!originHost || originHost !== host) return json({ error: "This request did not come from the invitation." }, 403);
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "Unsupported content type." }, 415);
  }

  const limit = rateLimit(`rsvp:${clientIp(request.headers)}`, 6, 10 * 60 * 1000);
  if (!limit.ok) {
    return json({ error: "Too many attempts. Please wait a few minutes and try again." }, 429, { "Retry-After": String(limit.retryAfterSec) });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: "That message is too long." }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "The form could not be read. Please try again." }, 400);
  }
  if (typeof body !== "object" || body === null) return json({ error: "The form could not be read. Please try again." }, 400);

  // Hidden field that people never see or fill in. A filled one is a bot; tell it nothing useful.
  if (typeof (body as Record<string, unknown>).website === "string" && (body as Record<string, string>).website !== "") {
    return json({ ok: true }, 200);
  }

  const parsed = rsvpSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) }, 422);
  }

  const store = getStore();
  if (!store) {
    console.error("[rsvp] No RSVP storage is configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    return json({ error: "RSVPs cannot be saved just yet. Please try again later, or reply to the family directly." }, 503);
  }

  // A reply through a family's own link is tied to that family, within its guest limit.
  // An unknown or removed link still lets the guest reply, just without the family tie.
  let inviteId: string | null = null;
  const token = (body as Record<string, unknown>).invite;
  if (typeof token === "string" && TOKEN_PATTERN.test(token)) {
    try {
      const invite = await store.findInvite(token);
      if (invite) {
        if (invite.maxGuests !== null && parsed.data.guestCount > invite.maxGuests) {
          const message = `This invitation is for up to ${invite.maxGuests} ${invite.maxGuests === 1 ? "guest" : "guests"}.`;
          return json({ error: "Please check the highlighted fields.", fields: { guestCount: message } }, 422);
        }
        inviteId = invite.id;
      }
    } catch (e) {
      console.error("[rsvp] invite lookup failed:", e instanceof Error ? e.message : e);
    }
  }

  try {
    await store.save(parsed.data, inviteId);
  } catch (e) {
    console.error("[rsvp] save failed:", e instanceof Error ? e.message : e);
    return json({ error: "Your response could not be saved. Please try again in a moment." }, 502);
  }
  return json({ ok: true }, 201);
}
