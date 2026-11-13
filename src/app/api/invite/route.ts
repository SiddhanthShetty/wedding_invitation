import { NextResponse } from "next/server";
import { TOKEN_PATTERN } from "@/lib/invites";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Looks up a family's invitation link (?t=<token>). Returns only what the page
 * shows to that family: the name they're greeted by and their guest limit.
 * Never the phone number or anything about other families.
 */
export async function GET(request: Request) {
  const limit = rateLimit(`invite:${clientIp(request.headers)}`, 30, 10 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });

  const token = new URL(request.url).searchParams.get("t") ?? "";
  if (!TOKEN_PATTERN.test(token)) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const store = getStore();
  if (!store) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const invite = await store.findInvite(token);
    if (!invite) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ family: invite.family, maxGuests: invite.maxGuests });
  } catch (e) {
    console.error("[invite] lookup failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Not available." }, { status: 503 });
  }
}
