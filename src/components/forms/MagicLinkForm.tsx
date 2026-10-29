"use client";

import { useActionState } from "react";
import { sendMagicLink } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/public";
import { Turnstile } from "./Turnstile";

export function MagicLinkForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendMagicLink, { ok: false });
  if (state.ok) return <p role="status" className="text-center text-gold-hover">{state.message}</p>;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="ml-email" className="label">Email</label>
        <input id="ml-email" name="email" type="email" required autoComplete="email" className="field" />
      </div>
      <Turnstile />
      {state.error && <p role="alert" className="text-[13px] text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn-solid w-full">{pending ? "Sending…" : "Email me a sign-in link"}</button>
    </form>
  );
}
