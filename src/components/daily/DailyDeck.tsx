"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { setSaved } from "@/app/actions/collect";
import { GenerativeArt } from "@/components/art/GenerativeArt";

export type DailyCard = { id: string; slug: string; title: string; artist: string; year: number | null; seed: number; ratio: number; isDemo: boolean; category: string | null; price: string | null };

export function DailyDeck({ cards, signedIn, initialSaved }: { cards: DailyCard[]; signedIn: boolean; initialSaved: string[] }) {
  const [i, setI] = useState(0);
  const [saved, setSavedIds] = useState<string[]>(initialSaved);
  const [dx, setDx] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [, start] = useTransition();
  const drag = useRef<{ x: number; id: number } | null>(null);
  const card = cards[i];

  const decide = (keep: boolean) => {
    if (!card) return;
    if (keep && !saved.includes(card.id)) {
      setSavedIds((s) => [...s, card.id]);
      if (signedIn)
        start(async () => {
          const r = await setSaved(card.id, true);
          if (!r.ok) setMsg(r.error);
        });
    }
    setDx(0);
    setI((x) => x + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,select")) return;
      if (e.key === "ArrowRight") decide(true);
      if (e.key === "ArrowLeft") decide(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!card) {
    const kept = cards.filter((c) => saved.includes(c.id));
    return (
      <div className="panel mx-auto max-w-2xl p-8 text-center">
        <p className="display text-[28px]">That&rsquo;s today&rsquo;s ten.</p>
        <p className="mt-2 text-[15px] text-muted">
          You kept {kept.length} {kept.length === 1 ? "work" : "works"}. A new selection arrives tomorrow.
        </p>
        {kept.length > 0 && (
          <ul className="mt-6 flex flex-wrap justify-center gap-3">
            {kept.map((c) => (
              <li key={c.id} className="w-24">
                <Link href={`/art/${c.slug}`} aria-label={c.title} className="block overflow-hidden rounded-lg border border-white/10">
                  <GenerativeArt seed={c.seed} ratio={c.ratio} title={c.title} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {signedIn ? (
            <Link href="/saved" className="btn btn-solid">
              See all saved
            </Link>
          ) : (
            kept.length > 0 && (
              <Link href="/sign-in?next=/daily" className="btn btn-solid">
                Sign in to keep these
              </Link>
            )
          )}
          <button type="button" className="btn btn-outline" onClick={() => setI(0)}>
            Start again
          </button>
        </div>
      </div>
    );
  }

  const rot = dx / 25;
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center">
      <p className="mb-4 text-[12px] tracking-[0.18em] text-faint uppercase nums" aria-live="polite">
        {i + 1} / {cards.length}
      </p>
      <article
        className="relative w-full touch-pan-y select-none"
        style={{ transform: `translateX(${dx}px) rotate(${rot}deg)`, transition: drag.current ? "none" : "transform 300ms var(--ease)" }}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, id: e.pointerId };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => drag.current && setDx(e.clientX - drag.current.x)}
        onPointerUp={() => {
          const d = dx;
          drag.current = null;
          if (d > 110) decide(true);
          else if (d < -110) decide(false);
          else setDx(0);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setDx(0);
        }}
      >
        <div className="mx-auto overflow-hidden rounded-[20px] border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.6)]" style={{ maxWidth: `min(100%, ${Math.round(52 * card.ratio)}vh)` }}>
          <GenerativeArt seed={card.seed} ratio={card.ratio} title={card.title} />
        </div>
        {dx !== 0 && (
          <span aria-hidden="true" className={`chip absolute top-4 ${dx > 0 ? "left-4 bg-[var(--gold)] text-black" : "right-4 bg-white/80 text-black"}`} style={{ opacity: Math.min(1, Math.abs(dx) / 110) }}>
            {dx > 0 ? "Keep" : "Skip"}
          </span>
        )}
        <div className="mt-4 text-center">
          <h2 className="display text-[26px]">
            <Link href={`/art/${card.slug}`}>{card.title}</Link>
          </h2>
          <p className="text-[14px] text-muted">
            {card.artist}
            {card.year ? `, ${card.year}` : ""}
            {card.category ? ` · ${card.category}` : ""}
            {card.isDemo ? " · DEMO" : ""}
          </p>
          {card.price && <p className="mt-1 text-[14px] nums">{card.price}</p>}
        </div>
      </article>
      <div className="mt-6 flex gap-3">
        <button type="button" className="btn btn-outline min-w-[120px]" onClick={() => decide(false)}>
          Skip ←
        </button>
        <button type="button" className="btn btn-gold min-w-[120px]" onClick={() => decide(true)}>
          Keep →
        </button>
      </div>
      <p className="mt-3 text-[12px] text-faint">Swipe, use the buttons, or the arrow keys.{!signedIn && " Sign in at the end to keep what you liked."}</p>
      {msg && (
        <p role="alert" className="mt-2 text-[12px] text-[var(--danger)]">
          {msg}
        </p>
      )}
    </div>
  );
}
