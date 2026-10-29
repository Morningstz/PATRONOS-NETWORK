"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/app/actions/public";

/** Small form wrapper for admin server actions: shows success/error inline, disables while pending. */
export function ActionForm({
  action,
  fields,
  children,
  submitLabel,
  variant = "outline",
  confirm,
  className = "",
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  fields?: Record<string, string>;
  children?: ReactNode;
  submitLabel: string;
  variant?: "outline" | "solid" | "gold" | "danger";
  confirm?: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { ok: false });
  const pathname = usePathname();
  const params = new URLSearchParams(useSearchParams());
  params.delete("notice");
  const returnTo = params.size ? `${pathname}?${params}` : pathname;
  const cls = variant === "solid" ? "btn-solid" : variant === "gold" ? "btn-gold" : variant === "danger" ? "border border-danger/50 text-danger hover:bg-danger/10" : "btn-outline";
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <input type="hidden" name="returnTo" value={returnTo} />
      {fields && Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
      <button type="submit" disabled={pending} className={`btn !min-h-9 !px-4 !text-[12px] ${cls}`}>
        {pending ? "…" : submitLabel}
      </button>
      {state.error && <p role="alert" className="mt-1 text-[12px] text-danger">{state.error}</p>}
      {state.ok && state.message && <p role="status" className="mt-1 text-[12px] text-success">{state.message}</p>}
    </form>
  );
}
