/**
 * The public address of the invitation. The QR code and every share link are
 * built from this and nothing else, so a localhost, file:// or preview address
 * can never end up printed on a card.
 */
export type SiteUrlResult = { ok: true; url: string } | { ok: false; reason: string };

const PRIVATE_HOST = /^(localhost|.*\.local|.*\.localhost|.*\.internal|.*\.test)$/i;
const IP_LITERAL = /^(\d{1,3}\.){3}\d{1,3}$|^\[.*\]$/;
// Per-deployment and per-branch preview hosts on Vercel and Netlify.
const PREVIEW_HOST = [
  /-git-[a-z0-9-]+\.vercel\.app$/i,
  /-(?=[a-z0-9]*\d)[a-z0-9]{9}-[a-z0-9-]+\.vercel\.app$/i,
  /--[a-z0-9-]+\.netlify\.app$/i,
];

export function parseProductionUrl(raw: string | undefined | null): SiteUrlResult {
  const value = (raw ?? "").trim();
  if (!value) return { ok: false, reason: "NEXT_PUBLIC_SITE_URL is not set." };
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return { ok: false, reason: "NEXT_PUBLIC_SITE_URL is not a valid URL." };
  }
  if (u.protocol !== "https:") return { ok: false, reason: "The site URL must start with https://." };
  if (u.username || u.password) return { ok: false, reason: "The site URL must not contain credentials." };
  if (PRIVATE_HOST.test(u.hostname) || IP_LITERAL.test(u.hostname) || !u.hostname.includes(".")) {
    return { ok: false, reason: "The site URL points at a local or private address." };
  }
  if (PREVIEW_HOST.some((p) => p.test(u.hostname))) {
    return { ok: false, reason: "The site URL looks like a temporary preview deployment." };
  }
  const path = u.pathname.replace(/\/+$/, "");
  return { ok: true, url: `${u.origin}${path}` };
}

export const siteUrl: SiteUrlResult = parseProductionUrl(process.env.NEXT_PUBLIC_SITE_URL);
export const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";
