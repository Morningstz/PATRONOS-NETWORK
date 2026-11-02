/**
 * The Studio painters. Each style is a generator that lays down marks in painting order and
 * yields its progress (0…1) — which is what makes the "being painted" animation real — plus a
 * live layer that loops seamlessly (every motion is periodic in the loop length T).
 *
 * All positions are computed in normalised (u,v) space and every size is multiplied by env.s,
 * so the same seed produces the same painting at preview, video and 4096 px print resolution.
 */
import { hexToRgb, rgbToHsl, type RGB } from "../art/color";
import { lumQuantile, sampleLum, sampleMag, sampleRgb, sampleTangent } from "./field";
import {
  TAU,
  between,
  ctx2d,
  detailPoint,
  drawBlurred,
  flowAngle,
  glow,
  mix,
  rgba,
  strokePts,
  texture,
  tracePath,
  tweak,
  vignette,
  wave,
  type Ctx,
  type LiveLayer,
  type PaintEnv,
} from "./kit";
import { mulberry32, smoothstep } from "./noise";
import { STYLES_META, type StyleId, type StyleMeta } from "./styles-meta";

export type StyleDef = StyleMeta & {
  paint(ctx: Ctx, env: PaintEnv): Generator<number, void, unknown>;
  live(env: PaintEnv): LiveLayer;
};

const offsetPts = (pts: number[], dx: number, dy: number) => pts.map((v, i) => v + (i % 2 ? dy : dx));
const longEdge = (env: PaintEnv) => Math.max(env.W, env.H);
const n = (env: PaintEnv, base: number) => Math.round(base * env.detail * Math.sqrt((env.W * env.H) / (env.s * env.s * 1e6)));

/** Underpainting: the source, blurred so that only masses of colour remain. */
function underpaint(ctx: Ctx, env: PaintEnv, smallLong: number) {
  drawBlurred(ctx, env.src, env.W, env.H, longEdge(env) / smallLong);
}

// ───────────────────────────── Impasto Swirl ─────────────────────────────
const impasto: StyleDef = {
  ...STYLES_META.impasto,
  *paint(ctx, env) {
    const { W, H, s, rnd, field } = env;
    underpaint(ctx, env, 34);
    ctx.fillStyle = "rgba(20,16,10,0.1)";
    ctx.fillRect(0, 0, W, H);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const angle = flowAngle(env, 1, 3);
    const layers = [
      { count: n(env, 650), len: [50, 110], w: [11, 17], detail: 0 },
      { count: n(env, 2100), len: [26, 60], w: [6.5, 10.5], detail: 0 },
      { count: n(env, 4200), len: [12, 30], w: [3.2, 6], detail: 2.4 },
    ] as const;
    const total = layers.reduce((a, l) => a + l.count, 0);
    let done = 0;
    for (const L of layers) {
      for (let i = 0; i < L.count; i++) {
        const [u, v] = L.detail ? detailPoint(env, L.detail) : [rnd(), rnd()];
        const c = tweak(sampleRgb(field, u, v), { sat: 1.3, light: (rnd() - 0.5) * 0.09, hue: (rnd() - 0.5) * 8 });
        const len = between(rnd, L.len[0], L.len[1]) * s;
        const step = 3.5 * s;
        const pts = tracePath(env, angle, u, v, Math.max(2, Math.round(len / step)), step);
        const w = between(rnd, L.w[0], L.w[1]) * s;
        ctx.globalAlpha = 0.42;
        strokePts(ctx, offsetPts(pts, 0.8 * s, 1 * s), w, rgba(tweak(c, { light: -0.2 })));
        ctx.globalAlpha = 0.96;
        strokePts(ctx, pts, w * 0.86, rgba(c));
        ctx.globalAlpha = 0.5;
        strokePts(ctx, offsetPts(pts, -w * 0.18, -w * 0.22), w * 0.22, rgba(tweak(c, { light: 0.17 })));
        if (++done % 50 === 0) yield done / total;
      }
    }
    ctx.globalAlpha = 1;
    texture(ctx, env, "canvas", 0.22);
    yield 1;
  },
  live(env) {
    const r = mulberry32(env.seed + 101);
    const angle = flowAngle(env, 1, 3);
    const strokes = Array.from({ length: Math.round(650 * Math.min(1.4, env.detail)) }, () => {
      const u = r(), v = r();
      return {
        pts: tracePath(env, angle, u, v, 34, 4 * env.s),
        c: rgba(tweak(sampleRgb(env.field, u, v), { sat: 1.4, light: 0.07 })),
        w: between(r, 3, 6.5) * env.s,
        off: r(),
      };
    });
    return {
      draw(ctx, t, T, k) {
        ctx.lineCap = "round";
        for (const p of strokes) {
          const segs = p.pts.length / 2;
          if (segs < 6) continue;
          const ph = (2 * (t / T) + p.off) % 1;
          const win = 9;
          const head = ph * (segs + win);
          const a = Math.max(0, Math.floor(head - win)), b = Math.min(segs, Math.floor(head));
          if (b - a < 2) continue;
          ctx.globalAlpha = Math.sin(Math.PI * ph) * 0.55 * Math.min(1, k);
          strokePts(ctx, p.pts.slice(a * 2, b * 2), p.w * Math.max(0.7, k), p.c);
        }
        ctx.globalAlpha = 1;
      },
    };
  },
};

// ─────────────────────────── Impressionist Light ───────────────────────────
const WARM_LIGHT: RGB = [255, 226, 160];
const VIOLET_SHADOW: RGB = [82, 72, 140];

function impressionistColor(env: PaintEnv, u: number, v: number): RGB {
  const { rnd, field } = env;
  let c = tweak(sampleRgb(field, u, v), { sat: 1.22, hue: (rnd() - 0.5) * 24, light: (rnd() - 0.5) * 0.1 });
  const L = sampleLum(field, u, v);
  if (L > 0.62) c = mix(c, WARM_LIGHT, 0.18);
  else if (L < 0.35) c = mix(c, VIOLET_SHADOW, 0.22);
  return c;
}

