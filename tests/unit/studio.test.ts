import { describe, expect, it } from "vitest";
import { analyze } from "@/lib/studio/analyze";
import { buildField } from "@/lib/studio/field";
import { aspectLabel, buildPrompts } from "@/lib/studio/prompt";
import { STYLE_IDS, STYLES_META } from "@/lib/studio/styles-meta";
import { cosine, normalize } from "@/lib/art/color";
import { traitsForSeed } from "@/lib/art/generative";

/** Synthetic "photo": blue sky over a warm field with a dark tree at the right third. */
function scene(w = 120, h = 90) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let c = y < h * 0.55 ? [70, 120, 200] : [210, 150, 60];
      if (Math.abs(x - w * 0.7) < 5 && y > h * 0.3 && y < h * 0.8) c = [30, 40, 25];
      d[i] = c[0]!;
      d[i + 1] = c[1]!;
      d[i + 2] = c[2]!;
      d[i + 3] = 255;
    }
  }
  return { d, w, h };
}

describe("studio analysis", () => {
  const { d, w, h } = scene();
  const a = analyze(buildField(d, w, h));

  it("finds the dominant palette and colour families", () => {
    expect(a.palette.length).toBeGreaterThanOrEqual(2);
    expect(a.colorFamilies).toContain("Blue");
    expect(a.palette.reduce((s, p) => s + p.weight, 0)).toBeCloseTo(1, 1);
  });

  it("locates the horizon and orientation", () => {
    expect(a.orientation).toBe("landscape");
    expect(a.horizon).not.toBeNull();
    expect(a.horizon!.v).toBeGreaterThan(0.45);
    expect(a.horizon!.v).toBeLessThan(0.65);
  });

  it("is deterministic and produces a unit-length 15-bin signature", () => {
    const b = analyze(buildField(d, w, h));
    expect(b).toEqual(a);
    expect(a.signature).toHaveLength(15);
    expect(cosine(a.signature, a.signature)).toBeCloseTo(1, 5);
  });
});

describe("prompt writer", () => {
  const { d, w, h } = scene();
  const a = analyze(buildField(d, w, h));
  const base = { analysis: a, subject: "a lone tree at the edge of a wheat field", aspect: 3 / 2, camera: "breathe" as const, intensity: 1, loopSeconds: 6, seed: 7 };

  it("snaps aspect labels to print ratios", () => {
    expect(aspectLabel(1)).toBe("1:1");
    expect(aspectLabel(1.5)).toBe("3:2");
    expect(aspectLabel(9 / 16)).toBe("9:16");
    expect(aspectLabel(1.333)).toBe("4:3");
  });

  it("writes complete prompts for every style", () => {
    for (const id of STYLE_IDS) {
      const p = buildPrompts({ ...base, styleId: id });
      expect(p.image).toContain("a lone tree at the edge of a wheat field");
      expect(p.image).toContain(STYLES_META[id].prompt.medium);
      expect(p.midjourney).toMatch(/--ar 3:2 /);
      expect(p.midjourney).toContain("--seed 7");
      expect(p.video).toContain("seamless 6-second loop");
      expect(p.video).toContain("last frame must match the first frame");
      expect(p.print).toMatch(/300 dpi/);
      expect(p.hashtags).toContain("#patronosstudio");
      expect(p.title).toMatch(/Lone tree at the edge of a wheat field — /);
    }
  });

  it("uses the fixed palette for palette-mapping styles and the source palette otherwise", () => {
    expect(buildPrompts({ ...base, styleId: "batik" }).image).toContain(STYLES_META.batik.prompt.fixedPalette!);
    expect(buildPrompts({ ...base, styleId: "impasto" }).image).toContain("Palette drawn from the source");
  });

  it("never names a living artist and always asks for an original work", () => {
    for (const id of STYLE_IDS) {
      const p = buildPrompts({ ...base, styleId: id });
      expect(p.image).toContain("an original work, not a copy");
    }
  });

  it("describes camera motion", () => {
    expect(buildPrompts({ ...base, styleId: "glass", camera: "still" }).video).toContain("locked-off camera, no zoom");
    expect(buildPrompts({ ...base, styleId: "glass", camera: "drift" }).video).toContain("circular drift");
  });
});

describe("art lens signatures", () => {
  it("matches a photo to seeded works with similar colours", () => {
    const { d, w, h } = scene();
    const sig = analyze(buildField(d, w, h)).signature;
    const scores = Array.from({ length: 64 }, (_, seed) => cosine(sig, traitsForSeed(seed + 1).signature));
    expect(Math.max(...scores)).toBeGreaterThan(0.5);
    expect(Math.min(...scores)).toBeLessThan(Math.max(...scores));
  });

  it("normalises to unit length", () => {
    const n = normalize([3, 4]);
    expect(n[0]).toBeCloseTo(0.6);
    expect(n[1]).toBeCloseTo(0.8);
  });
});
