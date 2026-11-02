/** Canvas drawing kit shared by every Studio style. Browser-only. */
import { hslToRgb, rgbToHsl, type RGB } from "../art/color";
import type { Analysis } from "./analyze";
import { sampleCoh, sampleMag, sampleTangent, type Field } from "./field";
import type { Rng } from "./noise";

export type Ctx = CanvasRenderingContext2D;

export type PaintEnv = {
  W: number;
  H: number;
  /** Resolution scale: 1 at a 1000 px short edge. All sizes are multiplied by it. */
  s: number;
  field: Field;
  analysis: Analysis;
  rnd: Rng;
  noise: (x: number, y: number) => number;
  seed: number;
  /** 0.6 (loose) … 1.6 (detailed) — multiplies mark counts. */
  detail: number;
  /** Source image at analysis resolution. */
  src: HTMLCanvasElement;
  /** Styles may keep extra layers here (e.g. glass + lead lines) for their live animation. */
  layers: Record<string, HTMLCanvasElement>;
  /** Styles may keep plain data here for their live animation (drip positions, gear specs…). */
  store: Record<string, unknown>;
  make: (w: number, h: number) => HTMLCanvasElement;
};

export type LiveLayer = {
  /** t in seconds within a loop of T seconds; k = motion intensity (0.3 … 1.5). Must be periodic in T. */
  draw(ctx: Ctx, t: number, T: number, k: number): void;
  /** True when the layer is part of the artwork itself (drawn into stills at t = 0). */
  inStatic?: boolean;
};

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function ctx2d(c: HTMLCanvasElement): Ctx {
  const x = c.getContext("2d", { willReadFrequently: false });
  if (!x) throw new Error("Canvas 2D is not available in this browser");
  return x;
}

export const rgba = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

export function tweak(c: RGB, o: { sat?: number; light?: number; hue?: number; minL?: number; maxL?: number }): RGB {
  const [h, s, l] = rgbToHsl(c);
  let L = l + (o.light ?? 0);
  if (o.minL !== undefined) L = Math.max(o.minL, L);
  if (o.maxL !== undefined) L = Math.min(o.maxL, L);
  return hslToRgb(h + (o.hue ?? 0), Math.min(1, s * (o.sat ?? 1)), Math.max(0, Math.min(1, L)));
}

export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export const between = (r: Rng, a: number, b: number) => a + r() * (b - a);

/** Draw `src` scaled to W×H through a small intermediate canvas: a cheap, cross-browser blur. */
export function drawBlurred(ctx: Ctx, src: HTMLCanvasElement, W: number, H: number, factor: number) {
  const sw = Math.max(2, Math.round(W / factor)), sh = Math.max(2, Math.round(H / factor));
  const small = makeCanvas(sw, sh);
  const sx = ctx2d(small);
  sx.imageSmoothingEnabled = true;
  sx.imageSmoothingQuality = "high";
  sx.drawImage(src, 0, 0, sw, sh);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(small, 0, 0, W, H);
  ctx.restore();
}

/** Smooth polyline through points (quadratic curves through midpoints). */
export function strokePts(ctx: Ctx, pts: number[], width: number, color: string) {
  if (pts.length < 4) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(pts[0]!, pts[1]!);
  if (pts.length === 4) ctx.lineTo(pts[2]!, pts[3]!);
  else {
    for (let i = 2; i < pts.length - 2; i += 2) {
      const mx = (pts[i]! + pts[i + 2]!) / 2, my = (pts[i + 1]! + pts[i + 3]!) / 2;
      ctx.quadraticCurveTo(pts[i]!, pts[i + 1]!, mx, my);
    }
    ctx.lineTo(pts[pts.length - 2]!, pts[pts.length - 1]!);
  }
  ctx.stroke();
}