const impressionist: StyleDef = {
  ...STYLES_META.impressionist,
  *paint(ctx, env) {
    const { W, H, s, rnd, field } = env;
    underpaint(ctx, env, 46);
    ctx.fillStyle = "rgba(255,250,235,0.08)";
    ctx.fillRect(0, 0, W, H);
    ctx.lineCap = "round";
    const angle = (u: number, v: number) => {
      const base = -0.12 + env.noise(u * 4, v * 4) * 0.9;
      const t = sampleTangent(field, u, v);
      const w = 0.35 * sampleMag(field, u, v);
      return Math.atan2(Math.sin(base) * (1 - w) + Math.sin(t) * w, Math.cos(base) * (1 - w) + Math.cos(t) * w);
    };
    const passes = [
      { count: n(env, 3200), len: [10, 18], w: [7, 11], bias: 0 },
      { count: n(env, 6400), len: [6, 12], w: [4.5, 7], bias: 1.6 },
    ] as const;
    const sparkle = n(env, 1500);
    const total = passes[0].count + passes[1].count + sparkle;
    let done = 0;
    for (const P of passes) {
      for (let i = 0; i < P.count; i++) {
        const [u, v] = P.bias ? detailPoint(env, P.bias) : [rnd(), rnd()];
        const a = angle(u, v), len = between(rnd, P.len[0], P.len[1]) * s;
        const x = u * W, y = v * H;
        ctx.globalAlpha = 0.88;
        ctx.strokeStyle = rgba(impressionistColor(env, u, v));
        ctx.lineWidth = between(rnd, P.w[0], P.w[1]) * s;
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(a) * len * 0.5, y - Math.sin(a) * len * 0.5);
        ctx.lineTo(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5);
        ctx.stroke();
        if (++done % 80 === 0) yield done / total;
      }
    }
    for (let i = 0; i < sparkle; i++) {
      const u = rnd(), v = rnd();
      if (sampleLum(field, u, v) < 0.6) continue;
      const a = angle(u, v), len = between(rnd, 4, 8) * s;
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = rgba(mix(sampleRgb(field, u, v), [255, 245, 215], 0.45));
      ctx.lineWidth = between(rnd, 3, 5) * s;
      ctx.beginPath();
      ctx.moveTo(u * W, v * H);
      ctx.lineTo(u * W + Math.cos(a) * len, v * H + Math.sin(a) * len);
      ctx.stroke();
      if (++done % 80 === 0) yield done / total;
    }
    ctx.globalAlpha = 1;
    texture(ctx, env, "canvas", 0.15);
    yield 1;
  },
  live(env) {
    const r = mulberry32(env.seed + 202);
    const dabs = Array.from({ length: Math.round(1400 * Math.min(1.4, env.detail)) }, () => {
      const u = r(), v = r();
      const L = sampleLum(env.field, u, v);
      return {
        x: u * env.W,
        y: v * env.H,
        a: -0.1 + (r() - 0.5) * 0.5,
        len: between(r, 6, 12) * env.s,
        w: between(r, 3.5, 6) * env.s,
        c: rgba(tweak(mix(sampleRgb(env.field, u, v), L > 0.55 ? WARM_LIGHT : [255, 255, 255], 0.3), { sat: 1.2, light: 0.08 })),
        ph: r(),
        cyc: 1 + Math.floor(r() * 3),
      };
    });
    return {
      draw(ctx, t, T, k) {
        ctx.lineCap = "round";
        for (const d of dabs) {
          const w = wave(t, T, d.cyc, d.ph);
          ctx.globalAlpha = Math.max(0, w) * 0.75 * Math.min(1, k);
          if (ctx.globalAlpha < 0.02) continue;
          const sway = w * 2.4 * env.s * k;
          ctx.strokeStyle = d.c;
          ctx.lineWidth = d.w;
          ctx.beginPath();
          ctx.moveTo(d.x + sway, d.y);
          ctx.lineTo(d.x + sway + Math.cos(d.a) * d.len, d.y + Math.sin(d.a) * d.len);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        const f = env.analysis.focus;
        glow(ctx, f.u * env.W, f.v * env.H, longEdge(env) * 0.45, [255, 236, 190], 0.05 * k * (1 + wave(t, T, 1)));
      },
    };
  },
};

// ─────────────────────────────── Pointillist ───────────────────────────────
function dotColor(env: PaintEnv, u: number, v: number, r: () => number): RGB {
  const c = sampleRgb(env.field, u, v);
  const [, , l] = rgbToHsl(c);
  const roll = r();
  if (roll < 0.66) return tweak(c, { sat: 1.5, light: (r() - 0.5) * 0.08 });
  if (roll < 0.86) return tweak(c, { sat: 1.55, hue: r() < 0.5 ? 28 : -28 });
  if (l < 0.45) return tweak(c, { hue: 180, sat: 0.85, light: -0.04 });
  return mix(c, [255, 244, 214], 0.4);
}

