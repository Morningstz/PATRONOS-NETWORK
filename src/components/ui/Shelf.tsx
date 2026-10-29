"use client";

import Link from "next/link";
import { useId, useRef, type ReactNode } from "react";

/** Curated horizontal row: scroll-snap, swipe, keyboard (track is focusable), arrow buttons on desktop. */
export function Shelf({
  eyebrow,
  title,
  href,
  hrefLabel = "View all",
  children,
  empty,
}: {
  eyebrow: string;
  title: string;
  href?: string;
  hrefLabel?: string;
  children: ReactNode;
  empty?: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const headingId = useId();

  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <section aria-labelledby={headingId} className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 md:py-14 lg:px-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">{eyebrow}</p>
          <h2 id={headingId} className="display text-[1.75rem] sm:text-[2.25rem]">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {href && (
            <Link href={href} className="link-gold mr-2 hidden text-[12px] tracking-[0.2em] uppercase sm:inline">
              {hrefLabel} →
            </Link>
          )}
          <button type="button" onClick={() => scroll(-1)} aria-label={`Scroll ${title} left`} className="glass hidden size-11 place-items-center md:grid" style={{ borderRadius: 9999 }}>
            <span aria-hidden="true">←</span>
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label={`Scroll ${title} right`} className="glass hidden size-11 place-items-center md:grid" style={{ borderRadius: 9999 }}>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
      {empty ? (
        <p className="panel px-6 py-10 text-center text-muted">Nothing here yet — check back soon.</p>
      ) : (
        <div ref={track} tabIndex={0} role="region" aria-label={`${title} — scroll horizontally`} className="shelf-track pb-2">
          {children}
        </div>
      )}
      {href && (
        <Link href={href} className="link-gold mt-4 inline-block text-[12px] tracking-[0.2em] uppercase sm:hidden">
          {hrefLabel} →
        </Link>
      )}
    </section>
  );
}
