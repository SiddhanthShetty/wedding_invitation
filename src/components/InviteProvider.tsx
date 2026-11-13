"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Invite = { token: string; family: string; maxGuests: number | null };

const Ctx = createContext<Invite | null>(null);

/** The family whose personal link (…/?i=<token>) opened the page, or null. */
export function useInvite(): Invite | null {
  return useContext(Ctx);
}

const KEY = "ss-invite";

export function InviteProvider({ children }: { children: ReactNode }) {
  const [invite, setInvite] = useState<Invite | null>(null);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("i");
    let token = fromUrl;
    if (!token) {
      try {
        token = window.sessionStorage.getItem(KEY);
      } catch {
        /* storage unavailable */
      }
    }
    if (!token || !/^[A-Za-z0-9]{10,32}$/.test(token)) return;
    let cancelled = false;
    fetch(`/api/invite?t=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ family: string; maxGuests: number | null }>) : null))
      .then((data) => {
        if (cancelled || !data) return;
        setInvite({ token: token!, family: data.family, maxGuests: data.maxGuests });
        try {
          window.sessionStorage.setItem(KEY, token!);
        } catch {
          /* ignore */
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return <Ctx.Provider value={invite}>{children}</Ctx.Provider>;
}

/** "Dear Rao family," above the invitation, for guests who arrive through their own link. */
export function Greeting({ className = "" }: { className?: string }) {
  const invite = useInvite();
  if (!invite) return null;
  return <p className={`animate-[rise_0.8s_ease-out_both] font-display text-[1.45rem] italic ${className}`}>Dear {invite.family},</p>;
}
