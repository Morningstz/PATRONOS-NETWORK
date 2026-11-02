/**
 * Reads a source field the way a painter would before starting: palette, value key, contrast,
 * temperature, where the eye goes, where the horizon sits. Pure — feeds the prompt writer,
 * Art Lens and the painter.
 */
import { addToSignature, colorFamily, labDistance, normalize, pigmentName, rgbToHex, rgbToHsl, type ColorFamily, type RGB } from "../art/color";
import type { Field } from "./field";
import { mulberry32 } from "./noise";

export type PaletteEntry = { rgb: RGB; hex: string; name: string; family: ColorFamily; weight: number };

export type Analysis = {
  palette: PaletteEntry[];
  meanLum: number;
  contrast: number;
  meanSat: number;
  warmth: number; // -1 cool … +1 warm
  key: "high-key" | "mid-key" | "low-key";
  focus: { u: number; v: number; label: string };
  horizon: { v: number; label: string } | null;
  detail: "soft" | "moderate" | "intricate";
  orientation: "portrait" | "landscape" | "square";
  colorFamilies: ColorFamily[];
  moods: string[];
  signature: number[];
};

function kmeans(points: RGB[], k: number, seed = 1, iters = 10): Array<{ c: RGB; n: number }> {
  const rnd = mulberry32(seed);
  const centers: RGB[] = [points[Math.floor(rnd() * points.length)]!];
  // k-means++ initialisation (deterministic)
  while (centers.length < k) {
    const d = points.map((p) => Math.min(...centers.map((c) => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2)));
    const total = d.reduce((a, b) => a + b, 0) || 1;
    let r = rnd() * total;
    let idx = 0;
    for (; idx < d.length - 1; idx++) {
      r -= d[idx]!;
      if (r <= 0) break;
    }
    centers.push(points[idx]!);
  }
  const assign = new Int32Array(points.length);
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < points.length; i++) {
      const p = points[i]!;
      let best = 0, bd = Infinity;
      for (let j = 0; j < k; j++) {
        const c = centers[j]!;
        const dd = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
        if (dd < bd) {
          bd = dd;
          best = j;
        }
      }
      assign[i] = best;
    }
    const sum = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (let i = 0; i < points.length; i++) {
      const s = sum[assign[i]!]!, p = points[i]!;
      s[0]! += p[0];
      s[1]! += p[1];
      s[2]! += p[2];
      s[3]! += 1;
    }
    for (let j = 0; j < k; j++) {
      const s = sum[j]!;
      if (s[3]! > 0) centers[j] = [s[0]! / s[3]!, s[1]! / s[3]!, s[2]! / s[3]!];
    }
  }
  const counts = new Array(k).fill(0);
  for (let i = 0; i < points.length; i++) counts[assign[i]!]++;
  return centers.map((c, j) => ({ c, n: counts[j] }));
}

const thirdsLabel = (u: number, v: number) => {
  const col = u < 0.38 ? "left" : u > 0.62 ? "right" : "centre";
  const row = v < 0.38 ? "upper" : v > 0.62 ? "lower" : "middle";
  if (col === "centre" && row === "middle") return "the centre";
  if (col === "centre") return `the ${row} centre`;
  if (row === "middle") return `the ${col} third`;
  return `the ${row}-${col} third`;
};

