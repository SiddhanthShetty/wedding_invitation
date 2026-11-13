"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";

export function CopyLink({ url, className = "btn btn-line", label = "Copy invitation link" }: { url: string; className?: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2500);
  }
  return (
    <button type="button" onClick={copy} className={className}>
      {state === "copied" ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
      <span aria-live="polite">{state === "copied" ? "Link copied" : state === "failed" ? "Could not copy. Press and hold the link instead." : label}</span>
    </button>
  );
}

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-maroon">
      Print this page
    </button>
  );
}
