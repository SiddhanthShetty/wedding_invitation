"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { SESSION_COOKIE, SESSION_TTL_SEC, adminConfigStatus, createSessionToken, passwordMatches } from "@/lib/session";

export type LoginState = { error: string | null };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!adminConfigStatus().ok) return { error: "The admin area is not set up yet." };
  const ip = clientIp(await headers());
  const limit = rateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.ok) return { error: `Too many attempts. Try again in ${Math.ceil(limit.retryAfterSec / 60)} minutes.` };

  const attempt = String(formData.get("password") ?? "");
  if (!passwordMatches(attempt)) return { error: "That passphrase is not right." };

  (await cookies()).set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: SESSION_TTL_SEC,
  });
  redirect("/admin");
}

export async function logout(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/admin", maxAge: 0 });
  redirect("/admin");
}
