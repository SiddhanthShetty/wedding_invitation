"use client";

import { CircleCheck, LoaderCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { DIETARY_OPTIONS, MAX_GUESTS, fieldErrors, rsvpSchema, type RsvpFieldErrors } from "@/lib/rsvp-schema";
import { useInvite } from "./InviteProvider";
import { SectionHeading } from "./Section";

type EventOption = { id: string; name: string };
type Status = { kind: "idle" } | { kind: "sending" } | { kind: "error"; message: string } | { kind: "done"; attending: boolean; name: string };

const STORAGE_KEY = "ss-rsvp-sent";

function Err({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="mt-1.5 text-[1rem] text-[#8E1B16]">
      {message}
    </p>
  ) : null;
}

export function Rsvp({ events, respondBy }: { events: EventOption[]; respondBy: string | null }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [attending, setAttending] = useState<"accept" | "decline" | "">("");
  const [errors, setErrors] = useState<RsvpFieldErrors>({});
  const form = useRef<HTMLFormElement>(null);
  const result = useRef<HTMLDivElement>(null);
  const sending = useRef(false);
  const invite = useInvite();
  const maxGuests = Math.min(MAX_GUESTS, invite?.maxGuests ?? MAX_GUESTS);

  // Someone who has already replied on this device sees their confirmation, not an empty form.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const s = JSON.parse(saved) as { attending: boolean; name: string };
        setStatus({ kind: "done", attending: !!s.attending, name: String(s.name ?? "") });
      }
    } catch {
      /* storage unavailable: show the form */
    }
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending.current) return; // a second tap while the first is in flight
    const data = new FormData(e.currentTarget);
    const payload = {
      fullName: String(data.get("fullName") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      attending: String(data.get("attending") ?? ""),
      guestCount: String(data.get("guestCount") ?? "0"),
      events: data.getAll("events").map(String),
      dietary: String(data.get("dietary") ?? "none"),
      message: String(data.get("message") ?? ""),
      website: String(data.get("website") ?? ""),
      invite: invite?.token,
    };

    const checked = rsvpSchema.safeParse(payload);
    if (!checked.success) {
      const found = fieldErrors(checked.error);
      setErrors(found);
      setStatus({ kind: "error", message: "Please check the highlighted fields." });
      const first = Object.keys(found)[0];
      if (first) (form.current?.querySelector(`[name="${first}"]`) as HTMLElement | null)?.focus();
      return;
    }

    sending.current = true;
    setErrors({});
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/rsvp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = (await res.json().catch(() => ({}))) as { error?: string; fields?: RsvpFieldErrors };
      if (!res.ok) {
        if (body.fields) setErrors(body.fields);
        setStatus({ kind: "error", message: body.error ?? "Your response could not be saved. Please try again." });
        return;
      }
      const done = { attending: checked.data.attending === "accept", name: checked.data.fullName.split(" ")[0] ?? "" };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
      } catch {
        /* ignore */
      }
      setStatus({ kind: "done", ...done });
      requestAnimationFrame(() => result.current?.focus());
    } catch {
      setStatus({ kind: "error", message: "We could not reach the server. Please check your connection and try again." });
    } finally {
      sending.current = false;
    }
  }

  // Once a guest edits a field, its error message goes away.
  function clearError(e: FormEvent<HTMLFormElement>) {
    const name = (e.target as HTMLInputElement).name as keyof RsvpFieldErrors;
    if (!name || !errors[name]) return;
    const rest = { ...errors };
    delete rest[name];
    setErrors(rest);
    if (Object.keys(rest).length === 0 && status.kind === "error") setStatus({ kind: "idle" });
  }

  function startOver() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setAttending("");
    setStatus({ kind: "idle" });
  }

  const busy = status.kind === "sending";
  const describe = (name: keyof RsvpFieldErrors) => (errors[name] ? { "aria-invalid": true as const, "aria-describedby": `err-${name}` } : {});

  return (
    <section id="rsvp" aria-labelledby="rsvp-title" className="bg-paper px-5 py-20 sm:py-28">
      <SectionHeading
        id="rsvp-title"
        title="Will You Join Us?"
        lead={respondBy ? `Please let us know by ${respondBy}.` : "Please let us know if you can come, so we can plan a proper welcome."}
      />
      <div className="mx-auto max-w-2xl border border-gold bg-ivory p-5 shadow-[0_14px_40px_-24px_rgba(94,11,18,0.45)] sm:p-9">
        <AnimatePresence mode="wait" initial={false}>
          {status.kind === "done" ? (
            <motion.div key="done" ref={result} tabIndex={-1} role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-6 text-center outline-none">
              <CircleCheck className="mx-auto size-12 text-leaf" aria-hidden="true" />
              <h3 className="mt-4 font-display text-[2rem] leading-tight font-medium">
                Thank you{status.name ? `, ${status.name}` : ""}. Your response is saved.
              </h3>
              <p className="mx-auto mt-3 max-w-md text-maroon/85">
                {status.attending ? "We are so glad you can come, and we look forward to celebrating with you." : "We will miss you, and we are grateful for your blessings."}
              </p>
              <button type="button" onClick={startOver} className="btn btn-line mt-6">
                Change my response
              </button>
            </motion.div>
          ) : (
            <motion.form key="form" ref={form} onSubmit={onSubmit} onInput={clearError} onChange={clearError} noValidate initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {invite ? (
                <p className="border-l-2 border-gold bg-parchment/60 px-3 py-2">
                  Replying for <span className="font-semibold">{invite.family}</span>
                  {invite.maxGuests ? ` (up to ${invite.maxGuests} ${invite.maxGuests === 1 ? "guest" : "guests"})` : ""}.
                </p>
              ) : null}
              <p className="text-[1rem] text-maroon/75">Fields marked with * are needed.</p>
              <div>
                <label htmlFor="fullName" className="label">
                  Full name *
                </label>
                <input id="fullName" name="fullName" className="field" autoComplete="name" maxLength={120} required {...describe("fullName")} />
                <Err id="err-fullName" message={errors.fullName} />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="phone" className="label">
                    Phone number *
                  </label>
                  <input id="phone" name="phone" type="tel" inputMode="tel" className="field" autoComplete="tel" maxLength={20} required placeholder="+91 98765 43210" aria-describedby={errors.phone ? "err-phone" : "hint-phone"} aria-invalid={errors.phone ? true : undefined} />
                  {errors.phone ? <Err id="err-phone" message={errors.phone} /> : <p id="hint-phone" className="mt-1.5 text-[0.95rem] text-maroon/70">To change your reply later, use the same number.</p>}
                </div>
                <div>
                  <label htmlFor="email" className="label">
                    Email address <span className="text-maroon/70">(optional)</span>
                  </label>
                  <input id="email" name="email" type="email" inputMode="email" className="field" autoComplete="email" maxLength={254} {...describe("email")} />
                  <Err id="err-email" message={errors.email} />
                </div>
              </div>

              <fieldset {...(errors.attending ? { "aria-describedby": "err-attending" } : {})}>
                <legend className="label">Will you be able to come? *</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["accept", "Joyfully accepts"],
                      ["decline", "Regretfully declines"],
                    ] as const
                  ).map(([value, text]) => (
                    <label
                      key={value}
                      className={`flex min-h-12 cursor-pointer items-center gap-3 border px-4 py-2.5 ${attending === value ? "border-maroon bg-parchment" : "border-gold-deep/50"}`}
                    >
                      <input type="radio" name="attending" value={value} checked={attending === value} onChange={() => setAttending(value)} className="size-5 accent-maroon" required />
                      {text}
                    </label>
                  ))}
                </div>
                <Err id="err-attending" message={errors.attending} />
              </fieldset>

              {attending === "accept" ? (
                <>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="guestCount" className="label">
                        Number of guests, including you *
                      </label>
                      <select id="guestCount" name="guestCount" className="field" defaultValue="1" {...describe("guestCount")}>
                        {Array.from({ length: maxGuests }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1}
                          </option>
                        ))}
                      </select>
                      <Err id="err-guestCount" message={errors.guestCount} />
                    </div>
                    <div>
                      <label htmlFor="dietary" className="label">
                        Dietary preference
                      </label>
                      <select id="dietary" name="dietary" className="field" defaultValue="none">
                        {DIETARY_OPTIONS.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <fieldset {...(errors.events ? { "aria-describedby": "err-events" } : {})}>
                    <legend className="label">Which events will you attend? *</legend>
                    <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-3">
                      {events.map((ev) => (
                        <label key={ev.id} className="flex min-h-12 cursor-pointer items-center gap-3 border border-gold-deep/50 px-3 py-2 has-checked:border-maroon has-checked:bg-parchment">
                          <input type="checkbox" name="events" value={ev.id} className="size-5 accent-maroon" />
                          {ev.name}
                        </label>
                      ))}
                    </div>
                    <Err id="err-events" message={errors.events} />
                  </fieldset>
                </>
              ) : null}

              <div>
                <label htmlFor="message" className="label">
                  A message for the couple <span className="text-maroon/70">(optional)</span>
                </label>
                <textarea id="message" name="message" rows={4} className="field" maxLength={1000} aria-describedby={errors.message ? "err-message" : "hint-message"} aria-invalid={errors.message ? true : undefined} />
                {errors.message ? null : <p id="hint-message" className="mt-1.5 text-[0.95rem] text-maroon/70">Add any allergies or access needs here too.</p>}
                <Err id="err-message" message={errors.message} />
              </div>

              {/* Bots fill this in; people never see it. */}
              <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                <label htmlFor="website">Leave this field empty</label>
                <input id="website" name="website" tabIndex={-1} autoComplete="off" />
              </div>

              <div aria-live="assertive">
                {status.kind === "error" ? (
                  <p role="alert" className="border border-[#8E1B16]/50 bg-[#FBEDEA] px-4 py-3 text-[#8E1B16]">
                    {status.message}
                  </p>
                ) : null}
              </div>

              <button type="submit" disabled={busy} className="btn btn-maroon w-full sm:w-auto">
                {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
                {busy ? "Sending your response" : "Send my response"}
              </button>
              <p className="text-[0.98rem] text-maroon/70">Your details go only to the couple and their families, and are used only to plan the wedding.</p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
