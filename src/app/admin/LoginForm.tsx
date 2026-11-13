"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null });
  return (
    <form action={action} className="mx-auto mt-8 max-w-sm space-y-4 border border-gold/70 bg-ivory p-6">
      <div>
        <label htmlFor="password" className="label">
          Passphrase
        </label>
        <input id="password" name="password" type="password" className="field" autoComplete="current-password" required aria-describedby={state.error ? "login-error" : undefined} />
      </div>
      {state.error ? (
        <p id="login-error" role="alert" className="text-[#8E1B16]">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="btn btn-maroon w-full">
        {pending ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}
