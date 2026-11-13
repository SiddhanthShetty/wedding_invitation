"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { weddingConfig } from "@/config/wedding";
import { parseInviteLines } from "@/lib/invites";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { getStore } from "@/lib/storage";

async function signedIn(): Promise<boolean> {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export type AddInvitesState = { added: string[]; errors: string[] };

export async function addInvites(_prev: AddInvitesState, formData: FormData): Promise<AddInvitesState> {
  if (!(await signedIn())) return { added: [], errors: ["Your session has ended. Sign in again."] };
  const store = getStore();
  if (!store) return { added: [], errors: ["No storage is connected, so the guest list can't be saved yet."] };

  const text = String(formData.get("families") ?? "");
  if (text.length > 50_000) return { added: [], errors: ["That's too much at once. Add up to a few hundred families at a time."] };
  const { items, errors } = parseInviteLines(text, weddingConfig.rsvp.maxGuestsPerInvite);
  if (!items.length && !errors.length) return { added: [], errors: ["Type at least one family name."] };
  // All or nothing: fix the listed lines and try again, so nobody is added twice.
  if (errors.length) return { added: [], errors };
  try {
    const added = await store.addInvites(items);
    revalidatePath("/admin");
    return { added: added.map((a) => a.family), errors: [] };
  } catch (e) {
    console.error("[admin] add invites failed:", e instanceof Error ? e.message : e);
    return { added: [], errors: ["The guest list couldn't be saved. Check that the database migration 0003 has been run."] };
  }
}

export async function removeInvite(formData: FormData): Promise<void> {
  if (!(await signedIn())) return;
  const id = String(formData.get("id") ?? "");
  const store = getStore();
  if (!store || !/^[0-9a-f-]{36}$/i.test(id)) return;
  await store.deleteInvite(id);
  revalidatePath("/admin");
}
