"use client";

import { useActionState } from "react";
import { submitClaim, type FormState } from "@/app/actions/public";
import { Turnstile } from "./Turnstile";

export function ClaimForm({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitClaim, { ok: false });
  if (state.ok) return <p role="status" className="rounded-2xl border border-[var(--gold-line)] bg-[var(--gold-tint)] p-4 text-[14px] text-gold-hover">{state.message}</p>;
  return (
    <form action={action} className="space-y-4" noValidate aria-describedby="claim-help">
      <p id="claim-help" className="text-[13px] text-muted">
        Work at {companyName}? Claim the profile to manage it. A moderator reviews every claim; claiming does not make a company “Verified”.
      </p>
      <input type="hidden" name="companyId" value={companyId} />
      <div>
        <label htmlFor="claim-email" className="label">
          Work email
        </label>
        <input id="claim-email" name="workEmail" type="email" required autoComplete="email" className="field" aria-invalid={!!state.fieldErrors?.workEmail} aria-describedby={state.fieldErrors?.workEmail ? "claim-email-err" : undefined} />
        {state.fieldErrors?.workEmail && <p id="claim-email-err" className="mt-1 text-[13px] text-danger">{state.fieldErrors.workEmail}</p>}
      </div>
      <div>
        <label htmlFor="claim-role" className="label">
          Your role
        </label>
        <input id="claim-role" name="roleTitle" required maxLength={120} className="field" aria-invalid={!!state.fieldErrors?.roleTitle} aria-describedby={state.fieldErrors?.roleTitle ? "claim-role-err" : undefined} />
        {state.fieldErrors?.roleTitle && <p id="claim-role-err" className="mt-1 text-[13px] text-danger">{state.fieldErrors.roleTitle}</p>}
      </div>
      <div>
        <label htmlFor="claim-msg" className="label">
          Anything we should know? <span className="normal-case tracking-normal text-faint">(optional)</span>
        </label>
        <textarea id="claim-msg" name="message" rows={3} maxLength={2000} className="field !rounded-2xl" />
      </div>
      <Turnstile />
      {state.error && <p role="alert" className="text-[13px] text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn-solid w-full">
        {pending ? "Submitting…" : "Submit claim"}
      </button>
    </form>
  );
}
