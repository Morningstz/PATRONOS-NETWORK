/**
 * Studio engine: turns an image into a source field, runs a style's painter progressively
 * (the "being painted" animation), loops its living motion, and exports stills and video.
 * Everything runs in the browser — uploaded photos never leave the device.
 */
import { analyze, type Analysis } from "./analyze";
import { buildField, type Field } from "./field";
import { ctx2d, makeCanvas, type Ctx, type LiveLayer, type PaintEnv } from "./kit";
import { makeNoise, mulberry32 } from "./noise";
import { STYLES } from "./styles";
import type { StyleId } from "./styles-meta";
import type { Camera } from "./prompt";
export type { Camera };

export type Source = { field: Field; analysis: Analysis; src: HTMLCanvasElement; aspect: number };

export const ANALYSIS_LONG_EDGE = 480;

/** Centre-crop (cover) an image to `aspect` (w/h) and analyse it. aspect = null keeps the original. */
export function buildSource(img: CanvasImageSource, iw: number, ih: number, aspect: number | null): Source {
  const a = aspect ?? iw / ih;
  let sw = iw, sh = iw / a;
  if (sh > ih) {
    sh = ih;
    sw = ih * a;
  }
  const sx = (iw - sw) / 2, sy = (ih - sh) / 2;
  const w = a >= 1 ? ANALYSIS_LONG_EDGE : Math.round(ANALYSIS_LONG_EDGE * a);
  const h = a >= 1 ? Math.round(ANALYSIS_LONG_EDGE / a) : ANALYSIS_LONG_EDGE;
  const src = makeCanvas(w, h);
  const x = ctx2d(src);
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = "high";
  x.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  const data = x.getImageData(0, 0, w, h).data;
  const field = buildField(data, w, h);
  return { field, analysis: analyze(field), src, aspect: a };
}

export function outputSize(aspect: number, longEdge: number) {
  return aspect >= 1 ? { W: longEdge, H: Math.round(longEdge / aspect) } : { W: Math.round(longEdge * aspect), H: longEdge };
}

export function makeEnv(source: Source, W: number, H: number, seed: number, detail: number): PaintEnv {
  return {
    W,
    H,
    s: Math.min(W, H) / 1000,
    field: source.field,
    analysis: source.analysis,
    rnd: mulberry32(seed),
    noise: makeNoise(seed),
    seed,
    detail,
    src: source.src,
    layers: {},
    store: {},
    make: makeCanvas,
  };
}

/** Progressive painting: call step() once per animation frame. */
export class PaintRun {
  readonly canvas: HTMLCanvasElement;
  readonly env: PaintEnv;
  progress = 0;
  done = false;
  private gen: Generator<number, void, unknown>;
  private ctx: Ctx;
  private started = 0;

  constructor(
    readonly styleId: StyleId,
    source: Source,
    W: number,
    H: number,
    seed: number,
    detail: number,
  ) {
    this.canvas = makeCanvas(W, H);
    this.ctx = ctx2d(this.canvas);
    this.env = makeEnv(source, W, H, seed, detail);
    this.gen = STYLES[styleId].paint(this.ctx, this.env);
  }

  /**
   * Advance the painting. `paceSeconds` makes the painting take at least that long (so the
   * process reads as an animation); `budgetMs` keeps each frame responsive.
   */
  step(budgetMs = 14, paceSeconds = 0): number {
    if (this.done) return 1;
    const now = performance.now();
    if (!this.started) this.started = now;
    const allowed = paceSeconds > 0 ? Math.min(1, (now - this.started) / 1000 / paceSeconds) : 1;
    while (performance.now() - now < budgetMs && this.progress <= allowed) {
      const r = this.gen.next();
      if (r.done) {
        this.done = true;
        this.progress = 1;
        break;
      }
      this.progress = r.value;
    }
    return this.progress;
  }

  finish() {
    while (!this.done) this.step(1e9, 0);
  }
}


/** Living loop over a finished painting. Every motion is periodic in T, so loops are seamless. */
export class LiveRun {
  private layer: LiveLayer;
  constructor(
    private base: HTMLCanvasElement,
    readonly env: PaintEnv,
    styleId: StyleId,
  ) {
    this.layer = STYLES[styleId].live(env);
  }

