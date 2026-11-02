"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { lensMatch } from "@/app/actions/collect";
import { GenerativeArt } from "@/components/art/GenerativeArt";
import { formatPrice } from "@/lib/art/assistant";
import { buildSource } from "@/lib/studio/engine";
import type { PaletteEntry } from "@/lib/studio/analyze";
import { renderScene, SCENES } from "@/lib/studio/scenes";

type Match = Extract<Awaited<ReturnType<typeof lensMatch>>, { ok: true }>["matches"][number];

export function ArtLens() {
  const [preview, setPreview] = useState<string | null>(null);
  const [palette, setPalette] = useState<PaletteEntry[]>([]);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const read = (img: CanvasImageSource, w: number, h: number, previewUrl: string) => {
    try {
      const src = buildSource(img, w, h, null);
      setPreview(previewUrl);
      setPalette(src.analysis.palette);
      setError(null);
      start(async () => {
        const r = await lensMatch(src.analysis.signature);
        if (r.ok) setMatches(r.matches);
        else setError(r.error);
      });
    } catch {
      setError("Could not read that image.");
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please choose an image file (JPG, PNG or WebP).");
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      // Keep a small preview only; the original never leaves the browser
      const c = document.createElement("canvas");
      const k = Math.min(1, 640 / Math.max(img.naturalWidth, img.naturalHeight));
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      read(c, c.width, c.height, c.toDataURL("image/jpeg", 0.85));
    } catch {
      setError("This browser cannot open that image format. Try JPG, PNG or WebP.");
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <div className="panel p-5">
          <label className="btn btn-solid w-full cursor-pointer">
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} data-testid="lens-upload" />
            Take or choose a photo
          </label>
          <p className="mt-3 text-[12px] text-faint">
            Point it at your room, a fabric, a sunset — anything with colours you love. Your photo stays on this device: only a 15-number colour signature is sent to find matches.
          </p>
          <p className="eyebrow mt-5 mb-2">Or try a sample</p>
          <div className="grid grid-cols-4 gap-2">
            {SCENES.map((sc) => (
              <button
                key={sc.id}
                type="button"
                className="overflow-hidden rounded-xl border border-white/10 text-left text-[11px] text-muted hover:border-white/30"
                onClick={() => {
                  const c = renderScene(sc, 480, 360);
                  read(c, c.width, c.height, c.toDataURL("image/jpeg", 0.85));
                }}
              >
                <span className="block truncate px-1.5 py-1">{sc.name}</span>
              </button>
            ))}
          </div>
        </div>
        {preview && (
          <div className="panel p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Your photo (kept on this device)" className="w-full rounded-xl" />
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Colours found">
              {palette.map((p) => (
                <li key={p.hex} className="flex items-center gap-2 rounded-full border border-white/10 py-1 pr-3 pl-1 text-[12px] text-muted">
                  <span aria-hidden="true" className="size-5 rounded-full border border-white/20" style={{ background: p.hex }} />
                  {p.name}
                </li>
              ))}
            </ul>
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-xl border border-[var(--danger)]/40 px-3 py-2 text-[13px] text-[var(--danger)]">
            {error}
          </p>
        )}
      </div>
      <section aria-labelledby="lens-results" aria-busy={pending}>
        <h2 id="lens-results" className="eyebrow mb-4">
          {pending ? "Looking for colour matches…" : matches ? "Closest by colour" : "Matches will appear here"}
        </h2>
        {!matches && !pending && <div className="panel grid min-h-[320px] place-items-center p-10 text-center text-[15px] text-muted">Add a photo to find works whose palette echoes it.</div>}
        {matches && (
          <ul className="grid grid-cols-2 gap-6 md:grid-cols-3" data-testid="lens-matches">
            {matches.map((m) => (
              <li key={m.id} className="group relative">
                <div className="overflow-hidden rounded-[16px] border border-white/10">
                  <GenerativeArt seed={m.seed} ratio={m.ratio} title={m.title} />
                </div>
                <h3 className="display mt-2 truncate text-[17px]">
                  <Link href={`/art/${m.slug}`} className="after:absolute after:inset-0">
                    {m.title}
                  </Link>
                </h3>
                <p className="truncate text-[13px] text-muted">
                  {m.artist}
                  {m.isDemo ? " · DEMO" : ""}
                </p>
                <p className="mt-1 flex justify-between text-[12px] text-faint nums">
                  <span>{m.score}% colour match</span>
                  {m.price && <span className="text-ink">{formatPrice(m.price.amount, m.price.currency)}</span>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
