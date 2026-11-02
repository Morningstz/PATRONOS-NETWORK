"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buildSource, LiveRun, outputSize, PaintRun } from "@/lib/studio/engine";
import { ctx2d } from "@/lib/studio/kit";
import { renderScene, SCENES } from "@/lib/studio/scenes";
import { STYLES_META, type StyleId } from "@/lib/studio/styles-meta";

const CYCLE: Array<[string, StyleId]> = [
  ["bromo", "impasto"],
  ["harbour", "glass"],
  ["terraces", "ukiyoe"],
  ["stilllife", "clockwork"],
  ["bromo", "batik"],
];

/** Home-page band: paints sample scenes live, only while visible, and stops for reduced motion. */
export function StudioTeaser() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !visible) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const [sceneId, styleId] = CYCLE[idx % CYCLE.length]!;
    const scene = SCENES.find((s) => s.id === sceneId)!;
    const aspect = 4 / 3;
    const img = renderScene(scene, 640, 480);
    const src = buildSource(img, 640, 480, aspect);
    const { W, H } = outputSize(aspect, 720);
    canvas.width = W;
    canvas.height = H;
    const ctx = ctx2d(canvas);
    const run = new PaintRun(styleId, src, W, H, 7 + idx, 0.9);
    let live: LiveRun | null = null;
    let raf = 0, liveAt = 0;
    if (reduce) {
      run.finish();
      new LiveRun(run.canvas, run.env, styleId).frame(ctx, 0, 6, 1, "still");
      return;
    }
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!run.done) {
        run.step(10, 3);
        ctx.drawImage(run.canvas, 0, 0);
        return;
      }
      if (!live) {
        live = new LiveRun(run.canvas, run.env, styleId);
        liveAt = performance.now();
      }
      const t = (performance.now() - liveAt) / 1000;
      live.frame(ctx, t % 6, 6, 1, "breathe");
      if (t > 6) setIdx((i) => i + 1);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [idx, visible]);

  const style = STYLES_META[CYCLE[idx % CYCLE.length]![1]];
  return (
    <section aria-labelledby="studio-band" className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-12">
      <div className="panel grid items-center gap-10 overflow-hidden p-6 md:grid-cols-[1fr_1.2fr] md:p-10">
        <div>
          <p className="eyebrow mb-3">New · PATRONOS Studio</p>
          <h2 id="studio-band" className="display text-[clamp(2rem,4vw,3.25rem)]">
            Paint it. Watch it live.
          </h2>
          <p className="mt-4 max-w-md text-[16px] text-muted">
            Turn any photo into a painting in eleven styles — from impasto and ukiyo-e to batik sogan and gilded clockwork. Watch it painted stroke by stroke, set it in motion as a seamless loop,
            and take detailed image, animation and print prompts with you.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/studio" className="btn btn-solid">
              Open the Studio
            </Link>
            <Link href="/lens" className="btn btn-outline">
              Try Art Lens
            </Link>
          </div>
          <p className="mt-4 text-[12px] text-faint">
            Now painting: {style.name}
          </p>
        </div>
        <canvas ref={ref} role="img" aria-label={`A sample scene being painted in the ${style.name} style`} className="h-auto w-full rounded-[16px] bg-black/50" />
      </div>
    </section>
  );
}
