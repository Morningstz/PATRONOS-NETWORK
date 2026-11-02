/**
 * Prompt writer: turns a style + what the analyser saw into detailed, reusable prompts
 * (image, Midjourney-style, negative, animation/video, print spec, caption). Pure and tested.
 */
import type { Analysis } from "./analyze";
import { STYLES_META, type StyleId } from "./styles-meta";

export type Camera = "still" | "breathe" | "drift";

export type PromptInput = {
  styleId: StyleId;
  analysis: Pick<Analysis, "palette" | "key" | "focus" | "horizon" | "moods" | "orientation" | "warmth" | "contrast" | "detail">;
  subject: string;
  /** Output aspect as width/height. */
  aspect: number;
  camera: Camera;
  /** Motion intensity 0.3 … 1.5 */
  intensity: number;
  loopSeconds: number;
  seed: number;
  title?: string;
};

export type Prompts = {
  title: string;
  image: string;
  midjourney: string;
  negative: string;
  video: string;
  print: string;
  caption: string;
  hashtags: string[];
};

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** "3:2", "4:5", "16:9"… from a ratio, snapped to common print ratios. */
export function aspectLabel(aspect: number): string {
  const common: Array<[number, number]> = [
    [1, 1], [4, 5], [5, 4], [3, 4], [4, 3], [2, 3], [3, 2], [9, 16], [16, 9], [21, 9], [1, 2], [2, 1],
  ];
  let best = common[0]!, bd = Infinity;
  for (const c of common) {
    const d = Math.abs(Math.log(aspect) - Math.log(c[0] / c[1]));
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  if (bd < 0.02) return `${best[0]}:${best[1]}`;
  const w = Math.round(aspect * 100), g = gcd(w, 100);
  return `${w / g}:${100 / g}`;
}

const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

export function paletteText(a: PromptInput["analysis"], n = 5): string {
  const names: string[] = [];
  for (const p of a.palette) {
    if (!names.includes(p.name)) names.push(p.name);
    if (names.length >= n) break;
  }
  return list(names);
}

function lightText(a: PromptInput["analysis"]): string {
  const key = a.key === "high-key" ? "a bright, high-key value range" : a.key === "low-key" ? "a deep, low-key value range" : "a balanced mid-key value range";
  const temp = a.warmth > 0.12 ? "warm" : a.warmth < -0.12 ? "cool" : "neutral";
  const con = a.contrast > 0.24 ? "strong contrast" : a.contrast < 0.12 ? "gentle contrast" : "moderate contrast";
  return `${key}, ${temp} overall temperature and ${con}`;
}

function cameraText(c: Camera, k: number): string {
  const amt = k < 0.6 ? "very subtle" : k > 1.15 ? "pronounced but smooth" : "gentle";
  if (c === "breathe") return `locked-off camera with a ${amt} slow push-in toward the focal point and back (a breathing zoom)`;
  if (c === "drift") return `slow, ${amt} circular drift of the camera across the canvas, no cuts`;
  return "locked-off camera, no zoom or pan — only the painting itself moves";
}

export function titleFor(input: PromptInput): string {
  if (input.title?.trim()) return input.title.trim();
  const style = STYLES_META[input.styleId];
  const subj = input.subject.trim().replace(/^(a|an|the)\s+/i, "");
  const short = subj.split(/[,;—–-]/)[0]!.trim();
  const cap = short.charAt(0).toUpperCase() + short.slice(1);
  return `${cap || "Untitled"} — ${style.name}`;
}

export function buildPrompts(input: PromptInput): Prompts {
  const s = STYLES_META[input.styleId];
  const a = input.analysis;
  const subject = input.subject.trim() || "the scene in the reference image";
  const ar = aspectLabel(input.aspect);
  const palette = s.prompt.fixedPalette ?? paletteText(a);
  const paletteSentence = s.prompt.fixedPalette
    ? `Palette: ${s.prompt.fixedPalette} (the style's own palette, re-mapping the source colours by value).`
    : `Palette drawn from the source: ${palette}.`;
  const comp = [
    `${a.orientation} ${ar} composition`,
    `the focal point in ${a.focus.label}`,
    a.horizon ? a.horizon.label : null,
  ]
    .filter(Boolean)
    .join(", ");

  const image = [
    `An original ${s.prompt.medium} of ${subject}.`,
    `Composition: ${comp}.`,
    `Technique: ${s.prompt.technique}.`,
    `Surface: ${s.prompt.surface}.`,
    `Light: ${s.prompt.light}; ${lightText(a)}.`,
    paletteSentence,
    `Mood: ${list(a.moods)}.`,
    `In the spirit of ${s.prompt.influences} — an original work, not a copy of any existing painting.`,
    `Museum-quality, highly detailed, true colour, no text, no watermark, no frame.`,
  ].join(" ");

  const stylize = a.detail === "intricate" ? 250 : a.detail === "soft" ? 120 : 180;
  const midjourney = `${subject}, ${s.prompt.tokens}, palette of ${palette}, focal point in ${a.focus.label}, ${a.moods.join(", ")} mood --ar ${ar} --s ${stylize} --seed ${input.seed % 4294967295} --no text, watermark, signature, frame, border, photo, 3d render, blurry`;

  const negative =
    "photorealistic photo, 3D render, CGI, plastic look, text, letters, watermark, signature, logo, frame, border, cropped subject, extra limbs, deformed hands, oversaturated neon, muddy colours, low resolution, jpeg artefacts, blurry, duplicated objects";

  const loop = input.loopSeconds;
  const video = [
    `Animate this ${s.name} painting as a seamless ${loop}-second loop (${ar}, 24–30 fps).`,
    `Motion: ${s.motion.prompt}.`,
    `Camera: ${cameraText(input.camera, input.intensity)}.`,
    `Keep the painted texture, brushwork and palette (${palette}) exactly as in the still; the subject (${subject}) keeps its shape and position — motion lives in the paint and the light, not in the drawing.`,
    `The last frame must match the first frame so the loop is invisible. No morphing faces, no new objects, no text.`,
    `Ambient sound suggestion: soft room tone with ${a.warmth > 0.12 ? "a warm, low drone" : a.warmth < -0.12 ? "a cool, airy pad" : "a quiet, neutral pad"}.`,
  ].join(" ");

  const sizes = [
    { px: 4096, label: "4096 px" },
    { px: 3072, label: "3072 px" },
  ];
  const long = (px: number, dpi: number) => ((px / dpi) * 2.54).toFixed(1);
  const short = (px: number, dpi: number) => (((px / Math.max(input.aspect, 1 / input.aspect)) / dpi) * 2.54).toFixed(1);
  const print = [
    `${s.prompt.print}`,
    ...sizes.map(
      (z) =>
        `${z.label} long edge → ${long(z.px, 300)} × ${short(z.px, 300)} cm at 300 dpi (fine-art giclée), or up to ${long(z.px, 150)} × ${short(z.px, 150)} cm at 150 dpi (viewing distance ≥ 1 m).`,
    ),
    `Ratio ${ar}. Export as PNG (sRGB); ask the print studio for a soft proof before the edition is printed.`,
  ].join(" ");

  const title = titleFor(input);
  const caption = `“${title}”. ${s.movement} reimagined: ${s.blurb} ${a.moods.length ? `A ${list(a.moods.slice(0, 3))} piece` : "A piece"} in ${palette}. Made in PATRONOS Studio.`;
  const tag = (x: string) => "#" + x.replace(/[^a-z0-9]+/gi, "").toLowerCase();
  const hashtags = [...new Set([tag(s.name), tag(s.movement), "#patronosstudio", "#seniindonesia", "#digitalpainting", "#livingart", ...a.moods.slice(0, 2).map(tag)])];

  return { title, image, midjourney, negative, video, print, caption, hashtags };
}
