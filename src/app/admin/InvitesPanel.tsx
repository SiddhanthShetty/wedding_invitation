import { MessageCircle, Trash2 } from "lucide-react";
import { coupleNames, weddingConfig } from "@/config/wedding";
import { inviteLink, inviteMessage, reminderMessage, whatsappInviteUrl, type InviteRecord } from "@/lib/invites";
import type { RsvpRecord } from "@/lib/storage";
import { CopyLink } from "@/components/CopyLink";
import { AddInvitesForm } from "./AddInvitesForm";
import { removeInvite } from "./invite-actions";

export function InvitesPanel({ invites, records, base, localOnly }: { invites: InviteRecord[]; records: RsvpRecord[]; base: string; localOnly: boolean }) {
  const replyFor = (id: string) => records.find((r) => r.inviteId === id);
  const rows = invites
    .map((inv) => ({ inv, reply: replyFor(inv.id), link: inviteLink(base, inv.token) }))
    .sort((a, b) => Number(!!a.reply) - Number(!!b.reply) || a.inv.family.localeCompare(b.inv.family));
  const replied = rows.filter((r) => r.reply).length;

  return (
    <section aria-labelledby="invites-title" className="mt-10">
      <h2 id="invites-title" className="font-label text-[1.1rem]">
        Guest list and personal links
      </h2>
      <p className="mt-1 max-w-3xl text-maroon/80">
        Each family gets its own link. It greets them by name, and their reply shows up against their name here, so you can see who still needs a reminder.
      </p>
      {localOnly ? (
        <p className="mt-3 max-w-3xl border border-gold bg-champagne/40 px-3 py-2 text-[1rem]">
          These links point to this computer, so they&rsquo;ll only work for you. Once the site is live (with <code>NEXT_PUBLIC_SITE_URL</code> set), the same families get links to the real address automatically.
        </p>
      ) : null}

      <dl className="mt-4 grid grid-cols-3 gap-3">
        {[
          ["Families invited", invites.length],
          ["Replied", replied],
          ["Not yet replied", invites.length - replied],
        ].map(([label, value]) => (
          <div key={label} className="border border-gold/70 bg-ivory px-4 py-3">
            <dt className="font-label text-[0.9rem] text-gold-deep">{label}</dt>
            <dd className="font-display text-[2rem] leading-none font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4">
        <AddInvitesForm maxPerInvite={weddingConfig.rsvp.maxGuestsPerInvite} />
      </div>

      {rows.length ? (
        <div className="mt-4 overflow-x-auto border border-gold/70 bg-ivory">
          <table className="w-full min-w-[52rem] text-left text-[1.02rem]">
            <thead className="font-label text-[0.9rem] text-gold-deep">
              <tr>
                {["Family", "Phone", "Guests", "Reply", "Send"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2.5 font-normal">
                    {h}
                  </th>
                ))}
                <th scope="col" className="px-3 py-2.5">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ inv, reply, link }) => (
                <tr key={inv.id} className="border-t border-gold/30 align-middle">
                  <th scope="row" className="px-3 py-2.5 font-semibold">
                    {inv.family}
                  </th>
                  <td className="px-3 py-2.5 whitespace-nowrap">{inv.phone}</td>
                  <td className="px-3 py-2.5 tabular-nums">{inv.maxGuests ?? ""}</td>
                  <td className="px-3 py-2.5">
                    {reply ? (
                      <span className="text-leaf">{reply.attending ? `Accepts, ${reply.guestCount}` : "Declines"}</span>
                    ) : (
                      <span className="text-maroon/70 italic">Not yet</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={whatsappInviteUrl(inv, inviteMessage(inv.family, link, coupleNames))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-line min-h-10 px-3 py-1.5 text-[0.92rem]"
                      >
                        <MessageCircle className="size-4" aria-hidden="true" />
                        Invite<span className="sr-only"> {inv.family} on WhatsApp</span>
                      </a>
                      {!reply ? (
                        <a
                          href={whatsappInviteUrl(inv, reminderMessage(inv.family, link, coupleNames))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-line min-h-10 px-3 py-1.5 text-[0.92rem]"
                        >
                          Remind<span className="sr-only"> {inv.family} on WhatsApp</span>
                        </a>
                      ) : null}
                      <CopyLink url={link} label="Copy link" className="btn btn-line min-h-10 px-3 py-1.5 text-[0.92rem]" />
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <form action={removeInvite}>
                      <input type="hidden" name="id" value={inv.id} />
                      <button type="submit" className="grid size-10 place-items-center rounded-sm text-maroon/70 hover:bg-gold/15 hover:text-maroon" aria-label={`Remove ${inv.family} from the guest list`}>
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
