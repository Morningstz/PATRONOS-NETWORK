/**
 * Source field: the analysed image the painter samples from. Pure (no DOM) so it can be unit-tested.
 * Built once per source/aspect at a small analysis resolution; every style samples it in normalised
 * (u, v) ∈ [0,1]² coordinates, which keeps paintings identical at preview and print resolution.
 */
import type { RGB } from "../art/color";

export type Field = {
  w: number;
  h: number;
  raw: Uint8ClampedArray; // RGBA
  rgb: Float32Array; // lightly blurred RGB, 3 channels, 0..255
  lum: Float32Array; // 0..1
  lumBlur: Float32Array; // 0..1, smoothed
  mag: Float32Array; // gradient magnitude normalised to ~0..1
  c2: Float32Array; // cos(2θ) of the edge-tangent orientation (double-angle avoids 180° ambiguity)
  s2: Float32Array; // sin(2θ)
  coh: Float32Array; // orientation coherence 0..1
};

function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r <= 0) return src.slice();
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const win = r * 2 + 1;
  for (let y = 0; y < h; y++) {
    let acc = 0;
    const row = y * w;
    for (let x = -r; x <= r; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))]!;
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc / win;
      acc += src[row + Math.min(w - 1, x + r + 1)]! - src[row + Math.max(0, x - r)]!;
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]!;
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / win;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x]! - tmp[Math.max(0, y - r) * w + x]!;
    }
  }
  return out;
}

export function buildField(raw: Uint8ClampedArray, w: number, h: number): Field {
  const n = w * h;
  const lum = new Float32Array(n);
  const ch = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
  for (let i = 0; i < n; i++) {
    const r = raw[i * 4]!, g = raw[i * 4 + 1]!, b = raw[i * 4 + 2]!;
    ch[0]![i] = r;
    ch[1]![i] = g;
    ch[2]![i] = b;
    lum[i] = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }
  const blurred = ch.map((c) => boxBlur(c, w, h, 1));
  const rgb = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    rgb[i * 3] = blurred[0]![i]!;
    rgb[i * 3 + 1] = blurred[1]![i]!;
    rgb[i * 3 + 2] = blurred[2]![i]!;
  }
  const lumBlur = boxBlur(boxBlur(lum, w, h, 2), w, h, 1);

  // Sobel on the smoothed luminance
  const gx = new Float32Array(n), gy = new Float32Array(n), mag = new Float32Array(n);
  const at = (x: number, y: number) => lumBlur[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))]!;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
      const sy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
      const i = y * w + x;
      gx[i] = sx;
      gy[i] = sy;
      mag[i] = Math.hypot(sx, sy);
    }
  }
  // Normalise magnitude by the 95th percentile so photos and flat graphics behave alike
  const sorted = Float32Array.from(mag).sort();
  const p95 = sorted[Math.floor(n * 0.95)]! || 1e-6;
  for (let i = 0; i < n; i++) mag[i] = Math.min(1, mag[i]! / p95);

  // Structure tensor → smooth, coherent stroke orientation (the "flow" brushstrokes follow)
  const jxx = new Float32Array(n), jyy = new Float32Array(n), jxy = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    jxx[i] = gx[i]! * gx[i]!;
    jyy[i] = gy[i]! * gy[i]!;
    jxy[i] = gx[i]! * gy[i]!;
  }
  const r = Math.max(2, Math.round(Math.max(w, h) / 90));
  const sxx = boxBlur(boxBlur(jxx, w, h, r), w, h, r);
  const syy = boxBlur(boxBlur(jyy, w, h, r), w, h, r);
  const sxy = boxBlur(boxBlur(jxy, w, h, r), w, h, r);
  const c2 = new Float32Array(n), s2 = new Float32Array(n), coh = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = sxx[i]!, b = syy[i]!, c = sxy[i]!;
    const grad2 = Math.atan2(2 * c, a - b); // 2 × gradient angle
    const tan2 = grad2 + Math.PI; // tangent is perpendicular → +π in double-angle space
    c2[i] = Math.cos(tan2);
    s2[i] = Math.sin(tan2);
    const tr = a + b;
    const det = Math.sqrt((a - b) * (a - b) + 4 * c * c);
    coh[i] = tr > 1e-9 ? Math.min(1, (det / tr) ** 2) : 0;
  }
  return { w, h, raw, rgb, lum, lumBlur, mag, c2, s2, coh };
}

function bilinear(arr: Float32Array, f: Field, u: number, v: number, stride = 1, off = 0): number {
  const x = Math.min(f.w - 1, Math.max(0, u * f.w - 0.5));
  const y = Math.min(f.h - 1, Math.max(0, v * f.h - 0.5));
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(f.w - 1, x0 + 1), y1 = Math.min(f.h - 1, y0 + 1);
  const fx = x - x0, fy = y - y0;
  const a = arr[(y0 * f.w + x0) * stride + off]!, b = arr[(y0 * f.w + x1) * stride + off]!;
  const c = arr[(y1 * f.w + x0) * stride + off]!, d = arr[(y1 * f.w + x1) * stride + off]!;
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

export function sampleRgb(f: Field, u: number, v: number): RGB {
  return [bilinear(f.rgb, f, u, v, 3, 0), bilinear(f.rgb, f, u, v, 3, 1), bilinear(f.rgb, f, u, v, 3, 2)];
}
export const sampleLum = (f: Field, u: number, v: number) => bilinear(f.lumBlur, f, u, v);
export const sampleMag = (f: Field, u: number, v: number) => bilinear(f.mag, f, u, v);
export const sampleCoh = (f: Field, u: number, v: number) => bilinear(f.coh, f, u, v);

/** Edge-tangent angle (radians) at (u,v). */
export function sampleTangent(f: Field, u: number, v: number): number {
  return 0.5 * Math.atan2(bilinear(f.s2, f, u, v), bilinear(f.c2, f, u, v));
}

/** Quantile of the smoothed luminance — used for tonal thresholds (stencil, batik). */
export function lumQuantile(f: Field, q: number): number {
  const s = Float32Array.from(f.lumBlur).sort();
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * s.length)))]!;
}
