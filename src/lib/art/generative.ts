/**
 * Shared definition of the deterministic generative demo artworks: palette + composition kind
 * come from the seed. Used by the SVG renderer, Art Lens, the Assistant and catalogue traits.
 */
import { colorFamily, hexToRgb, signatureFromWeightedColors, type ColorFamily, type RGB } from "./color";

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PALETTES: string[][] = [
  ["#1d1a17", "#c4532d", "#e9c46a", "#f4ede1", "#2a4b5c"],
  ["#0f1c2e", "#3e7cb1", "#9fd3c7", "#f2efe7", "#e07a5f"],
  ["#2b2118", "#a0522d", "#d9a066", "#efe2cc", "#5b6e4f"],
  ["#111111", "#e8e1d4", "#b8a993", "#6b5e4f", "#d1452f"],
  ["#1a2421", "#3f7d5c", "#c9d6a3", "#f3f0e6", "#c7883c"],
  ["#22142b", "#8c3b6b", "#e58f65", "#f6e7cf", "#3c6e8f"],
  ["#f1ebe0", "#1f2d3d", "#c0392b", "#e6b33e", "#7d8f85"],
  ["#0c2230", "#d96c3f", "#f2c14e", "#e9e4d9", "#5a8f7b"],
];

export const COMPOSITIONS = ["Orbits", "Colour field", "Shards", "Grid"] as const;
export type Composition = (typeof COMPOSITIONS)[number];

export function paletteOf(seed: number): string[] {
  return PALETTES[seed % PALETTES.length]!;
}

export function compositionOf(seed: number): Composition {
  return COMPOSITIONS[Math.floor(seed / PALETTES.length) % 4]!;
}

/** Approximate area weights: background dominates, accents share the rest. */
const WEIGHTS = [0.4, 0.18, 0.16, 0.14, 0.12];

export function weightedPalette(seed: number): Array<{ hex: string; rgb: RGB; weight: number }> {
  return paletteOf(seed).map((hex, i) => ({ hex, rgb: hexToRgb(hex), weight: WEIGHTS[i] ?? 0.1 }));
}

const COMPOSITION_MOODS: Record<Composition, string[]> = {
  Orbits: ["cosmic", "calm"],
  "Colour field": ["calm", "minimal"],
  Shards: ["bold", "dynamic"],
  Grid: ["playful", "geometric"],
};

export type ArtworkTraits = { colorFamilies: ColorFamily[]; moods: string[]; signature: number[]; composition: Composition };

/** Traits for a generative artwork. Real uploads get the same fields from image analysis. */
export function traitsForSeed(seed: number): ArtworkTraits {
  const wp = weightedPalette(seed);
  const famWeight = new Map<ColorFamily, number>();
  for (const c of wp) famWeight.set(colorFamily(c.rgb), (famWeight.get(colorFamily(c.rgb)) ?? 0) + c.weight);
  const colorFamilies = [...famWeight.entries()].filter(([, w]) => w >= 0.15).sort((a, b) => b[1] - a[1]).map(([f]) => f);

  const composition = compositionOf(seed);
  const moods = new Set(COMPOSITION_MOODS[composition]);
  const bg = wp[0]!.rgb;
  const bgLum = (0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2]) / 255;
  moods.add(bgLum < 0.3 ? "dark" : bgLum > 0.75 ? "light" : "mid-tone");
  const warmth = wp.reduce((s, c) => s + c.weight * (c.rgb[0] - c.rgb[2]), 0);
  moods.add(warmth > 15 ? "warm" : warmth < -15 ? "cool" : "balanced");

  return { colorFamilies, moods: [...moods], signature: signatureFromWeightedColors(wp), composition };
}

/** Artist discipline → browse category. */
export const DISCIPLINE_CATEGORY: Record<string, string> = {
  Painter: "Painting",
  Sculptor: "Sculpture",
  "Textile artist": "Textile",
  Ceramicist: "Ceramics",
  Printmaker: "Print",
  Photographer: "Photography",
  "Digital artist": "Digital",
  "Mixed media": "Mixed media",
};

export const CATEGORIES = ["Painting", "Sculpture", "Print", "Photography", "Textile", "Ceramics", "Digital", "Mixed media"] as const;
