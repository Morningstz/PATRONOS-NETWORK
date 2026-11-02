/** Pure colour utilities shared by the Studio, Art Lens and artwork traits (server + client). */

export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

/** h in [0,360), s,l in [0,1] */
export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  const R = r / 255, G = g / 255, B = b / 255;
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4;
  h = (h * 60 + 360) % 360;
  return [h, Math.min(1, s), l];
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}

function srgbToLinear(c: number) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** CIE L*a*b* (D65) — perceptual distance for colour naming. */
export function rgbToLab([r, g, b]: RGB): [number, number, number] {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function labDistance(a: RGB, b: RGB): number {
  const [l1, a1, b1] = rgbToLab(a);
  const [l2, a2, b2] = rgbToLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

export function luminance([r, g, b]: RGB): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Painter's pigment vocabulary — used to describe palettes in prompts and captions. */
export const PIGMENTS: Array<[string, string]> = [
  ["titanium white", "#f4f1ea"], ["warm ivory", "#efe4cc"], ["unbleached linen", "#e1d6bf"], ["pale silver", "#c9cbc8"],
  ["warm grey", "#8f877b"], ["slate grey", "#5d6670"], ["graphite", "#3a3b3d"], ["ivory black", "#151413"],
  ["lemon yellow", "#f2df4a"], ["cadmium yellow", "#f4b81c"], ["naples yellow", "#f0d38a"], ["yellow ochre", "#c8962e"],
  ["raw sienna", "#b5733a"], ["burnt sienna", "#8e4a2b"], ["raw umber", "#6b5638"], ["burnt umber", "#4a3122"],
  ["cadmium orange", "#ec7a26"], ["coral", "#e8765e"], ["vermilion", "#d9402b"], ["cadmium red", "#c32a2a"],
  ["alizarin crimson", "#8f1d2c"], ["rose madder", "#d77a8f"], ["blush pink", "#efc3c3"], ["magenta", "#b8337a"],
  ["dioxazine violet", "#4b2a6b"], ["lavender", "#a99bc9"], ["ultramarine", "#2c3f9e"], ["cobalt blue", "#2f5fb3"],
  ["cerulean", "#3d8fc4"], ["prussian blue", "#1d3349"], ["indigo", "#26304f"], ["powder blue", "#a9c7dc"],
  ["turquoise", "#3fb3a8"], ["viridian", "#2a7a64"], ["emerald", "#2f9a5a"], ["sap green", "#566b2b"],
  ["olive", "#7a7a3c"], ["sage", "#9fae8a"], ["moss", "#4c5a32"], ["teal", "#1f6b6f"],
  ["antique gold", "#b8913e"], ["bronze", "#8a6a3a"], ["terracotta", "#c06a45"], ["sand", "#d9c3a0"],
];

const PIGMENT_RGB = PIGMENTS.map(([n, h]) => [n, hexToRgb(h)] as const);

export function pigmentName(rgb: RGB): string {
  let best = PIGMENT_RGB[0]![0], bd = Infinity;
  for (const [n, c] of PIGMENT_RGB) {
    const d = labDistance(rgb, c);
    if (d < bd) {
      bd = d;
      best = n;
    }
  }
  return best;
}

export const COLOR_FAMILIES = ["Blue", "Red", "Orange & Yellow", "Green", "Purple & Pink", "Earth", "Black & Grey", "White & Cream"] as const;
export type ColorFamily = (typeof COLOR_FAMILIES)[number];

export function colorFamily(rgb: RGB): ColorFamily {
  const [h, s, l] = rgbToHsl(rgb);
  if (s < 0.14 || l < 0.1 || l > 0.92) return l > 0.72 ? "White & Cream" : "Black & Grey";
  // Low-saturation warm tones read as earth
  if (h >= 15 && h < 50 && (s < 0.45 || l < 0.42)) return l > 0.75 ? "White & Cream" : "Earth";
  if (h < 15 || h >= 340) return "Red";
  if (h < 65) return "Orange & Yellow";
  if (h < 170) return "Green";
  if (h < 255) return "Blue";
  return "Purple & Pink";
}

/** 15-bin colour signature: 12 hue bins (saturation-weighted) + 3 neutral bins (dark/mid/light). Unit length. */
export function signatureFromWeightedColors(colors: Array<{ rgb: RGB; weight: number }>): number[] {
  const v = new Array(15).fill(0);
  for (const { rgb, weight } of colors) addToSignature(v, rgb, weight);
  return normalize(v);
}

export function addToSignature(v: number[], rgb: RGB, weight = 1) {
  const [h, s, l] = rgbToHsl(rgb);
  if (s < 0.18 || l < 0.1 || l > 0.93) {
    v[12 + (l < 0.33 ? 0 : l < 0.66 ? 1 : 2)]! += weight;
    return;
  }
  v[Math.floor(h / 30) % 12]! += weight * s * 1.4;
}

export function normalize(v: number[]): number[] {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}

export function cosine(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] ?? 0) * (b[i] ?? 0);
  return s;
}
