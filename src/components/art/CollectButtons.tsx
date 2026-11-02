"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setFollowed, setSaved } from "@/app/actions/collect";

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path d="M12 20.5s-7.5-4.4-9.3-9.2C1.4 7.8 3.6 4.5 7 4.5c2 0 3.5 1.1 5 2.9 1.5-1.8 3-2.9 5-2.9 3.4 0 5.6 3.3 4.3 6.8-1.8 4.8-9.3 9.2-9.3 9.2Z" strokeLinejoin="round" />
    </svg>
  );
}

export function SaveButton({ artworkId, initial, signedIn, next, compact = false }: { artworkId: string; initial: boolean; signedIn: boolean; next: string; compact?: boolean }) {
  const [on, setOn] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!signedIn) {
    return (
      <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className={compact ? "grid size-11 place-items-center rounded-full border border-white/15 text-ink hover:border-gold" : "btn btn-outline"} aria-label="Sign in to save this work">
        <Heart filled={false} />
        {!compact && "Save"}
      </Link>
    );
  }
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        aria-pressed={on}
        aria-label={on ? "Remove from saved" : "Save this work"}
        disabled={pending}
        onClick={() => {
          const next = !on;
          setOn(next);
          setErr(null);
          start(async () => {
            const r = await setSaved(artworkId, next);
            if (!r.ok) {
              setOn(!next);
              setErr(r.error);
            }
          });
        }}
        className={compact ? `grid size-11 place-items-center rounded-full border transition-colors ${on ? "border-gold text-gold-hover" : "border-white/15 text-ink hover:border-gold"}` : `btn ${on ? "btn-gold" : "btn-outline"}`}
      >
        <Heart filled={on} />
        {!compact && (on ? "Saved" : "Save")}
      </button>
      {err && (
        <span role="alert" className="mt-1 text-[12px] text-[var(--danger)]">
          {err}
        </span>
      )}
    </span>
  );
}

export function FollowButton({ artistId, initial, signedIn, next }: { artistId: string; initial: boolean; signedIn: boolean; next: string }) {
  const [on, setOn] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!signedIn) {
    return (
      <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className="btn btn-outline">
        Follow
      </Link>
    );
  }
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        aria-pressed={on}
        disabled={pending}
        className={`btn ${on ? "btn-gold" : "btn-outline"}`}
        onClick={() => {
          const n = !on;
          setOn(n);
          setErr(null);
          start(async () => {
            const r = await setFollowed(artistId, n);
            if (!r.ok) {
              setOn(!n);
              setErr(r.error);
            }
          });
        }}
      >
        {on ? "Following" : "Follow"}
      </button>
      {err && (
        <span role="alert" className="mt-1 text-[12px] text-[var(--danger)]">
          {err}
        </span>
      )}
    </span>
  );
}
