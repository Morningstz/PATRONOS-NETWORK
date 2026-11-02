/**
 * Built-in sample scenes, drawn procedurally so the Studio works without an upload and without
 * shipping photos. Each is rendered at the requested size; the painter then reads it like a photo.
 */
import { makeNoise, mulberry32 } from "./noise";

export type Scene = { id: string; name: string; subject: string; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void };

const lg = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: Array<[number, string]>) => {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
};

function ridge(ctx: CanvasRenderingContext2D, w: number, h: number, base: number, amp: number, freq: number, seed: number, fill: string | CanvasGradient) {
  const n = makeNoise(seed);
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 4) {
    const u = x / w;
    const y = base * h - amp * h * (0.6 * n(u * freq, 0.5) + 0.3 * n(u * freq * 2.3, 3.1) + 0.1 * n(u * freq * 6, 7.7));
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

const bromo: Scene = {
  id: "bromo",
  name: "Volcano at dawn",
  subject: "a volcanic caldera at dawn, a smoking cone rising from a sea of mist, layered ridges fading into the distance",
  draw(ctx, w, h) {
    ctx.fillStyle = lg(ctx, 0, 0, 0, h, [
      [0, "#1d2752"],
      [0.32, "#6c4f86"],
      [0.5, "#e9906a"],
      [0.6, "#f6cf8a"],
      [1, "#f3d9a8"],
    ]);
    ctx.fillRect(0, 0, w, h);
    // sun
    const sx = w * 0.7, sy = h * 0.5;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 0.35);
    g.addColorStop(0, "rgba(255,240,200,1)");
    g.addColorStop(0.08, "rgba(255,226,160,0.95)");
    g.addColorStop(1, "rgba(255,180,120,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ridge(ctx, w, h, 0.56, 0.08, 2.2, 11, "#7d5d86");
    // cone
    ctx.beginPath();
    ctx.moveTo(w * 0.18, h * 0.66);
    ctx.quadraticCurveTo(w * 0.33, h * 0.44, w * 0.38, h * 0.36);
    ctx.lineTo(w * 0.46, h * 0.36);
    ctx.quadraticCurveTo(w * 0.52, h * 0.46, w * 0.66, h * 0.66);
    ctx.closePath();
    ctx.fillStyle = lg(ctx, w * 0.3, 0, w * 0.6, 0, [
      [0, "#4b3a52"],
      [0.6, "#6e5568"],
      [1, "#a07a72"],
    ]);
    ctx.fill();
    // ridges on the cone
    ctx.strokeStyle = "rgba(40,28,44,0.45)";
    ctx.lineWidth = Math.max(1, w / 400);
    for (let i = 0; i < 9; i++) {
      const x = w * (0.39 + i * 0.008);
      ctx.beginPath();
      ctx.moveTo(x, h * 0.37);
      ctx.quadraticCurveTo(x - w * 0.05 + i * w * 0.012, h * 0.52, w * (0.24 + i * 0.045), h * 0.66);
      ctx.stroke();
    }
    // smoke plume
    const r = mulberry32(5);
    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      const x = w * (0.42 + t * 0.2 + (r() - 0.5) * 0.03), y = h * (0.34 - t * 0.28);
      const rad = h * (0.03 + t * 0.07);
      const sg = ctx.createRadialGradient(x, y, 0, x, y, rad);
      sg.addColorStop(0, `rgba(235,220,215,${0.35 - t * 0.2})`);
      sg.addColorStop(1, "rgba(235,220,215,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // sea of mist
    ctx.fillStyle = lg(ctx, 0, h * 0.6, 0, h * 0.78, [
      [0, "rgba(250,232,214,0)"],
      [0.5, "rgba(250,232,214,0.85)"],
      [1, "rgba(242,220,206,0.95)"],
    ]);
    ctx.fillRect(0, h * 0.6, w, h * 0.2);
    ridge(ctx, w, h, 0.84, 0.1, 1.6, 23, "#3b3348");
    ridge(ctx, w, h, 0.95, 0.12, 1.3, 31, "#1f1b2a");
    // foreground grasses
    ctx.strokeStyle = "rgba(20,16,26,0.8)";
    for (let i = 0; i < 180; i++) {
      const x = r() * w, y = h * (0.9 + r() * 0.1), l = h * (0.03 + r() * 0.05);
      ctx.lineWidth = Math.max(1, w / 900);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + (r() - 0.5) * l, y - l * 0.6, x + (r() - 0.3) * l * 0.6, y - l);
      ctx.stroke();
    }
  },
};

const terraces: Scene = {
  id: "terraces",
  name: "Rice terraces",
  subject: "terraced rice fields curving down a green valley, palm trees on the ridges, a small thatched shelter, soft morning haze",
  draw(ctx, w, h) {
    ctx.fillStyle = lg(ctx, 0, 0, 0, h * 0.3, [
      [0, "#9cc7dc"],
      [1, "#e6efe2"],
    ]);
    ctx.fillRect(0, 0, w, h);
    ridge(ctx, w, h, 0.26, 0.1, 1.8, 3, "#8fb5a0");
    ridge(ctx, w, h, 0.34, 0.08, 2.4, 9, "#5f9a6a");
    const n = makeNoise(17);
    const greens = ["#7fb24a", "#93c35a", "#6aa443", "#a9cf68", "#5c9a3c", "#b8d77a"];
    const rows = 16;
    for (let i = 0; i < rows; i++) {
      const t = i / rows;
      const y0 = h * (0.32 + t * 0.72);
      const bh = h * (0.03 + t * 0.045);
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 4) {
        const u = x / w;
        const y = y0 + Math.sin(u * Math.PI * (1.6 + t) + i * 0.7) * h * 0.03 + n(u * 2, t * 4) * h * 0.03;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = greens[i % greens.length]!;
      ctx.fill();
      // water sheen + bund edge
      ctx.strokeStyle = "rgba(48,80,30,0.55)";
      ctx.lineWidth = Math.max(1.5, bh * 0.12);
      ctx.stroke();
      ctx.strokeStyle = "rgba(230,245,230,0.35)";
      ctx.lineWidth = Math.max(1, bh * 0.05);
      ctx.stroke();
    }
    // palms
    const r = mulberry32(8);
    const palm = (x: number, y: number, s: number) => {
      ctx.strokeStyle = "#4a3b2a";
      ctx.lineWidth = s * 0.05;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + s * 0.1, y - s * 0.5, x + s * 0.05, y - s);
      ctx.stroke();
      ctx.strokeStyle = "#2f5a2a";
      ctx.lineWidth = s * 0.035;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + s * 0.05, y - s);
        ctx.quadraticCurveTo(x + s * 0.05 + Math.cos(a) * s * 0.3, y - s - s * 0.12, x + s * 0.05 + Math.cos(a) * s * 0.45, y - s + Math.abs(Math.sin(a)) * s * 0.2 + s * 0.1);
        ctx.stroke();
      }
    };
    for (let i = 0; i < 7; i++) palm(w * (0.05 + r() * 0.9), h * (0.4 + r() * 0.25), h * (0.12 + r() * 0.1));
    // shelter
    const hx = w * 0.62, hy = h * 0.62, hs = h * 0.08;
    ctx.fillStyle = "#6b4a2b";
    ctx.fillRect(hx - hs * 0.4, hy - hs * 0.2, hs * 0.08, hs * 0.5);
    ctx.fillRect(hx + hs * 0.32, hy - hs * 0.2, hs * 0.08, hs * 0.5);
    ctx.beginPath();
    ctx.moveTo(hx - hs * 0.7, hy - hs * 0.15);
    ctx.lineTo(hx, hy - hs * 0.75);
    ctx.lineTo(hx + hs * 0.75, hy - hs * 0.15);
    ctx.closePath();
    ctx.fillStyle = "#b08a4a";
    ctx.fill();
    // haze
    ctx.fillStyle = lg(ctx, 0, h * 0.2, 0, h * 0.5, [
      [0, "rgba(240,245,235,0.55)"],
      [1, "rgba(240,245,235,0)"],
    ]);
    ctx.fillRect(0, 0, w, h * 0.5);
  },
};