  get inStatic() {
    return !!this.layer.inStatic;
  }

  frame(ctx: Ctx, t: number, T: number, k: number, camera: Camera) {
    const { W, H } = this.env;
    ctx.save();
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, W, H);
    const ph = (t / T) * Math.PI * 2;
    const f = this.env.analysis.focus;
    if (camera === "breathe") {
      const z = 1 + 0.035 * k * (0.5 - 0.5 * Math.cos(ph));
      ctx.translate(f.u * W, f.v * H);
      ctx.scale(z, z);
      ctx.translate(-f.u * W, -f.v * H);
    } else if (camera === "drift") {
      const z = 1.06;
      ctx.translate(W / 2 + Math.cos(ph) * 0.018 * W * k, H / 2 + Math.sin(ph) * 0.018 * H * k);
      ctx.scale(z, z);
      ctx.translate(-W / 2, -H / 2);
    }
    ctx.drawImage(this.base, 0, 0);
    this.layer.draw(ctx, t, T, k);
    ctx.restore();
  }
}

/** Render a finished still (for PNG export). Yields to the UI between chunks. */
export async function renderStill(
  styleId: StyleId,
  source: Source,
  W: number,
  H: number,
  seed: number,
  detail: number,
  onProgress?: (p: number) => void,
  signal?: AbortSignal,
): Promise<HTMLCanvasElement> {
  const run = new PaintRun(styleId, source, W, H, seed, detail);
  while (!run.done) {
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    run.step(40, 0);
    onProgress?.(run.progress);
    await new Promise((r) => setTimeout(r, 0));
  }
  const live = new LiveRun(run.canvas, run.env, styleId);
  if (live.inStatic) {
    const out = makeCanvas(W, H);
    live.frame(ctx2d(out), 0, 6, 1, "still");
    return out;
  }
  return run.canvas;
}

export function canvasToBlob(c: HTMLCanvasElement, type = "image/png", quality?: number): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Export failed"))), type, quality));
}

export function pickVideoMime(): { mime: string; ext: "mp4" | "webm" } | null {
  if (typeof MediaRecorder === "undefined") return null;
  const options: Array<[string, "mp4" | "webm"]> = [
    ["video/mp4;codecs=avc1.42E01E", "mp4"],
    ["video/mp4", "mp4"],
    ["video/webm;codecs=vp9", "webm"],
    ["video/webm;codecs=vp8", "webm"],
    ["video/webm", "webm"],
  ];
  for (const [m, ext] of options) if (MediaRecorder.isTypeSupported(m)) return { mime: m, ext };
  return null;
}

/**
 * Record `seconds` of an animation drawn by `draw(t)` onto `canvas` in real time.
 * Returns the encoded video. Resolves early if the signal aborts.
 */
export function recordCanvas(
  canvas: HTMLCanvasElement,
  draw: (t: number) => void,
  seconds: number,
  fps = 30,
  onProgress?: (p: number) => void,
  signal?: AbortSignal,
): Promise<{ blob: Blob; ext: string }> {
  const fmt = pickVideoMime();
  if (!fmt || typeof canvas.captureStream !== "function") return Promise.reject(new Error("This browser cannot record video. Try Chrome, Edge or Safari 17+."));
  const stream = canvas.captureStream(fps);
  const rec = new MediaRecorder(stream, { mimeType: fmt.mime, videoBitsPerSecond: 12_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  return new Promise((resolve, reject) => {
    let raf = 0;
    const stopAll = () => {
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((tr) => tr.stop());
    };
    rec.onstop = () => {
      stopAll();
      if (signal?.aborted) reject(new DOMException("Cancelled", "AbortError"));
      else resolve({ blob: new Blob(chunks, { type: fmt.mime.split(";")[0] }), ext: fmt.ext });
    };
    rec.onerror = () => {
      stopAll();
      reject(new Error("Recording failed"));
    };
    draw(0);
    rec.start(250);
    const start = performance.now();
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      if (t >= seconds || signal?.aborted) {
        draw(seconds % seconds);
        rec.stop();
        return;
      }
      draw(t);
      onProgress?.(t / seconds);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
