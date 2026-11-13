import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "ss_admin";
export const SESSION_TTL_SEC = 60 * 60 * 8;

export function adminConfigStatus(env = process.env): { ok: true } | { ok: false; reason: string } {
  const password = env.ADMIN_PASSWORD ?? "";
  // The live site needs a real passphrase; testing on your own computer can use a short one.
  if (env.NODE_ENV === "production" && password.length < 12) return { ok: false, reason: "ADMIN_PASSWORD is missing or shorter than 12 characters." };
  if (!password) return { ok: false, reason: "ADMIN_PASSWORD is missing." };
  if ((env.SESSION_SECRET ?? "").length < 32) return { ok: false, reason: "SESSION_SECRET is missing or shorter than 32 characters." };
  return { ok: true };
}

const digest = (s: string) => createHash("sha256").update(s).digest();

export function passwordMatches(attempt: string, env = process.env): boolean {
  if (!adminConfigStatus(env).ok) return false;
  return timingSafeEqual(digest(attempt), digest(env.ADMIN_PASSWORD!));
}

const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("base64url");

export function createSessionToken(now = Date.now(), env = process.env): string {
  const exp = String(Math.floor(now / 1000) + SESSION_TTL_SEC);
  return `${exp}.${sign(exp, env.SESSION_SECRET!)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now(), env = process.env): boolean {
  if (!token || !adminConfigStatus(env).ok) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp)) return false;
  const expected = Buffer.from(sign(exp, env.SESSION_SECRET!));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  return Number(exp) * 1000 > now;
}
