import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { coupleNames, weddingConfig } from "@/config/wedding";
import { SESSION_COOKIE, adminConfigStatus, verifySessionToken } from "@/lib/session";
import { computeStats } from "@/lib/stats";
import { getStore, type InviteRecord, type RsvpRecord } from "@/lib/storage";
import { siteUrl } from "@/lib/site-url";
import { Seal } from "@/components/Monogram";
import { logout } from "./actions";
import { InvitesPanel } from "./InvitesPanel";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Guests and replies", robots: { index: false, follow: false } };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-svh bg-paper px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3">
          <Seal className="size-12" />
          <div>
            <h1 className="font-display text-[1.9rem] leading-tight font-medium">Guests and replies</h1>
            <p className="font-label text-[0.9rem] text-gold-deep">{coupleNames}</p>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-gold/70 bg-ivory px-4 py-4">
      <dt className="font-label text-[0.9rem] text-gold-deep">{label}</dt>
      <dd className="font-display text-[2.4rem] leading-none font-medium tabular-nums">{value}</dd>
    </div>
  );
}

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: weddingConfig.timezone, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

export default async function AdminPage() {
  const configured = adminConfigStatus();
  if (!configured.ok) {
    return (
      <Shell>
        <p className="mt-8 max-w-xl border border-gold/70 bg-ivory p-5">
          The admin area is switched off until it is set up. {configured.reason} Add both values to the site&rsquo;s environment variables, then redeploy. The README explains how.
        </p>
      </Shell>
    );
  }

  const signedIn = verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!signedIn) {
    return (
      <Shell>
        <p className="mt-6 max-w-xl">Sign in to see who is coming. This page is private to the couple.</p>
        <LoginForm />
      </Shell>
    );
  }

  const store = getStore();
  let records: RsvpRecord[] = [];
  let invites: InviteRecord[] = [];
  let problem: string | null = null;
  if (!store) problem = "No RSVP storage is connected yet. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then redeploy.";
  else {
    try {
      [records, invites] = await Promise.all([store.list(), store.listInvites()]);
    } catch (e) {
      console.error("[admin] list failed:", e instanceof Error ? e.message : e);
      problem = "The responses could not be loaded from the database. Check the Supabase settings and that the migration has been run.";
    }
  }

  const events = weddingConfig.events.map((e) => ({ id: e.id, name: e.name }));
  const stats = computeStats(records, events);
  const eventName = (id: string) => events.find((e) => e.id === id)?.name ?? id;
  const familyName = (id: string | null) => (id ? (invites.find((i) => i.id === id)?.family ?? "") : "");

  // Family links use the live address once it's set; until then, this computer's address.
  const h = await headers();
  const localBase = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"}`;
  const base = siteUrl.ok ? siteUrl.url : localBase;

  return (
    <Shell>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <a href="/admin/export" className={`btn btn-maroon ${records.length ? "" : "pointer-events-none opacity-50"}`} aria-disabled={!records.length}>
          Download CSV
        </a>
        <form action={logout}>
          <button type="submit" className="btn btn-line">
            Sign out
          </button>
        </form>
        {store?.kind === "file" ? <span className="text-[1rem] text-maroon/70">Development storage (the .data folder)</span> : null}
      </div>

      {problem ? (
        <p role="alert" className="mt-6 max-w-2xl border border-[#8E1B16]/50 bg-[#FBEDEA] p-4 text-[#8E1B16]">
          {problem}
        </p>
      ) : null}

      <h2 className="mt-10 font-label text-[1.1rem]">Attendance</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Responses" value={stats.responses} />
        <Stat label="Accepted" value={stats.accepted} />
        <Stat label="Declined" value={stats.declined} />
        <Stat label="Guests coming" value={stats.totalGuests} />
      </dl>

      {store ? <InvitesPanel invites={invites} records={records} base={base} localOnly={!siteUrl.ok} /> : null}

      <h2 className="mt-10 font-label text-[1.1rem]">Guests by event</h2>
      <div className="mt-3 overflow-x-auto border border-gold/70 bg-ivory">
        <table className="w-full min-w-[26rem] text-left">
          <thead className="font-label text-[0.9rem] text-gold-deep">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-normal">Event</th>
              <th scope="col" className="px-4 py-2.5 text-right font-normal">Parties</th>
              <th scope="col" className="px-4 py-2.5 text-right font-normal">Guests</th>
            </tr>
          </thead>
          <tbody>
            {stats.byEvent.map((e) => (
              <tr key={e.id} className="border-t border-gold/30">
                <th scope="row" className="px-4 py-2.5 font-medium">{e.name}</th>
                <td className="px-4 py-2.5 text-right tabular-nums">{e.parties}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{e.guests}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 font-label text-[1.1rem]">All responses</h2>
      {records.length === 0 ? (
        <p className="mt-3 text-maroon/75">No responses yet. They will appear here as guests reply.</p>
      ) : (
        <div className="mt-3 overflow-x-auto border border-gold/70 bg-ivory">
          <table className="w-full min-w-[66rem] text-left text-[1.02rem]">
            <thead className="font-label text-[0.9rem] text-gold-deep">
              <tr>
                {["Name", "Family link", "Contact", "Reply", "Guests", "Events", "Food", "Message", "Received"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2.5 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t border-gold/30 align-top">
                  <th scope="row" className="px-3 py-2.5 font-semibold">{r.fullName}</th>
                  <td className="px-3 py-2.5">{familyName(r.inviteId)}</td>
                  <td className="px-3 py-2.5">
                    <span className="block">{r.phone}</span>
                    {r.email ? <span className="block break-all">{r.email}</span> : null}
                  </td>
                  <td className="px-3 py-2.5">{r.attending ? "Accepts" : "Declines"}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.attending ? r.guestCount : ""}</td>
                  <td className="px-3 py-2.5">{r.events.map(eventName).join(", ")}</td>
                  <td className="px-3 py-2.5">
                    {r.attending && r.dietary !== "none" ? r.dietary : ""}
                    {r.dietaryNotes ? <span className="block text-maroon/75">{r.dietaryNotes}</span> : null}
                  </td>
                  <td className="max-w-[18rem] px-3 py-2.5 whitespace-pre-wrap">{r.message}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{when(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
