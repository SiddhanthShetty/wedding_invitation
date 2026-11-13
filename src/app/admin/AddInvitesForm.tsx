"use client";

import { useActionState, useEffect, useState } from "react";
import { addInvites, type AddInvitesState } from "./invite-actions";

export function AddInvitesForm({ maxPerInvite }: { maxPerInvite: number }) {
  const [state, action, pending] = useActionState<AddInvitesState, FormData>(addInvites, { added: [], errors: [] });
  // Kept in state so a list with one mistake isn't wiped: it's cleared only once the families are added.
  const [text, setText] = useState("");
  useEffect(() => {
    if (state.added.length) setText("");
  }, [state]);
  return (
    <form action={action} className="border border-gold/70 bg-ivory p-4 sm:p-5">
      <label htmlFor="families" className="label">
        Add families
      </label>
      <p id="families-hint" className="mb-2 text-[1rem] text-maroon/75">
        One family per line: the name they&rsquo;ll be greeted by, then a phone number and the number of guests if you like (up to {maxPerInvite}). For example:
        <span className="mt-1 block font-label text-[0.92rem] text-gold-deep">Rao family, +91 98765 43210, 4</span>
      </p>
      <textarea id="families" name="families" rows={4} value={text} onChange={(e) => setText(e.target.value)} className="field font-label text-[0.98rem]" aria-describedby="families-hint" placeholder={"Rao family, +91 98765 43210, 4\nAsha Aunty & Uncle"} />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-maroon">
          {pending ? "Adding" : "Add to guest list"}
        </button>
        <div aria-live="polite">
          {state.added.length ? (
            <p className="text-leaf">
              Added {state.added.length === 1 ? state.added[0] : `${state.added.length} families`}.
            </p>
          ) : null}
        </div>
      </div>
      {state.errors.length ? (
        <div role="alert" className="mt-3 border border-[#8E1B16]/50 bg-[#FBEDEA] px-3 py-2 text-[#8E1B16]">
          <p>Nothing was added. Fix these lines and try again:</p>
          <ul className="mt-1 list-disc pl-5">
            {state.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  );
}