const pointillist: StyleDef = {
  ...STYLES_META.pointillist,
  *paint(ctx, env) {
    const { W, H, s, rnd } = env;
    ctx.fillStyle = "#f3ecdc";
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.35;
    underpaint(ctx, env, 26);
    ctx.globalAlpha = 1;
    const gap = (7.2 * s) / Math.sqrt(env.detail);
    const cols = Math.ceil(W / gap), rows = Math.ceil(H / gap);
    const order = Array.from({ length: cols * rows }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [order[i], order[j]] = [order[j]!, order[i]!];
    }
    const extra = n(env, 9000);
    const total = order.length + extra;
    let done = 0;
    for (const idx of order) {
      const cx = ((idx % cols) + 0.5 + (rnd() - 0.5) * 0.8) * gap;
      const cy = (Math.floor(idx / cols) + 0.5 + (rnd() - 0.5) * 0.8) * gap;
      ctx.fillStyle = rgba(dotColor(env, cx / W, cy / H, rnd));
      ctx.beginPath();
      ctx.arc(cx, cy, gap * between(rnd, 0.42, 0.6), 0, TAU);
      ctx.fill();
      if (++done % 400 === 0) yield done / total;
    }
    for (let i = 0; i < extra; i++) {
      const [u, v] = detailPoint(env, 2.5);
      ctx.fillStyle = rgba(dotColor(env, u, v, rnd));
      ctx.beginPath();
      ctx.arc(u * W, v * H, gap * 0.32, 0, TAU);
      ctx.fill();
      if (++done % 400 === 0) yield done / total;
    }
    texture(ctx, env, "paper", 0.18);
    yield 1;
  },
  live(env) {
    const r = mulberry32(env.seed + 303);
    const gap = (7.2 * env.s) / Math.sqrt(env.detail);
    const dots = Array.from({ length: Math.round(2400 * Math.min(1.4, env.detail)) }, () => {
      const u = r(), v = r();
      return { x: u * env.W, y: v * env.H, c: rgba(tweak(dotColor(env, u, v, r), { light: 0.06 })), rad: gap * between(r, 0.35, 0.55), ph: r(), cyc: 1 + Math.floor(r() * 3) };
    });
    return {
      draw(ctx, t, T, k) {
        for (const d of dots) {
          const w = wave(t, T, d.cyc, d.ph);
          if (w <= 0) continue;
          ctx.globalAlpha = w * 0.9 * Math.min(1, k);
          ctx.fillStyle = d.c;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.rad * (1 + 0.35 * w * k), 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    };
  },
};

// ─────────────────────────────── Old Master ───────────────────────────────
const LIGHT_POS = { u: 0.3, v: 0.2 };
const oldmaster: StyleDef = {
  ...STYLES_META.oldmaster,
  *paint(ctx, env) {
    const { W, H, s, rnd, field } = env;
    underpaint(ctx, env, 70);
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgba(160,118,64,0.42)";
    ctx.fillRect(0, 0, W, H);
    const lg = ctx.createRadialGradient(LIGHT_POS.u * W, LIGHT_POS.v * H, 0, LIGHT_POS.u * W, LIGHT_POS.v * H, Math.hypot(W, H) * 0.95);
    lg.addColorStop(0, "rgba(255,255,255,1)");
    lg.addColorStop(0.45, "rgba(170,140,110,1)");
    lg.addColorStop(1, "rgba(30,20,12,1)");
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    yield 0.15;
    ctx.lineCap = "round";
    const angle = flowAngle(env, 0.25, 2);
    const broad = n(env, 2600), fine = n(env, 1800), total = broad + fine;
    let done = 0;
    const shade = (u: number, v: number, c: RGB) => {
      const d = Math.hypot(u - LIGHT_POS.u, (v - LIGHT_POS.v) * (H / W));
      const f = 1 - 0.62 * smoothstep(0.15, 1.0, d);
      return [c[0] * f, c[1] * f, c[2] * f] as RGB;
    };
    for (let i = 0; i < broad; i++) {
      const u = rnd(), v = rnd();
      const c = shade(u, v, mix(tweak(sampleRgb(field, u, v), { sat: 0.85 }), [150, 100, 50], 0.2));
      const len = between(rnd, 20, 48) * s;
      ctx.globalAlpha = 0.28;
      strokePts(ctx, tracePath(env, angle, u, v, Math.round(len / (4 * s)), 4 * s), between(rnd, 10, 22) * s, rgba(c));
      if (++done % 60 === 0) yield 0.15 + 0.65 * (done / total);
    }
    for (let i = 0; i < fine; i++) {
      const [u, v] = detailPoint(env, 3);
      const c = shade(u, v, mix(sampleRgb(field, u, v), [150, 100, 50], 0.12));
      ctx.globalAlpha = 0.55;
      strokePts(ctx, tracePath(env, angle, u, v, 4, 3 * s), between(rnd, 2, 4) * s, rgba(c));
      if (++done % 60 === 0) yield 0.15 + 0.65 * (done / total);
    }
    ctx.globalAlpha = 1;
    // Craquelure
    ctx.strokeStyle = "rgba(25,15,8,0.2)";
    ctx.lineWidth = 0.7 * s;
    for (let c = 0; c < 60; c++) {
      let x = rnd() * W, y = rnd() * H, a = rnd() * TAU;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 28; k++) {
        a += (rnd() - 0.5) * 1.3;
        x += Math.cos(a) * 11 * s;
        y += Math.sin(a) * 11 * s;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgba(232,192,120,0.14)";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    vignette(ctx, W, H, 0.55);
    texture(ctx, env, "canvas", 0.12);
    yield 1;
  },
  live(env) {
    const r = mulberry32(env.seed + 404);
    const { W, H, s } = env;
    const motes = Array.from({ length: 80 }, () => ({ x: (LIGHT_POS.u + (r() - 0.3) * 0.6) * W, y: (LIGHT_POS.v + r() * 0.8) * H, size: between(r, 0.8, 2.2) * s, off: r(), drift: between(r, 0.08, 0.2) * H }));
    return {
      draw(ctx, t, T, k) {
        const flick = 0.5 + 0.5 * (0.7 * wave(t, T, 2) + 0.3 * wave(t, T, 5, 0.17));
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        glow(ctx, LIGHT_POS.u * W, LIGHT_POS.v * H, Math.hypot(W, H) * 0.6, [255, 205, 140], 0.22 * k * flick);
        ctx.restore();
        for (const m of motes) {
          const ph = (t / T + m.off) % 1;
          ctx.globalAlpha = Math.sin(Math.PI * ph) * 0.55 * Math.min(1, k);
          ctx.fillStyle = "rgb(255,232,186)";
          ctx.beginPath();
          ctx.arc(m.x + Math.sin(TAU * ph) * 6 * s, m.y - ph * m.drift, m.size, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    };
  },
};

// ─────────────────────────────── Watercolour ───────────────────────────────
function flatColor(env: PaintEnv, u: number, v: number): RGB {
  const c = sampleRgb(env.field, u, v);
  let best = env.analysis.palette[0]?.rgb ?? c, bd = Infinity;
  for (const p of env.analysis.palette) {
    const d = (p.rgb[0] - c[0]) ** 2 + (p.rgb[1] - c[1]) ** 2 + (p.rgb[2] - c[2]) ** 2;
    if (d < bd) {
      bd = d;
      best = p.rgb;
    }
  }
  return tweak(mix(best, c, 0.6), { sat: 1.15, light: 0.02 });
}

function wash(ctx: Ctx, x: number, y: number, r: number, c: RGB, a: number, edge: boolean, s: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(c, a));
  g.addColorStop(0.72, rgba(c, a * 0.75));
  g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  if (edge) {
    ctx.strokeStyle = rgba(tweak(c, { light: -0.14 }), a * 0.45);
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.8, 0, TAU);
    ctx.stroke();
  }
}

const watercolor: StyleDef = {
  ...STYLES_META.watercolor,
  *paint(ctx, env) {
    const { W, H, s, rnd, field } = env;
    ctx.fillStyle = "#fbf7ee";
    ctx.fillRect(0, 0, W, H);
    // Wet-in-wet first wash: the whole scene, very soft and pale
    ctx.save();
    ctx.globalAlpha = 0.5;
    underpaint(ctx, env, 60);
    ctx.fillStyle = "rgba(251,247,238,0.28)";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    yield 0.04;
    const passes = [
      { count: n(env, 700), r: [26, 60], a: 0.16, bias: 0 },
      { count: n(env, 2000), r: [9, 24], a: 0.24, bias: 1.5 },
      { count: n(env, 1600), r: [3.5, 9], a: 0.34, bias: 2.6 },
    ] as const;
    const lines = n(env, 2600);
    const total = passes.reduce((a, p) => a + p.count, 0) + lines;
    let done = 0;
    for (const P of passes) {
      for (let i = 0; i < P.count; i++) {
        const [u, v] = P.bias ? detailPoint(env, P.bias) : [rnd(), rnd()];
        wash(ctx, u * W, v * H, between(rnd, P.r[0], P.r[1]) * s, flatColor(env, u, v), P.a, rnd() < 0.18, s);
        if (++done % 60 === 0) yield done / total;
      }
    }
    const angle = (u: number, v: number) => sampleTangent(field, u, v);
    ctx.lineCap = "round";
    for (let i = 0; i < lines; i++) {
      const [u, v] = detailPoint(env, 3.2);
      if (sampleMag(field, u, v) < 0.3) continue;
      ctx.globalAlpha = 0.42;
      strokePts(ctx, tracePath(env, angle, u, v, 5, 3.6 * s), 0.8 * s, rgba(tweak(sampleRgb(field, u, v), { light: -0.32, sat: 0.7 })));
      if (++done % 120 === 0) yield done / total;
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < n(env, 6000); i++) {
      const u = rnd(), v = rnd();
      ctx.fillStyle = rgba(tweak(flatColor(env, u, v), { light: -0.18 }), 0.18);
      ctx.fillRect(u * W, v * H, 1.2 * s, 1.2 * s);
    }
    texture(ctx, env, "paper", 0.35);
    yield 1;
  },
  live(env) {
    const r = mulberry32(env.seed + 505);
    const blooms = Array.from({ length: 40 }, () => {
      const u = r(), v = r();
      return { x: u * env.W, y: v * env.H, r0: between(r, 30, 90) * env.s, c: flatColor(env, u, v), off: r() };
    });
    return {
      draw(ctx, t, T, k) {
        for (const b of blooms) {
          const ph = (t / T + b.off) % 1;
          wash(ctx, b.x, b.y, b.r0 * (0.35 + 0.65 * ph), b.c, Math.sin(Math.PI * ph) * 0.13 * Math.min(1.2, k), false, env.s);
        }
      },
    };
  },
};

// ─────────────────────────── Pixel-tone helpers ───────────────────────────
/** Run a per-pixel colour function over W×H, yielding progress by rows. */
function* pixelPass(ctx: Ctx, env: PaintEnv, fn: (u: number, v: number, out: number[]) => void, from: number, to: number) {
  const { W, H } = env;
  const img = ctx.createImageData(W, H);
  const out = [0, 0, 0, 255];
  const chunk = Math.max(16, Math.round(H / 40));
  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H;
    for (let x = 0; x < W; x++) {
      fn((x + 0.5) / W, v, out);
      const i = (y * W + x) * 4;
      img.data[i] = out[0]!;
      img.data[i + 1] = out[1]!;
      img.data[i + 2] = out[2]!;
      img.data[i + 3] = out[3]!;
    }
    if (y % chunk === 0) yield from + (to - from) * (y / H);
  }
  return img;
}

const redmean = (a: RGB, b: number[]) => {
  const rm = (a[0] + b[0]!) / 2;
  const dr = a[0] - b[0]!, dg = a[1] - b[1]!, db = a[2] - b[2]!;
  return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
};

// ─────────────────────────────── Ukiyo-e ───────────────────────────────
const UKIYO: RGB[] = [
  [239, 230, 210], // washi
  [29, 27, 26], // sumi
  [31, 58, 90], // prussian
  [46, 74, 107], // indigo
  [127, 161, 184], // light ai
  [200, 69, 44], // vermilion
  [214, 165, 74], // ochre
  [125, 138, 90], // sage
  [74, 110, 62], // pine green
  [152, 178, 104], // young-rice green
  [178, 204, 214], // pale sky
  [233, 184, 168], // pale pink
  [92, 70, 52], // umber
  [104, 62, 104], // murasaki
];

const ukiyoe: StyleDef = {
  ...STYLES_META.ukiyoe,
  *paint(ctx, env) {
    const { W, H, s, rnd, field } = env;
    const labels = new Uint8Array(W * H);
    let idx = 0;
    const gen = pixelPass(
      ctx,
      env,
      (u, v, out) => {
        const c = tweak(sampleRgb(field, u, v), { sat: 1.3 });
        let best = 0, bd = Infinity;
        for (let i = 0; i < UKIYO.length; i++) {
          const d = redmean(c, UKIYO[i]!);
          if (d < bd) {
            bd = d;
            best = i;
          }
        }
        labels[idx++] = best;
        const p = UKIYO[best]!;
        out[0] = p[0];
        out[1] = p[1];
        out[2] = p[2];
        out[3] = 255;
      },
      0,
      0.6,
    );
    let res = gen.next();
    while (!res.done) {
      yield res.value;
      res = gen.next();
    }
    const img = res.value;
    // Sumi outlines where the flat colour changes
    const rad = Math.max(1, Math.round(1.1 * s));
    const sumi = UKIYO[1]!;
    for (let y = 0; y < H - 1; y++) {
      for (let x = 0; x < W - 1; x++) {
        const i = y * W + x;
        if (labels[i] !== labels[i + 1] || labels[i] !== labels[i + W]) {
          for (let dy = -rad + 1; dy < rad; dy++) {
            for (let dx = -rad + 1; dx < rad; dx++) {
              const xx = x + dx, yy = y + dy;
              if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
              const j = (yy * W + xx) * 4;
              img.data[j] = sumi[0];
              img.data[j + 1] = sumi[1];
              img.data[j + 2] = sumi[2];
            }
          }
        }
      }
      if (y % 200 === 0) yield 0.6 + 0.25 * (y / H);
    }
    ctx.putImageData(img, 0, 0);
    // Bokashi sky
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.38);
    g.addColorStop(0, "rgba(31,58,90,0.55)");
    g.addColorStop(1, "rgba(31,58,90,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H * 0.38);
    // Woodgrain
    ctx.strokeStyle = "rgba(120,96,64,0.06)";
    ctx.lineWidth = 1 * s;
    for (let i = 0; i < 70; i++) {
      const y0 = rnd() * H;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 24 * s) {
        const y = y0 + Math.sin(x / (90 * s) + i) * 3 * s;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    texture(ctx, env, "washi", 0.3);
    // Seal (abstract, no characters)
    const sz = 44 * s, sx = W - sz - 34 * s, sy = H - sz * 1.6 - 34 * s;
    ctx.fillStyle = "rgba(200,69,44,0.9)";
    ctx.fillRect(sx, sy, sz, sz * 1.6);
    ctx.fillStyle = "rgba(239,230,210,0.85)";
    ctx.fillRect(sx + sz * 0.2, sy + sz * 0.18, sz * 0.14, sz * 1.24);
    ctx.fillRect(sx + sz * 0.62, sy + sz * 0.18, sz * 0.14, sz * 1.24);
    ctx.fillRect(sx + sz * 0.2, sy + sz * 0.72, sz * 0.56, sz * 0.12);
    yield 1;
  },
  live(env) {
    const { W, H } = env;
    const r = mulberry32(env.seed + 606);
    const band = env.make(Math.round(W), Math.round(H * 0.12));
    const bx = ctx2d(band);
    for (let i = 0; i < 40; i++) {
      const x = r() * band.width, y = band.height * (0.3 + r() * 0.4), rr = band.height * between(r, 0.25, 0.5);
      const g = bx.createRadialGradient(x, y, 0, x, y, rr * 2.2);
      g.addColorStop(0, "rgba(244,238,224,0.55)");
      g.addColorStop(1, "rgba(244,238,224,0)");
      bx.fillStyle = g;
      for (const wrap of [-band.width, 0, band.width]) {
        bx.save();
        bx.translate(wrap, 0);
        bx.fillRect(x - rr * 2.2, y - rr * 2.2, rr * 4.4, rr * 4.4);
        bx.restore();
      }
    }
    // Feather the band's top and bottom so it never shows a hard edge
    const fade = bx.createLinearGradient(0, 0, 0, band.height);
    fade.addColorStop(0, "rgba(0,0,0,0)");
    fade.addColorStop(0.35, "rgba(0,0,0,1)");
    fade.addColorStop(0.65, "rgba(0,0,0,1)");
    fade.addColorStop(1, "rgba(0,0,0,0)");
    bx.globalCompositeOperation = "destination-in";
    bx.fillStyle = fade;
    bx.fillRect(0, 0, band.width, band.height);
    const bands = Array.from({ length: 4 }, (_, i) => ({ y: H * (0.12 + i * 0.2 + r() * 0.06), off: r(), dir: i % 2 ? -1 : 1 }));
    return {
      draw(ctx, t, T, k) {
        ctx.globalAlpha = 0.32 * Math.min(1, k);
        for (const b of bands) {
          const x = (((t / T) * b.dir + b.off) % 1 + 1) % 1 * W;
          ctx.drawImage(band, x - W, b.y);
          ctx.drawImage(band, x, b.y);
        }
        ctx.globalAlpha = 1;
        const g = ctx.createLinearGradient(0, 0, 0, H * 0.3);
        g.addColorStop(0, `rgba(31,58,90,${0.1 * k * (0.5 + 0.5 * wave(t, T, 1))})`);
        g.addColorStop(1, "rgba(31,58,90,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H * 0.3);
      },
    };
  },
};

// ─────────────────────────────── Stencil Street ───────────────────────────────
type Drip = { x: number; y: number; len: number; w: number; off: number };

const stencil: StyleDef = {
  ...STYLES_META.stencil,
  *paint(ctx, env) {
    const { W, H, s, rnd, field, analysis } = env;
    ctx.fillStyle = "#8d8a84";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 46; i++) glow(ctx, rnd() * W, rnd() * H, between(rnd, 60, 240) * s, rnd() < 0.5 ? [70, 66, 60] : [176, 172, 164], 0.16);
    ctx.strokeStyle = "rgba(68,66,62,0.4)";
    ctx.lineWidth = 2 * s;
    const blockH = 140 * s, blockW = 300 * s;
    for (let y = blockH; y < H; y += blockH) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
      const shift = (Math.round(y / blockH) % 2) * blockW * 0.5;
      for (let x = shift; x < W; x += blockW) {
        ctx.beginPath();
        ctx.moveTo(x, y - blockH);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
    texture(ctx, env, "concrete", 0.45);
    yield 0.12;

    const t1 = lumQuantile(field, 0.36), t2 = lumQuantile(field, 0.68);
    const vivid = analysis.palette.map((p) => p.rgb).find((c) => rgbToHsl(c)[1] > 0.32);
    const accent: RGB = vivid ? tweak(vivid, { sat: 1.35, minL: 0.4, maxL: 0.58 }) : [210, 60, 42];
    const black: RGB = [18, 18, 18];
    const eps = 0.012;
    const layerCanvas = env.make(W, H);
    const lx = ctx2d(layerCanvas);
    const gen = pixelPass(
      lx,
      env,
      (u, v, out) => {
        const L = sampleLum(field, u, v) + env.noise(u * 90, v * 90) * 0.02;
        const dark = 1 - smoothstep(t1 - eps, t1 + eps, L);
        const mid = 1 - smoothstep(t2 - eps, t2 + eps, L);
        const c = dark > 0.5 ? black : accent;
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
        out[3] = Math.round(255 * Math.max(dark, mid) * 0.96);
      },
      0.12,
      0.8,
    );
    let res = gen.next();
    while (!res.done) {
      yield res.value;
      res = gen.next();
    }
    lx.putImageData(res.value, 0, 0);
    ctx.drawImage(layerCanvas, 0, 0);
    // Overspray along the cut edges
    for (let i = 0; i < n(env, 9000); i++) {
      const u = rnd(), v = rnd();
      const L = sampleLum(field, u, v);
      const near1 = Math.abs(L - t1) < 0.035, near2 = Math.abs(L - t2) < 0.035;
      if (!near1 && !near2) continue;
      ctx.fillStyle = rgba(near1 ? black : accent, 0.35);
      ctx.beginPath();
      ctx.arc(u * W + (rnd() - 0.5) * 9 * s, v * H + (rnd() - 0.5) * 9 * s, between(rnd, 0.6, 1.6) * s, 0, TAU);
      ctx.fill();
    }
    // Drips from the lower edges of dark shapes
    const drips: Drip[] = [];
    for (let i = 0; i < 1400 && drips.length < 42; i++) {
      const u = rnd(), v = rnd();
      if (sampleLum(field, u, v) < t1 && sampleLum(field, u, v + 0.02) > t1 + 0.02) {
        drips.push({ x: u * W, y: v * H + 0.01 * H, len: between(rnd, 20, 140) * s, w: between(rnd, 1.4, 2.8) * s, off: rnd() });
      }
    }
    for (const d of drips) {
      ctx.strokeStyle = rgba(black, 0.85);
      ctx.lineWidth = d.w;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x, d.y + d.len);
      ctx.stroke();
      ctx.fillStyle = rgba(black, 0.85);
      ctx.beginPath();
      ctx.arc(d.x, d.y + d.len, d.w * 0.9, 0, TAU);
      ctx.fill();
    }
    env.store.drips = drips;
    texture(ctx, env, "concrete", 0.22);
    yield 1;
  },
  live(env) {
    const drips = (env.store.drips as Drip[] | undefined) ?? [];
    const { W, H, s } = env;
    return {
      draw(ctx, t, T, k) {
        ctx.lineCap = "round";
        for (const d of drips) {
          const ph = (t / T + d.off) % 1;
          const extra = d.len * 0.45 * Math.sin(Math.PI * ph) * k;
          if (extra < 1) continue;
          ctx.strokeStyle = "rgba(18,18,18,0.85)";
          ctx.lineWidth = d.w;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y + d.len);
          ctx.lineTo(d.x, d.y + d.len + extra);
          ctx.stroke();
          ctx.fillStyle = "rgba(18,18,18,0.85)";
          ctx.beginPath();
          ctx.arc(d.x, d.y + d.len + extra, d.w * 0.95, 0, TAU);
          ctx.fill();
        }
        // Spray mist: deterministic per frame step, so the loop repeats exactly
        const step = Math.floor((t / T) * 48) % 48;
        const r = mulberry32(env.seed * 13 + step);
        for (let i = 0; i < 90 * k; i++) {
          ctx.fillStyle = `rgba(255,255,255,${0.12 * r()})`;
          ctx.fillRect(r() * W, r() * H, 1.4 * s, 1.4 * s);
        }
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        glow(ctx, ((t / T) * 1.6 - 0.3) * W, H * 0.25, Math.max(W, H) * 0.5, [255, 214, 150], 0.35 * k);
        ctx.restore();
      },
    };
  },
};

// ─────────────────────────────── Batik Sogan ───────────────────────────────
const BATIK = { cream: [234, 217, 184] as RGB, soga: [138, 79, 36] as RGB, deep: [74, 38, 20] as RGB, indigo: [31, 42, 68] as RGB, ink: [24, 20, 26] as RGB };
type Crack = number[];

const batik: StyleDef = {
  ...STYLES_META.batik,
  *paint(ctx, env) {
    const { W, H, s, rnd, field } = env;
    const q1 = lumQuantile(field, 0.2), q2 = lumQuantile(field, 0.45), q3 = lumQuantile(field, 0.7);
    const tones = [BATIK.indigo, BATIK.deep, BATIK.soga, BATIK.cream];
    const thresholds = [q1, q2, q3];
    const e = 0.015;
    const gen = pixelPass(
      ctx,
      env,
      (u, v, out) => {
        const L = sampleLum(field, u, v);
        let c: RGB = tones[0]!;
        for (let i = 0; i < 3; i++) {
          const tt = smoothstep(thresholds[i]! - e, thresholds[i]! + e, L);
          if (tt > 0) c = mix(c, tones[i + 1]!, tt);
        }
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
        out[3] = 255;
      },
      0,
      0.45,
    );
    let res = gen.next();
    while (!res.done) {
      yield res.value;
      res = gen.next();
    }
    ctx.putImageData(res.value, 0, 0);
    // Kawung motif (four petals around a point), multiplied over the cloth
    const step = 64 * s;
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.strokeStyle = rgba(BATIK.soga, 0.5);
    ctx.lineWidth = 1.5 * s;
    for (let y = 0; y < H + step; y += step) {
      for (let x = (Math.round(y / step) % 2) * step * 0.5; x < W + step; x += step) {
        for (let k = 0; k < 4; k++) {
          const a = (k * Math.PI) / 2 + Math.PI / 4;
          ctx.beginPath();
          ctx.ellipse(x + Math.cos(a) * step * 0.25, y + Math.sin(a) * step * 0.25, step * 0.11, step * 0.21, a + Math.PI / 2, 0, TAU);
          ctx.stroke();
        }
        ctx.fillStyle = rgba(BATIK.soga, 0.45);
        ctx.beginPath();
        ctx.arc(x, y, 2 * s, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    yield 0.6;
    // Isen-isen cecek: cream dots inside the soga areas
    const gap = 9 * s;
    ctx.fillStyle = rgba(BATIK.cream, 0.75);
    for (let y = gap / 2; y < H; y += gap) {
      for (let x = gap / 2 + ((y / gap) % 2) * gap * 0.5; x < W; x += gap) {
        const L = sampleLum(field, x / W, y / H);
        if (L > q2 && L < q3) {
          ctx.beginPath();
          ctx.arc(x, y, 1.3 * s, 0, TAU);
          ctx.fill();
        }
      }
    }
    yield 0.72;
    // Canting outlines along edges
    const angle = (u: number, v: number) => sampleTangent(field, u, v);
    ctx.lineCap = "round";
    for (let i = 0; i < n(env, 3000); i++) {
      const [u, v] = detailPoint(env, 3);
      if (sampleMag(field, u, v) < 0.4) continue;
      ctx.globalAlpha = 0.8;
      strokePts(ctx, tracePath(env, angle, u, v, 4, 3.2 * s), 1.5 * s, rgba(BATIK.deep));
    }
    ctx.globalAlpha = 1;
    yield 0.85;
    // Remukan wax crackle
    const cracks: Crack[] = [];
    for (let c = 0; c < 150; c++) {
      let x = rnd() * W, y = rnd() * H, a = rnd() * TAU;
      const pts = [x, y];
      for (let k = 0; k < 30; k++) {
        a += (rnd() - 0.5) * 0.7;
        x += Math.cos(a) * 7 * s;
        y += Math.sin(a) * 7 * s;
        pts.push(x, y);
      }
      cracks.push(pts);
      ctx.globalAlpha = 0.42;
      strokePts(ctx, pts, 0.8 * s, rgba(BATIK.indigo));
    }
    ctx.globalAlpha = 1;
    env.store.cracks = cracks;
    texture(ctx, env, "canvas", 0.2);
    yield 1;
  },
  live(env) {
    const cracks = (env.store.cracks as Crack[] | undefined) ?? [];
    const r = mulberry32(env.seed + 707);
    const offs = cracks.map(() => r());
    const { W, H, s } = env;
    return {
      draw(ctx, t, T, k) {
        const p = (t / T) * 1.6 - 0.3;
        const g = ctx.createLinearGradient((p - 0.25) * W, (p - 0.25) * H, (p + 0.25) * W, (p + 0.25) * H);
        g.addColorStop(0, "rgba(255,240,200,0)");
        g.addColorStop(0.5, `rgba(255,236,190,${0.4 * k})`);
        g.addColorStop(1, "rgba(255,240,200,0)");
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        cracks.forEach((c, i) => {
          const w = wave(t, T, 1, offs[i]!);
          if (w <= 0) return;
          ctx.globalAlpha = w * 0.35 * Math.min(1, k);
          strokePts(ctx, c, 1 * s, "rgb(214,170,90)");
        });
        ctx.globalAlpha = 1;
      },
    };
  },
};

// ─────────────────────────────── Bauhaus ───────────────────────────────
const BAU: RGB[] = [[209, 53, 42], [242, 194, 48], [31, 78, 156], [21, 21, 21], [140, 138, 133], [239, 231, 214]];
type Cell = { x: number; y: number; c: number; bg: RGB; fg: RGB; type: number; rot: number; animate: boolean; off: number };

function drawBauShape(ctx: Ctx, cell: Cell, rot: number) {
  const { x, y, c } = cell;
  ctx.save();
  ctx.translate(x + c / 2, y + c / 2);
  ctx.rotate(rot);
  ctx.fillStyle = rgba(cell.fg);
  ctx.beginPath();
  const h = c / 2;
  if (cell.type < 0) {
    ctx.restore();
    return;
  }
  switch (cell.type) {
    case 0:
      ctx.arc(0, 0, h * 0.82, 0, TAU);
      break;
    case 1:
      ctx.moveTo(-h, -h);
      ctx.arc(-h, -h, c, 0, Math.PI / 2);
      ctx.closePath();
      break;
    case 2:
      ctx.arc(0, h, h, Math.PI, TAU);
      ctx.closePath();
      break;
    case 3:
      ctx.moveTo(-h, h);
      ctx.lineTo(h, h);
      ctx.lineTo(-h, -h);
      ctx.closePath();
      break;
    default:
      ctx.rect(-h * 0.6, -h * 0.6, h * 1.2, h * 1.2);
  }
  ctx.fill();
  ctx.restore();
}

const bauhaus: StyleDef = {
  ...STYLES_META.bauhaus,
  *paint(ctx, env) {
    const { W, H, rnd, field, s } = env;
    ctx.fillStyle = rgba(BAU[5]!);
    ctx.fillRect(0, 0, W, H);
    const c = Math.min(W, H) / (13 * Math.sqrt(env.detail));
    const cols = Math.ceil(W / c), rows = Math.ceil(H / c);
    const ox = (W - cols * c) / 2, oy = (H - rows * c) / 2;
    const nearest = (rgb: RGB, exclude?: RGB) => {
      let best = BAU[5]!, bd = Infinity;
      for (const b of BAU) {
        if (b === exclude) continue;
        const d = redmean(rgb, b);
        if (d < bd) {
          bd = d;
          best = b;
        }
      }
      return best;
    };
    const cells: Cell[] = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const u = (ox + (i + 0.5) * c) / W, v = (oy + (j + 0.5) * c) / H;
        const col = tweak(sampleRgb(field, u, v), { sat: 1.7 });
        // Background follows the colour mass, so the subject still reads as a silhouette
        const bg = nearest(col);
        const mag = sampleMag(field, u, v);
        const tan = sampleTangent(field, u, v);
        const du = (Math.cos(tan + Math.PI / 2) * c * 0.6) / W, dv = (Math.sin(tan + Math.PI / 2) * c * 0.6) / H;
        const quad = Math.round(((tan + TAU) % TAU) / (Math.PI / 2)) % 4;
        let fg: RGB, type: number;
        if (mag > 0.22) {
          // An edge crosses this cell: the shape takes the colour from the other side of it
          const a = nearest(tweak(sampleRgb(field, u + du, v + dv), { sat: 1.7 }));
          const b = nearest(tweak(sampleRgb(field, u - du, v - dv), { sat: 1.7 }));
          fg = a !== bg ? a : b !== bg ? b : nearest(col, bg);
          type = rnd() < 0.65 ? 1 : 3;
        } else if (rnd() < 0.5) {
          fg = bg;
          type = -1;
        } else {
          const L = rgbToHsl(bg)[2];
          fg = L > 0.6 ? (rnd() < 0.5 ? BAU[3]! : nearest(col, bg)) : rnd() < 0.6 ? BAU[5]! : nearest(col, bg);
          type = rnd() < 0.45 ? 0 : rnd() < 0.5 ? 2 : 4;
        }
        cells.push({ x: ox + i * c, y: oy + j * c, c, bg, fg, type, rot: (quad * Math.PI) / 2, animate: type >= 0 && rnd() < 0.4, off: rnd() });
      }
    }
    for (let i = cells.length - 1; i > 0; i--) {
      const k = Math.floor(rnd() * (i + 1));
      [cells[i], cells[k]] = [cells[k]!, cells[i]!];
    }
    cells.forEach((cell, i) => {
      ctx.fillStyle = rgba(cell.bg);
      ctx.fillRect(cell.x, cell.y, cell.c + 0.5, cell.c + 0.5);
      drawBauShape(ctx, cell, cell.rot);
      if (rnd() < 0.06) {
        ctx.fillStyle = rgba(BAU[3]!);
        ctx.fillRect(cell.x, cell.y + cell.c * 0.45, cell.c, cell.c * 0.1);
      }
      void i;
    });
    yield 0.85;
    const f = env.analysis.focus;
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = rgba(BAU[1]!, 0.35);
    ctx.beginPath();
    ctx.arc(f.u * W, f.v * H, Math.min(W, H) * 0.26, 0, TAU);
    ctx.fill();
    ctx.restore();
    texture(ctx, env, "paper", 0.16);
    env.store.cells = cells.filter((cell) => cell.animate);
    void s;
    yield 1;
  },
  live(env) {
    const cells = (env.store.cells as Cell[] | undefined) ?? [];
    const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
    const A = (q: number) => (Math.PI / 2) * (Math.floor(q) + ease(q - Math.floor(q)));
    return {
      draw(ctx, t, T, k) {
        for (const cell of cells) {
          const q0 = cell.off * 4, q = (t / T) * 4 + q0;
          const rot = cell.rot + (A(q) - A(q0)) * Math.min(1, k);
          ctx.fillStyle = rgba(cell.bg);
          ctx.fillRect(cell.x, cell.y, cell.c + 0.5, cell.c + 0.5);
          drawBauShape(ctx, cell, rot);
        }
      },
    };
  },
};

// ─────────────────────────────── Stained Glass ───────────────────────────────
type Poly = number[];

function clipPoly(poly: Poly, nx: number, ny: number, d: number): Poly {
  // keep points where nx*x + ny*y <= d
  const out: Poly = [];
  const m = poly.length / 2;
  for (let i = 0; i < m; i++) {
    const ax = poly[i * 2]!, ay = poly[i * 2 + 1]!;
    const bx = poly[((i + 1) % m) * 2]!, by = poly[((i + 1) % m) * 2 + 1]!;
    const da = nx * ax + ny * ay - d, db = nx * bx + ny * by - d;
    if (da <= 0) out.push(ax, ay);
    if (da * db < 0) {
      const t = da / (da - db);
      out.push(ax + (bx - ax) * t, ay + (by - ay) * t);
    }
  }
  return out;
}

function voronoi(points: number[], W: number, H: number): Poly[] {
  const count = points.length / 2;
  const g = Math.sqrt((W * H) / count) * 1.2;
  const gw = Math.ceil(W / g), gh = Math.ceil(H / g);
  const grid: number[][] = Array.from({ length: gw * gh }, () => []);
  for (let i = 0; i < count; i++) {
    const cx = Math.min(gw - 1, Math.floor(points[i * 2]! / g)), cy = Math.min(gh - 1, Math.floor(points[i * 2 + 1]! / g));
    grid[cy * gw + cx]!.push(i);
  }
  const polys: Poly[] = [];
  for (let i = 0; i < count; i++) {
    const px = points[i * 2]!, py = points[i * 2 + 1]!;
    const cx = Math.floor(px / g), cy = Math.floor(py / g);
    // Grow the search ring until no unseen site could still cut the cell:
    // a site farther than 2R (R = farthest cell vertex) cannot touch it.
    let poly: Poly = [0, 0, W, 0, W, H, 0, H];
    const maxRing = Math.max(gw, gh);
    for (let ring = 2; ring <= maxRing; ring++) {
      const near: Array<[number, number]> = [];
      for (let gy = Math.max(0, cy - ring); gy <= Math.min(gh - 1, cy + ring); gy++) {
        for (let gx = Math.max(0, cx - ring); gx <= Math.min(gw - 1, cx + ring); gx++) {
          for (const j of grid[gy * gw + gx]!) if (j !== i) near.push([j, (points[j * 2]! - px) ** 2 + (points[j * 2 + 1]! - py) ** 2]);
        }
      }
      near.sort((a, b) => a[1] - b[1]);
      poly = [0, 0, W, 0, W, H, 0, H];
      const radius2 = () => {
        let r2 = 0;
        for (let k = 0; k < poly.length; k += 2) r2 = Math.max(r2, (poly[k]! - px) ** 2 + (poly[k + 1]! - py) ** 2);
        return r2;
      };
      let R2 = radius2();
      for (const [j, d2] of near) {
        if (d2 > 4 * R2) break;
        const qx = points[j * 2]!, qy = points[j * 2 + 1]!;
        poly = clipPoly(poly, qx - px, qy - py, (qx * qx + qy * qy - px * px - py * py) / 2);
        if (poly.length < 6) break;
        R2 = radius2();
      }
      if ((ring * g) ** 2 >= 4 * R2) break;
    }
    polys.push(poly);
  }
  return polys;
}

function polyPath(ctx: Ctx, p: Poly) {
  ctx.beginPath();
  ctx.moveTo(p[0]!, p[1]!);
  for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i]!, p[i + 1]!);
  ctx.closePath();
}

const glass: StyleDef = {
  ...STYLES_META.glass,
  *paint(ctx, env) {
    const { W, H, s, rnd, field } = env;
    const target = n(env, 520);
    const pts: number[] = [];
    while (pts.length / 2 < target) {
      const [u, v] = detailPoint(env, 1.8);
      pts.push(u * W, v * H);
    }
    yield 0.1;
    const polys = voronoi(pts, W, H);
    yield 0.35;
    const glassC = env.make(W, H), leadC = env.make(W, H);
    const gx = ctx2d(glassC), lx = ctx2d(leadC);
    polys.forEach((p, i) => {
      if (p.length < 6) return;
      const u = pts[i * 2]! / W, v = pts[i * 2 + 1]! / H;
      const c = tweak(sampleRgb(field, u, v), { sat: 1.4, minL: 0.22, maxL: 0.66 });
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let k = 0; k < p.length; k += 2) {
        minX = Math.min(minX, p[k]!);
        maxX = Math.max(maxX, p[k]!);
        minY = Math.min(minY, p[k + 1]!);
        maxY = Math.max(maxY, p[k + 1]!);
      }
      const g = gx.createLinearGradient(minX, minY, maxX, maxY);
      g.addColorStop(0, rgba(tweak(c, { light: 0.09 })));
      g.addColorStop(1, rgba(tweak(c, { light: -0.07 })));
      gx.fillStyle = g;
      polyPath(gx, p);
      gx.fill();
      polyPath(lx, p);
      lx.lineJoin = "round";
      lx.strokeStyle = "rgb(22,20,18)";
      lx.lineWidth = 3.4 * s;
      lx.stroke();
    });
    yield 0.8;
    for (let i = 0; i < n(env, 1600); i++) {
      gx.fillStyle = `rgba(255,255,255,${0.04 + rnd() * 0.08})`;
      gx.beginPath();
      gx.arc(rnd() * W, rnd() * H, between(rnd, 0.6, 2) * s, 0, TAU);
      gx.fill();
    }
    lx.globalCompositeOperation = "source-atop";
    lx.strokeStyle = "rgba(255,255,255,0.08)";
    lx.lineWidth = 1 * s;
    polys.forEach((p) => {
      if (p.length < 6) return;
      lx.save();
      lx.translate(-0.8 * s, -0.8 * s);
      polyPath(lx, p);
      lx.stroke();
      lx.restore();
    });
    ctx.drawImage(glassC, 0, 0);
    ctx.drawImage(leadC, 0, 0);
    env.layers.glass = glassC;
    env.layers.lead = leadC;
    yield 1;
  },
  live(env) {
    const { W, H } = env;
    return {
      draw(ctx, t, T, k) {
        const glassC = env.layers.glass, leadC = env.layers.lead;
        if (!glassC || !leadC) return;
        ctx.drawImage(glassC, 0, 0);
        const c = ((t / T) * 1.7 - 0.35) * W;
        const g = ctx.createLinearGradient(c - W * 0.28, 0, c + W * 0.28, H * 0.35);
        g.addColorStop(0, "rgba(255,236,190,0)");
        g.addColorStop(0.5, `rgba(255,236,190,${0.42 * Math.min(1.2, k)})`);
        g.addColorStop(1, "rgba(255,236,190,0)");
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        ctx.drawImage(leadC, 0, 0);
      },
    };
  },
};

// ─────────────────────────────── Gilded Clockwork ───────────────────────────────
type Gear = { x: number; y: number; r: number; teeth: number; dir: number; cyc: number; a0: number };
type Ring = { x: number; y: number; rx: number; ry: number; rot: number; nodes: number[]; dir: number };

function drawGear(ctx: Ctx, g: Gear, angle: number, s: number) {
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(angle);
  ctx.beginPath();
  const inner = g.r * 0.86;
  for (let i = 0; i < g.teeth; i++) {
    const a0 = (i / g.teeth) * TAU, a1 = ((i + 0.5) / g.teeth) * TAU;
    const tw = (TAU / g.teeth) * 0.18;
    ctx.lineTo(Math.cos(a0) * inner, Math.sin(a0) * inner);
    ctx.lineTo(Math.cos(a0 + tw) * g.r, Math.sin(a0 + tw) * g.r);
    ctx.lineTo(Math.cos(a1 - tw) * g.r, Math.sin(a1 - tw) * g.r);
    ctx.lineTo(Math.cos(a1) * inner, Math.sin(a1) * inner);
  }
  ctx.closePath();
  ctx.fillStyle = "rgba(14,10,4,0.28)";
  ctx.fill();
  ctx.strokeStyle = "rgba(214,176,96,0.78)";
  ctx.lineWidth = 1.6 * s;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, g.r * 0.55, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, g.r * 0.12, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * g.r * 0.12, Math.sin(a) * g.r * 0.12);
    ctx.lineTo(Math.cos(a) * g.r * 0.55, Math.sin(a) * g.r * 0.55);
    ctx.stroke();
  }
  ctx.restore();
}

