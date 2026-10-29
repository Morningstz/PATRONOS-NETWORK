"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { subscribeDigest, type FormState } from "@/app/actions/public";

export function NewsletterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(subscribeDigest, { ok: false });
  const id = useId();
  if (state.ok) {
    return <p role="status" className="text-[14px] text-gold-hover">{state.message}</p>;
  }
  return (
    <form action={action} className="space-y-3" noValidate>
      <div className="relative">
        <label htmlFor={`${id}-email`} className="sr-only">
          Email address
        </label>
        <input id={`${id}-email`} name="email" type="email" required autoComplete="email" placeholder="you@company.com" className="field !rounded-full !bg-white/[0.04] pr-14" />
        <button type="submit" disabled={pending} aria-label="Subscribe to the digest" className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-gold text-[#0a0a0a] transition-colors hover:bg-gold-hover">
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <label className="flex items-start gap-2.5 text-[12px] text-muted">
        <input type="checkbox" name="consent" required className="mt-0.5 size-4 accent-[var(--gold)]" />
        <span>I agree to receive the PATRONOS Digest. Unsubscribe anytime. See our <Link href="/legal/privacy" className="link-gold underline">privacy notice</Link>.</span>
      </label>
      {state.error && <p role="alert" className="text-[13px] text-danger">{state.error}</p>}
    </form>
  );
}