const harbour: Scene = {
  id: "harbour",
  name: "Harbour at night",
  subject: "a harbour at night, moored fishing boats, warm lamps along the quay, reflections trembling on dark water under a full moon",
  draw(ctx, w, h) {
    ctx.fillStyle = lg(ctx, 0, 0, 0, h * 0.55, [
      [0, "#060b1f"],
      [0.7, "#17244a"],
      [1, "#2c3561"],
    ]);
    ctx.fillRect(0, 0, w, h);
    const r = mulberry32(21);
    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = `rgba(255,255,240,${0.3 + r() * 0.6})`;
      const s = r() * 1.8 * (w / 1000) + 0.5;
      ctx.fillRect(r() * w, r() * h * 0.45, s, s);
    }
    // moon
    const mx = w * 0.24, my = h * 0.18, mr = h * 0.06;
    const mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 5);
    mg.addColorStop(0, "rgba(255,248,220,0.5)");
    mg.addColorStop(1, "rgba(255,248,220,0)");
    ctx.fillStyle = mg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fbf3d6";
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
    // town silhouette
    const qy = h * 0.55;
    ctx.fillStyle = "#0d1226";
    let x = 0;
    const lamps: Array<[number, number]> = [];
    while (x < w) {
      const bw = w * (0.03 + r() * 0.06), bh = h * (0.06 + r() * 0.14);
      ctx.fillRect(x, qy - bh, bw, bh);
      if (r() < 0.5) {
        ctx.beginPath();
        ctx.moveTo(x - bw * 0.1, qy - bh);
        ctx.lineTo(x + bw / 2, qy - bh - bw * 0.4);
        ctx.lineTo(x + bw * 1.1, qy - bh);
        ctx.fill();
      }
      for (let k = 0; k < 4; k++) if (r() < 0.6) lamps.push([x + r() * bw, qy - r() * bh * 0.8]);
      x += bw * (0.9 + r() * 0.3);
    }
    for (const [lx, ly] of lamps) {
      ctx.fillStyle = "#ffcf6e";
      ctx.fillRect(lx, ly, w * 0.006, h * 0.01);
    }
    // quay lamps
    for (let i = 0; i < 7; i++) {
      const lx = w * (0.08 + i * 0.14), ly = qy - h * 0.05;
      const lgd = ctx.createRadialGradient(lx, ly, 0, lx, ly, h * 0.08);
      lgd.addColorStop(0, "rgba(255,210,120,0.9)");
      lgd.addColorStop(1, "rgba(255,170,80,0)");
      ctx.fillStyle = lgd;
      ctx.fillRect(lx - h * 0.08, ly - h * 0.08, h * 0.16, h * 0.16);
    }
    // water
    ctx.fillStyle = lg(ctx, 0, qy, 0, h, [
      [0, "#141c3a"],
      [1, "#05081a"],
    ]);
    ctx.fillRect(0, qy, w, h - qy);
    // reflections
    const refl = (cx: number, color: string, width: number) => {
      for (let y = qy + 2; y < h; y += Math.max(2, h / 240)) {
        const t = (y - qy) / (h - qy);
        const ww = width * (1 + t * 1.5) * (0.4 + r() * 0.8);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7 * (1 - t) + 0.1;
        ctx.fillRect(cx - ww / 2 + (r() - 0.5) * width, y, ww, Math.max(1, h / 400));
      }
      ctx.globalAlpha = 1;
    };
    refl(mx, "#fbf0c8", w * 0.03);
    for (let i = 0; i < 7; i++) refl(w * (0.08 + i * 0.14), "#ffc76a", w * 0.012);
    // boats
    const boat = (bx: number, by: number, s: number, hull: string) => {
      ctx.fillStyle = hull;
      ctx.beginPath();
      ctx.moveTo(bx - s, by);
      ctx.quadraticCurveTo(bx, by + s * 0.35, bx + s, by - s * 0.05);
      ctx.lineTo(bx + s * 1.1, by - s * 0.2);
      ctx.lineTo(bx - s * 1.15, by - s * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#c9b48a";
      ctx.lineWidth = Math.max(1, s * 0.03);
      ctx.beginPath();
      ctx.moveTo(bx, by - s * 0.15);
      ctx.lineTo(bx, by - s * 1.4);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,200,110,0.9)";
      ctx.fillRect(bx - s * 0.05, by - s * 0.5, s * 0.1, s * 0.1);
    };
    boat(w * 0.3, h * 0.74, h * 0.1, "#8a2f2a");
    boat(w * 0.58, h * 0.82, h * 0.13, "#2b5c7a");
    boat(w * 0.82, h * 0.7, h * 0.08, "#c9a24a");
  },
};