/** Direction field: image edge tangents where the image has structure, Perlin swirls where it is flat. */
export function flowAngle(env: PaintEnv, swirl: number, scale = 3.2) {
  return (u: number, v: number) => {
    const t = sampleTangent(env.field, u, v);
    const w = Math.min(1, sampleCoh(env.field, u, v) * 1.4 + sampleMag(env.field, u, v) * 0.6);
    const n = env.noise(u * scale, v * scale) * Math.PI * 2 * swirl;
    // Blend as vectors so angles never jump
    const x = Math.cos(t) * w + Math.cos(n) * (1 - w);
    const y = Math.sin(t) * w + Math.sin(n) * (1 - w);
    return Math.atan2(y, x);
  };
}

/** Follow the direction field from (u,v) for `steps` of `stepPx`. Returns pixel coords [x0,y0,x1,y1,…]. */
export function tracePath(env: PaintEnv, angle: (u: number, v: number) => number, u: number, v: number, steps: number, stepPx: number): number[] {
  const pts: number[] = [u * env.W, v * env.H];
  let x = u * env.W, y = v * env.H, pdx = 0, pdy = 0;
  for (let i = 0; i < steps; i++) {
    const a = angle(x / env.W, y / env.H);
    let dx = Math.cos(a), dy = Math.sin(a);
    if (dx * pdx + dy * pdy < 0) {
      dx = -dx;
      dy = -dy;
    }
    x += dx * stepPx;
    y += dy * stepPx;
    if (x < -stepPx || y < -stepPx || x > env.W + stepPx || y > env.H + stepPx) break;
    pts.push(x, y);
    pdx = dx;
    pdy = dy;
  }
  return pts;
}

const tileCache = new Map<string, HTMLCanvasElement>();

/** Surface texture overlay (canvas weave, paper tooth, concrete). */
export function texture(ctx: Ctx, env: PaintEnv, kind: "canvas" | "paper" | "concrete" | "washi", alpha: number) {
  const size = Math.max(64, Math.round(256 * env.s));
  const key = `${kind}:${size}`;
  let tile = tileCache.get(key);
  if (!tile) {
    tile = makeCanvas(size, size);
    const t = ctx2d(tile);
    const r = mulberry(kind.length * 977 + size);
    const img = t.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let v = 128;
        if (kind === "canvas") {
          const wx = Math.sin((x / size) * Math.PI * 2 * 48 * 1.0), wy = Math.sin((y / size) * Math.PI * 2 * 48);
          v = 128 + 26 * (wx * 0.5 + wy * 0.5) + (r() - 0.5) * 30;
        } else if (kind === "paper") v = 128 + (r() - 0.5) * 46;
        else if (kind === "washi") v = 128 + (r() - 0.5) * 30 + (Math.sin(y * 0.9 + Math.sin(x * 0.05) * 3) > 0.96 ? 30 : 0);
        else v = 128 + (r() - 0.5) * 70;
        const i = (y * size + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    t.putImageData(img, 0, 0);
    tileCache.set(key, tile);
  }
  const pat = ctx.createPattern(tile, "repeat");
  if (!pat) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, env.W, env.H);
  ctx.restore();
}

export function vignette(ctx: Ctx, W: number, H: number, a: number, color: RGB = [0, 0, 0]) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.hypot(W, H) * 0.55);
  g.addColorStop(0, rgba(color, 0));
  g.addColorStop(1, rgba(color, a));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function glow(ctx: Ctx, x: number, y: number, r: number, c: RGB, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(c, a));
  g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rejection-sample a point weighted towards detailed areas (edges). */
export function detailPoint(env: PaintEnv, bias: number): [number, number] {
  for (let i = 0; i < 12; i++) {
    const u = env.rnd(), v = env.rnd();
    if (env.rnd() < 0.15 + sampleMag(env.field, u, v) * bias) return [u, v];
  }
  return [env.rnd(), env.rnd()];
}

/** Periodic phase helper for seamless loops. */
export const TAU = Math.PI * 2;
export const wave = (t: number, T: number, cycles: number, phase = 0) => Math.sin(TAU * (cycles * t / T + phase));
