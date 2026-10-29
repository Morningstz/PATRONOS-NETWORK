"use client";

import { useActionState } from "react";
import { submitInquiry, type FormState } from "@/app/actions/public";
import { Turnstile } from "./Turnstile";

export function InquiryForm({ artworkId, title }: { artworkId: string; title: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitInquiry, { ok: false });
  if (state.ok) return <p role="status" className="rounded-2xl border border-[var(--gold-line)] bg-[var(--gold-tint)] p-4 text-[14px] text-gold-hover">{state.message}</p>;
  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="artworkId" value={artworkId} />
      <label htmlFor="inq-msg" className="label">
        Your message about “{title}”
      </label>
      <textarea id="inq-msg" name="message" rows={4} required minLength={10} maxLength={2000} placeholder="Tell the artist what interests you — viewing, price, shipping, a commission…" className="field !rounded-2xl" aria-invalid={!!state.fieldErrors?.message} aria-describedby={state.fieldErrors?.message ? "inq-err" : undefined} />
      {state.fieldErrors?.message && <p id="inq-err" className="text-[13px] text-danger">{state.fieldErrors.message}</p>}
      <Turnstile />
      {state.error && !state.fieldErrors?.message && <p role="alert" className="text-[13px] text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn-solid w-full">
        {pending ? "Sending…" : "Send inquiry"}
      </button>
      <p className="text-[12px] text-faint">PATRONOS does not process payments, escrow or shipping for art in this version.</p>
    </form>
  );
}