const stilllife: Scene = {
  id: "stilllife",
  name: "Still life",
  subject: "a still life of tropical fruit — mangosteen, papaya and a bunch of bananas — in a ceramic bowl beside a brass jug, on draped batik cloth, warm window light",
  draw(ctx, w, h) {
    ctx.fillStyle = lg(ctx, 0, 0, w, h, [
      [0, "#3a2a20"],
      [1, "#14100d"],
    ]);
    ctx.fillRect(0, 0, w, h);
    const lx = w * 0.15, ly = h * 0.1;
    const light = ctx.createRadialGradient(lx, ly, 0, lx, ly, w * 0.9);
    light.addColorStop(0, "rgba(255,214,150,0.35)");
    light.addColorStop(1, "rgba(255,214,150,0)");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w, h);
    // table cloth
    const ty = h * 0.62;
    ctx.fillStyle = lg(ctx, 0, ty, 0, h, [
      [0, "#7a3b22"],
      [1, "#3b1b10"],
    ]);
    ctx.fillRect(0, ty, w, h - ty);
    ctx.strokeStyle = "rgba(230,190,120,0.35)";
    ctx.lineWidth = Math.max(1, w / 500);
    for (let i = 0; i < 14; i++) {
      for (let j = 0; j < 6; j++) {
        const cx = w * (i / 13), cy = ty + (h - ty) * (j / 5 + 0.1);
        ctx.beginPath();
        ctx.ellipse(cx, cy, w * 0.02, h * 0.012, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    const ball = (x: number, y: number, r: number, c0: string, c1: string) => {
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
      g.addColorStop(0, c0);
      g.addColorStop(1, c1);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    // jug
    const jx = w * 0.72;
    ctx.fillStyle = lg(ctx, jx - w * 0.1, 0, jx + w * 0.1, 0, [
      [0, "#5a3a12"],
      [0.35, "#e2b45a"],
      [0.5, "#fff0b8"],
      [0.7, "#b98432"],
      [1, "#3f2808"],
    ]);
    ctx.beginPath();
    ctx.moveTo(jx - w * 0.04, h * 0.2);
    ctx.quadraticCurveTo(jx - w * 0.03, h * 0.3, jx - w * 0.1, h * 0.45);
    ctx.quadraticCurveTo(jx - w * 0.11, h * 0.6, jx - w * 0.06, h * 0.64);
    ctx.lineTo(jx + w * 0.06, h * 0.64);
    ctx.quadraticCurveTo(jx + w * 0.11, h * 0.6, jx + w * 0.1, h * 0.45);
    ctx.quadraticCurveTo(jx + w * 0.03, h * 0.3, jx + w * 0.04, h * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#7a5016";
    ctx.lineWidth = w * 0.012;
    ctx.beginPath();
    ctx.arc(jx + w * 0.11, h * 0.42, h * 0.08, -1.2, 1.3);
    ctx.stroke();
    // bowl
    const bx = w * 0.4, by = h * 0.62;
    ctx.fillStyle = lg(ctx, bx - w * 0.22, 0, bx + w * 0.22, 0, [
      [0, "#2c4a5a"],
      [0.4, "#8fb3bf"],
      [1, "#1d3340"],
    ]);
    ctx.beginPath();
    ctx.ellipse(bx, by - h * 0.06, w * 0.22, h * 0.05, 0, 0, Math.PI);
    ctx.quadraticCurveTo(bx - w * 0.2, by + h * 0.08, bx, by + h * 0.09);
    ctx.quadraticCurveTo(bx + w * 0.2, by + h * 0.08, bx + w * 0.22, by - h * 0.06);
    ctx.fill();
    // fruit
    ball(w * 0.3, h * 0.5, h * 0.075, "#7c4a8c", "#2a0f2e"); // mangosteen
    ball(w * 0.47, h * 0.52, h * 0.07, "#8a4f94", "#2a0f2e");
    ctx.fillStyle = "#3f6b2a";
    ctx.beginPath();
    ctx.arc(w * 0.3, h * 0.43, h * 0.022, 0, Math.PI * 2);
    ctx.fill();
    // papaya half
    ctx.fillStyle = "#e8743a";
    ctx.beginPath();
    ctx.ellipse(w * 0.4, h * 0.47, w * 0.08, h * 0.05, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f6a35a";
    ctx.beginPath();
    ctx.ellipse(w * 0.4, h * 0.47, w * 0.06, h * 0.035, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1210";
    const r = mulberry32(4);
    for (let i = 0; i < 28; i++) {
      ctx.beginPath();
      ctx.arc(w * 0.4 + (r() - 0.5) * w * 0.07, h * 0.47 + (r() - 0.5) * h * 0.035, h * 0.005, 0, Math.PI * 2);
      ctx.fill();
    }
    // bananas
    ctx.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = i % 2 ? "#e9c63e" : "#f2d65a";
      ctx.lineWidth = h * 0.035;
      ctx.beginPath();
      ctx.moveTo(w * (0.12 + i * 0.015), h * (0.62 - i * 0.01));
      ctx.quadraticCurveTo(w * 0.2, h * (0.74 + i * 0.01), w * (0.34 + i * 0.01), h * (0.7 + i * 0.012));
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    // cast shadow
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(w * 0.62, h * 0.68, w * 0.28, h * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
  },
};

export const SCENES: Scene[] = [bromo, terraces, harbour, stilllife];

export function renderScene(scene: Scene, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not available");
  scene.draw(ctx, w, h);
  return c;
}
