"use client";

import { useState } from "react";

type Placement = { key: string; name: string; description: string; priceCents: number; currency: string; durationDays: number; capacity: number; location: string };

const REACH: Record<string, string> = { HOMEPAGE_SHELF: "All homepage visitors", DIRECTORY_SPOTLIGHT: "One country or industry directory", COUNTRY_FEATURE: "One country page + Digest" };

export function PricingToggle({ placements }: { placements: Placement[] }) {
  const [length, setLength] = useState<1 | 2>(1); // 1 = 2 weeks, 2 = 1 month
  const featured = "homepage-shelf";
  const ordered = [...placements].sort((a, b) => a.priceCents - b.priceCents);
  // Put the featured card in the middle for a three-card layout
  const mid = ordered.findIndex((p) => p.key === featured);
  if (ordered.length === 3 && mid !== 1 && mid >= 0) ordered.splice(1, 0, ordered.splice(mid, 1)[0]!);

  return (
    <div>
      <div className="mb-10 flex justify-center">
        <div role="radiogroup" aria-label="Campaign length" className="glass inline-flex p-1" style={{ borderRadius: 9999 }}>
          {([
            [1, "2 weeks"],
            [2, "1 month"],
          ] as const).map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={length === v} onClick={() => setLength(v)} className={`min-h-10 rounded-full px-5 text-[13px] font-semibold transition-colors ${length === v ? "bg-white text-black" : "text-muted hover:text-ink"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {ordered.map((p) => {
          const isFeatured = p.key === featured;
          const price = (p.priceCents * length) / 100;
          return (
            <article key={p.key} className={`glass relative flex flex-col p-7 ${isFeatured ? "md:-translate-y-3" : ""}`} style={isFeatured ? { borderColor: "rgba(167,139,113,0.4)" } : undefined}>
              {isFeatured && <span className="chip absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-black">Most popular</span>}
              <h3 className="display text-[26px]">{p.name}</h3>
              <p className="mt-2 text-[14px] text-muted">{p.description}</p>
              <p className="nums mt-6 text-[48px] leading-none font-bold">
                {new Intl.NumberFormat("en", { style: "currency", currency: p.currency, maximumFractionDigits: 0 }).format(price)}
              </p>
              <p className="mt-1 text-[13px] text-faint">for {p.durationDays * length} days</p>
              <ul className="mt-6 space-y-2 border-t border-white/[0.07] pt-5 text-[14px] text-ink/90">
                <li>Reach: {REACH[p.location]} <span className="text-faint">(estimate)</span></li>
                <li>Max {p.capacity} concurrent sponsor{p.capacity > 1 ? "s" : ""}</li>
                <li>Labeled “Sponsored” · moderator-approved</li>
              </ul>
              <button type="button" disabled className={`btn mt-8 w-full ${isFeatured ? "btn-solid" : "btn-outline"}`}>
                Self-serve booking opens soon
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