export function analyze(f: Field): Analysis {
  const n = f.w * f.h;
  // Palette from a deterministic sample of pixels
  const step = Math.max(1, Math.floor(Math.sqrt(n / 5000)));
  const pts: RGB[] = [];
  let sumL = 0, sumL2 = 0, sumS = 0, sumWarm = 0, count = 0;
  const sig = new Array(15).fill(0);
  for (let y = 0; y < f.h; y += step) {
    for (let x = 0; x < f.w; x += step) {
      const i = y * f.w + x;
      const rgb: RGB = [f.rgb[i * 3]!, f.rgb[i * 3 + 1]!, f.rgb[i * 3 + 2]!];
      pts.push(rgb);
      const l = f.lum[i]!;
      sumL += l;
      sumL2 += l * l;
      const [, s] = rgbToHsl(rgb);
      sumS += s;
      sumWarm += (rgb[0] - rgb[2]) / 255;
      addToSignature(sig, rgb, 1);
      count++;
    }
  }
  const meanLum = sumL / count;
  const contrast = Math.sqrt(Math.max(0, sumL2 / count - meanLum * meanLum));
  const meanSat = sumS / count;
  const warmth = Math.max(-1, Math.min(1, (sumWarm / count) * 2.2));

  const clusters = kmeans(pts, 6, 7).filter((c) => c.n > 0).sort((a, b) => b.n - a.n);
  const merged: Array<{ c: RGB; n: number }> = [];
  for (const cl of clusters) {
    const near = merged.find((m) => labDistance(m.c, cl.c) < 9);
    if (near) {
      const t = cl.n / (near.n + cl.n);
      near.c = [near.c[0] + (cl.c[0] - near.c[0]) * t, near.c[1] + (cl.c[1] - near.c[1]) * t, near.c[2] + (cl.c[2] - near.c[2]) * t];
      near.n += cl.n;
    } else merged.push({ c: [...cl.c] as RGB, n: cl.n });
  }
  const palette: PaletteEntry[] = merged
    .sort((a, b) => b.n - a.n)
    .map((m) => ({ rgb: m.c.map(Math.round) as RGB, hex: rgbToHex(m.c), name: pigmentName(m.c), family: colorFamily(m.c), weight: m.n / count }));

  // Visual focus = centre of mass of edge energy (where detail and contrast concentrate)
  let mx = 0, my = 0, mw = 0;
  for (let y = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++) {
      const m = f.mag[y * f.w + x]! ** 2;
      mx += m * (x + 0.5);
      my += m * (y + 0.5);
      mw += m;
    }
  }
  const fu = mw > 0 ? mx / mw / f.w : 0.5, fv = mw > 0 ? my / mw / f.h : 0.5;

  // Horizon: the row band with the strongest, widest vertical luminance change
  let bestRow = -1, bestVal = 0, meanRow = 0;
  const x0 = Math.floor(f.w * 0.1), x1 = Math.ceil(f.w * 0.9);
  const rows: number[] = [];
  for (let y = 2; y < f.h - 2; y++) {
    let s = 0;
    for (let x = x0; x < x1; x++) s += Math.abs(f.lumBlur[(y + 2) * f.w + x]! - f.lumBlur[(y - 2) * f.w + x]!);
    rows.push(s / (x1 - x0));
  }
  rows.forEach((v, i) => {
    meanRow += v;
    if (v > bestVal) {
      bestVal = v;
      bestRow = i + 2;
    }
  });
  meanRow /= Math.max(1, rows.length);
  const horizon =
    bestRow > 0 && bestVal > meanRow * 2.4 && bestVal > 0.05
      ? { v: bestRow / f.h, label: bestRow / f.h < 0.4 ? "a high horizon" : bestRow / f.h > 0.6 ? "a low horizon" : "a horizon near the middle" }
      : null;

  let meanMag = 0;
  for (let i = 0; i < n; i++) meanMag += f.mag[i]!;
  meanMag /= n;
  const detail = meanMag < 0.12 ? "soft" : meanMag < 0.24 ? "moderate" : "intricate";
  const ar = f.w / f.h;
  const orientation = ar > 1.08 ? "landscape" : ar < 0.92 ? "portrait" : "square";
  const key = meanLum > 0.62 ? "high-key" : meanLum < 0.36 ? "low-key" : "mid-key";

  const famW = new Map<ColorFamily, number>();
  for (const p of palette) famW.set(p.family, (famW.get(p.family) ?? 0) + p.weight);
  const colorFamilies = [...famW.entries()].filter(([, w]) => w >= 0.15).sort((a, b) => b[1] - a[1]).map(([fam]) => fam);

  const moods: string[] = [];
  moods.push(key === "high-key" ? "luminous" : key === "low-key" ? "nocturnal" : "balanced");
  moods.push(meanSat > 0.45 ? "vivid" : meanSat < 0.2 ? "muted" : "natural");
  moods.push(warmth > 0.12 ? "warm" : warmth < -0.12 ? "cool" : "temperate");
  moods.push(contrast > 0.24 ? "dramatic" : contrast < 0.12 ? "serene" : "quiet");

  return {
    palette,
    meanLum,
    contrast,
    meanSat,
    warmth,
    key,
    focus: { u: fu, v: fv, label: thirdsLabel(fu, fv) },
    horizon,
    detail,
    orientation,
    colorFamilies,
    moods,
    signature: normalize(sig),
  };
}