function goldCrack(ctx: Ctx, rnd: () => number, x: number, y: number, steps: number, seg: number, width: number, s: number, depth = 0) {
  ctx.save();
  ctx.strokeStyle = "rgb(226,188,104)";
  ctx.shadowColor = "rgba(227,163,60,0.85)";
  ctx.shadowBlur = 9 * s;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  let a = Math.PI / 2 + (rnd() - 0.5);
  for (let i = 0; i < steps; i++) {
    a += (rnd() - 0.5) * 0.9;
    x += Math.cos(a) * seg;
    y += Math.sin(a) * seg;
    ctx.lineTo(x, y);
    if (depth < 2 && rnd() < 0.14) goldCrack(ctx, rnd, x, y, Math.floor(steps / 2.5), seg * 0.8, width * 0.55, s, depth + 1);
  }
  ctx.stroke();
  ctx.restore();
}

const clockwork: StyleDef = {
  ...STYLES_META.clockwork,
  *paint(ctx, env) {
    const { W, H, s, rnd, field, analysis } = env;
    // Gold duotone: the source's values, stretched, mapped black → bronze → gold → ivory
    const lo = lumQuantile(field, 0.04), hi = Math.max(lo + 0.05, lumQuantile(field, 0.97));
    const stops: Array<[number, RGB]> = [
      [0, [12, 9, 7]],
      [0.32, [78, 52, 22]],
      [0.66, [196, 152, 70]],
      [1, [248, 232, 194]],
    ];
    const gen = pixelPass(
      ctx,
      env,
      (u, v, out) => {
        const L = smoothstep(lo, hi, sampleLum(field, u, v));
        let k = 1;
        while (k < stops.length - 1 && L > stops[k]![0]) k++;
        const [t0, c0] = stops[k - 1]!, [t1, c1] = stops[k]!;
        const c = mix(c0, c1, (L - t0) / (t1 - t0));
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
        out[3] = 255;
      },
      0,
      0.15,
    );
    let res = gen.next();
    while (!res.done) {
      yield res.value;
      res = gen.next();
    }
    // Soften the per-pixel map slightly so it reads as lacquer, not a photo filter
    const tmp = env.make(W, H);
    ctx2d(tmp).putImageData(res.value, 0, 0);
    drawBlurred(ctx, tmp, W, H, Math.max(1.5, 2.2 * s));
    const f = analysis.focus;
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    glow(ctx, f.u * W, f.v * H, Math.hypot(W, H) * 0.55, [255, 236, 190], 0.6);
    ctx.restore();
    yield 0.2;
    // Engraved gold hatching that follows form
    const angle = flowAngle(env, 0.4, 2.5);
    ctx.lineCap = "round";
    const count = n(env, 3200);
    for (let i = 0; i < count; i++) {
      const [u, v] = detailPoint(env, 1.6);
      const L = sampleLum(field, u, v);
      const c = mix([212, 175, 92], [238, 231, 216], Math.min(1, L * 1.2));
      ctx.globalAlpha = 0.18 + L * 0.42;
      strokePts(ctx, tracePath(env, angle, u, v, Math.round(between(rnd, 3, 7)), 3.6 * s), between(rnd, 0.9, 1.8) * s, rgba(c));
      if (i % 80 === 0) yield 0.2 + 0.5 * (i / count);
    }
    ctx.globalAlpha = 1;
    // Divine rays
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const ax = f.u * W, ay = -0.06 * H;
    for (let i = 0; i < 26; i++) {
      const a = Math.PI / 2 + (rnd() - 0.5) * 1.2, wa = between(rnd, 0.008, 0.03), L = H * 1.25;
      const g = ctx.createLinearGradient(ax, ay, ax + Math.cos(a) * L, ay + Math.sin(a) * L);
      g.addColorStop(0, "rgba(255,236,190,0.12)");
      g.addColorStop(1, "rgba(255,236,190,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + Math.cos(a - wa) * L, ay + Math.sin(a - wa) * L);
      ctx.lineTo(ax + Math.cos(a + wa) * L, ay + Math.sin(a + wa) * L);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    for (let i = 0; i < 3; i++) goldCrack(ctx, rnd, rnd() * W, rnd() * H * 0.5, 22, H * 0.012, 2.2 * s, s);
    vignette(ctx, W, H, 0.68);
    texture(ctx, env, "canvas", 0.1);
    // Clockwork spec for the live layer (drawn in stills too)
    const short = Math.min(W, H);
    const golden = 2.399963;
    const gears: Gear[] = Array.from({ length: 4 }, (_, i) => {
      const rr = short * (0.2 + 0.07 * i);
      const a = i * golden + rnd() * 0.4;
      const teeth = 12 + Math.floor(rnd() * 14);
      return { x: f.u * W + Math.cos(a) * rr, y: f.v * H + Math.sin(a) * rr, r: short * between(rnd, 0.05, 0.13), teeth, dir: i % 2 ? -1 : 1, cyc: 1 + Math.floor(rnd() * 3), a0: rnd() * TAU };
    });
    const hx = f.u * W, hy = Math.max(0.12, f.v - 0.2) * H;
    const rings: Ring[] = Array.from({ length: 4 }, (_, k) => {
      const rx = short * (0.08 + k * 0.045);
      return { x: hx, y: hy, rx, ry: rx * 0.3, rot: -0.2 + rnd() * 0.14, nodes: Array.from({ length: 3 + k }, () => rnd() * TAU), dir: k % 2 ? -1 : 1 };
    });
    const sparks = Array.from({ length: 150 }, () => ({ x: (f.u + (rnd() - 0.5) * 0.7) * W, y: (f.v + rnd() * 0.4) * H, size: between(rnd, 0.8, 2.1) * s, off: rnd(), rise: between(rnd, 0.15, 0.4) * H }));
    env.store.clock = { gears, rings, sparks };
    yield 1;
  },
  live(env) {
    const spec = env.store.clock as { gears: Gear[]; rings: Ring[]; sparks: Array<{ x: number; y: number; size: number; off: number; rise: number }> } | undefined;
    const { s } = env;
    return {
      inStatic: true,
      draw(ctx, t, T, k) {
        if (!spec) return;
        const kk = Math.min(1.2, k);
        for (const g of spec.gears) drawGear(ctx, g, g.a0 + g.dir * ((TAU / g.teeth) * g.cyc * 2) * (t / T) * Math.max(0.5, kk), s);
        for (const r of spec.rings) {
          ctx.strokeStyle = "rgba(201,160,88,0.75)";
          ctx.lineWidth = 1.2 * s;
          ctx.beginPath();
          ctx.ellipse(r.x, r.y, r.rx, r.ry, r.rot, 0, TAU);
          ctx.stroke();
          for (const n0 of r.nodes) {
            const th = n0 + r.dir * TAU * (t / T);
            const px = r.x + r.rx * Math.cos(th) * Math.cos(r.rot) - r.ry * Math.sin(th) * Math.sin(r.rot);
            const py = r.y + r.rx * Math.cos(th) * Math.sin(r.rot) + r.ry * Math.sin(th) * Math.cos(r.rot);
            glow(ctx, px, py, 6 * s, [255, 224, 160], 0.9);
          }
        }
        for (const sp of spec.sparks) {
          const ph = (t / T + sp.off) % 1;
          ctx.globalAlpha = Math.sin(Math.PI * ph) * 0.8 * kk;
          ctx.fillStyle = "rgb(255,224,160)";
          ctx.beginPath();
          ctx.arc(sp.x + Math.sin(TAU * ph * 2) * 4 * s, sp.y - ph * sp.rise, sp.size, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    };
  },
};

export const STYLES: Record<StyleId, StyleDef> = { impasto, impressionist, pointillist, oldmaster, watercolor, ukiyoe, stencil, batik, bauhaus, glass, clockwork };

export { hexToRgb };
