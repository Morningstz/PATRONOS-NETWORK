"use client";

import { useEffect, useRef, useState } from "react";
import { GenerativeArt } from "./GenerativeArt";

/** Width in cm from strings like "120 × 90 cm", "90 x 60 x 40 cm" or "36 in × 24 in". */
export function widthCm(dimensions: string | null | undefined): number | null {
  if (!dimensions) return null;
  const m = dimensions.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]!.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return /\bin\b|inch|"/.test(dimensions) ? n * 2.54 : n;
}

const SOFA_CM = 210;

export function ArtworkStage({ seed, ratio, title, dimensions }: { seed: number; ratio: number; title: string; dimensions: string | null }) {
  const [living, setLiving] = useState(false);
  const [room, setRoom] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const w = widthCm(dimensions) ?? 100;

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (room && !d.open) d.showModal();
    if (!room && d.open) d.close();
  }, [room]);

  // In the room, the sofa spans 46% of the wall; the work is scaled to it by real width.
  const artPct = Math.min(70, Math.max(8, (w / SOFA_CM) * 46));

  return (
    <div className="w-full">
      <figure className={`relative w-full ${living ? "living-art" : ""}`} style={{ maxWidth: `min(100%, ${Math.round(78 * ratio)}vh)`, marginInline: "auto" }}>
        <GenerativeArt seed={seed} ratio={ratio} title={title} className="shadow-[0_30px_80px_rgba(0,0,0,0.6)]" />
        <figcaption className="sr-only">{title}</figcaption>
      </figure>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" className="btn btn-outline" onClick={() => setRoom(true)}>
          View in a room
        </button>
        <button type="button" className={`btn ${living ? "btn-gold" : "btn-outline"}`} aria-pressed={living} onClick={() => setLiving((x) => !x)}>
          {living ? "Living view on" : "Living view"}
        </button>
      </div>
      {living && <p className="mt-2 text-center text-[12px] text-faint">Living view adds a slow light and breathing motion. Colours are unchanged.</p>}

      <dialog
        ref={dialogRef}
        onClose={() => setRoom(false)}
        aria-label={`${title} shown in a living room`}
        className="m-auto w-[min(96vw,1100px)] rounded-[24px] border border-white/10 bg-bg p-0 text-ink backdrop:bg-black/80"
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-[24px]" style={{ background: "linear-gradient(180deg,#d9d2c5 0%,#cfc6b6 72%,#8b7a64 72%,#6f604d 100%)" }}>
          <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: "47%", width: `${artPct}%` }}>
            <div className="shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
              <GenerativeArt seed={seed} ratio={ratio} title={title} />
            </div>
          </div>
          {/* Sofa (210 cm) for scale */}
          <svg aria-hidden="true" viewBox="0 0 460 150" className="absolute left-1/2 -translate-x-1/2" style={{ bottom: "14%", width: "46%" }}>
            <rect x="10" y="40" width="440" height="70" rx="18" fill="#3e4a52" />
            <rect x="0" y="70" width="60" height="65" rx="16" fill="#35424a" />
            <rect x="400" y="70" width="60" height="65" rx="16" fill="#35424a" />
            <rect x="50" y="85" width="360" height="45" rx="10" fill="#46535b" />
            <rect x="40" y="132" width="10" height="16" fill="#2a2420" />
            <rect x="410" y="132" width="10" height="16" fill="#2a2420" />
          </svg>
          <svg aria-hidden="true" viewBox="0 0 60 200" className="absolute" style={{ bottom: "14%", right: "9%", width: "6%" }}>
            <path d="M30 200 V90" stroke="#5b4a3a" strokeWidth="4" />
            <ellipse cx="30" cy="70" rx="26" ry="60" fill="#5d7a55" />
          </svg>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-[13px] text-muted">
            Shown to scale beside a 210 cm sofa{widthCm(dimensions) ? ` — the work is ${Math.round(w)} cm wide.` : " — size estimated at 100 cm wide."}
          </p>
          <button type="button" className="btn btn-solid" onClick={() => setRoom(false)} autoFocus>
            Close
          </button>
        </div>
      </dialog>
    </div>
  );
}
