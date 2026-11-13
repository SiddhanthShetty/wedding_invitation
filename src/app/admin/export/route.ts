import { cookies } from "next/headers";
import { weddingConfig } from "@/config/wedding";
import { toCsv } from "@/lib/csv";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { getStore } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value)) {
    return new Response("Not signed in.", { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const store = getStore();
  if (!store) return new Response("RSVP storage is not configured.", { status: 503 });
  try {
    const [records, invites] = await Promise.all([store.list(), store.listInvites()]);
    const csv = toCsv(records, weddingConfig.events.map((e) => ({ id: e.id, name: e.name })), invites);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rsvps-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[admin] export failed:", e instanceof Error ? e.message : e);
    return new Response("The responses could not be loaded.", { status: 502 });
  }
}
