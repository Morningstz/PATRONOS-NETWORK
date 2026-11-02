"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildSource, canvasToBlob, downloadBlob, LiveRun, outputSize, PaintRun, recordCanvas, renderStill, type Camera, type Source } from "@/lib/studio/engine";
import { ctx2d, makeCanvas } from "@/lib/studio/kit";
import { buildPrompts, type Prompts } from "@/lib/studio/prompt";
import { renderScene, SCENES } from "@/lib/studio/scenes";
import { STYLE_LIST, STYLES_META, type StyleId } from "@/lib/studio/styles-meta";

const PREVIEW_LONG = 1000;
const VIDEO_LONG = 1280;
const ASPECTS: Array<{ id: string; label: string; value: number | null }> = [
  { id: "orig", label: "Original", value: null },
  { id: "1:1", label: "1:1", value: 1 },
  { id: "4:5", label: "4:5", value: 4 / 5 },
  { id: "3:2", label: "3:2", value: 3 / 2 },
  { id: "16:9", label: "16:9", value: 16 / 9 },
  { id: "9:16", label: "9:16", value: 9 / 16 },
];
const SCENE_ASPECT = 4 / 3;
const PROMPT_TABS: Array<{ id: keyof Omit<Prompts, "title" | "hashtags">; label: string }> = [
  { id: "image", label: "Image" },
  { id: "midjourney", label: "Midjourney" },
  { id: "video", label: "Animation" },
  { id: "negative", label: "Negative" },
  { id: "print", label: "Print" },
  { id: "caption", label: "Caption" },
];

type SourceInput = { kind: "scene"; sceneId: string } | { kind: "upload"; img: HTMLImageElement; name: string };
type Mode = "painting" | "living" | "paused";

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "patronos-studio";

export function StudioApp() {
  const [input, setInput] = useState<SourceInput>({ kind: "scene", sceneId: SCENES[0]!.id });
  const [subject, setSubject] = useState(SCENES[0]!.subject);
  const [styleId, setStyleId] = useState<StyleId>("impasto");
  const [aspectId, setAspectId] = useState("orig");
  const [detail, setDetail] = useState(1);
  const [seed, setSeed] = useState(42);
  const [camera, setCamera] = useState<Camera>("breathe");
  const [intensity, setIntensity] = useState(1);
  const [loopSeconds, setLoopSeconds] = useState(6);
  const [mode, setMode] = useState<Mode>("painting");
  const [progress, setProgress] = useState(0);
  const [source, setSource] = useState<Source | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<(typeof PROMPT_TABS)[number]["id"]>("image");
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [busyProgress, setBusyProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runRef = useRef<PaintRun | null>(null);
  const liveRef = useRef<LiveRun | null>(null);
  const modeRef = useRef<Mode>("painting");
  const motionRef = useRef({ camera, intensity, loopSeconds });
  const liveStart = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const stillDrawn = useRef<string>("");
  motionRef.current = { camera, intensity, loopSeconds };
  modeRef.current = mode;

  const aspectValue = ASPECTS.find((a) => a.id === aspectId)?.value ?? null;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const on = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", on);
    // Sample thumbnails
    const t: Record<string, string> = {};
    for (const sc of SCENES) t[sc.id] = renderScene(sc, 160, 120).toDataURL("image/jpeg", 0.8);
    setThumbs(t);
    return () => mq.removeEventListener("change", on);
  }, []);

  // Build the analysed source whenever the input or the crop changes
  useEffect(() => {
    try {
      if (input.kind === "scene") {
        const scene = SCENES.find((s) => s.id === input.sceneId) ?? SCENES[0]!;
        const a = aspectValue ?? SCENE_ASPECT;
        const w = a >= 1 ? 1200 : Math.round(1200 * a), h = a >= 1 ? Math.round(1200 / a) : 1200;
        const img = renderScene(scene, w, h);
        setSource(buildSource(img, w, h, a));
      } else {
        setSource(buildSource(input.img, input.img.naturalWidth, input.img.naturalHeight, aspectValue));
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    }
  }, [input, aspectValue]);

  // Start a new painting whenever the source or the painting parameters change
  useEffect(() => {
    if (!source) return;
    const { W, H } = outputSize(source.aspect, PREVIEW_LONG);
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = W;
    canvas.height = H;
    runRef.current = new PaintRun(styleId, source, W, H, seed, detail);
    liveRef.current = null;
    setProgress(0);
    setMode("painting");
  }, [source, styleId, seed, detail]);

  // One animation loop drives both the painting and the living view
  useEffect(() => {
    let raf = 0;
    let lastLive: LiveRun | null = null;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const canvas = canvasRef.current, run = runRef.current;
      if (!canvas || !run) return;
      const ctx = ctx2d(canvas);
      if (modeRef.current === "painting" || !run.done) {
        if (!run.done) {
          const p = run.step(14, reduceMotion ? 0 : 3.2);
          ctx.drawImage(run.canvas, 0, 0);
          setProgress(p);
          if (run.done) {
            liveRef.current = new LiveRun(run.canvas, run.env, run.styleId);
            liveStart.current = performance.now();
            if (modeRef.current === "painting") setMode(reduceMotion ? "paused" : "living");
          }
          return;
        }
      }
      if (!liveRef.current) {
        liveRef.current = new LiveRun(run.canvas, run.env, run.styleId);
        liveStart.current = performance.now();
      }
      const m = motionRef.current;
      if (modeRef.current === "living") {
        const t = ((performance.now() - liveStart.current) / 1000) % m.loopSeconds;
        liveRef.current.frame(ctx, t, m.loopSeconds, m.intensity, m.camera);
      } else if (modeRef.current === "paused") {
        // Draw the still once, not every frame
        const key = `${run.styleId}:${run.env.seed}:${canvas.width}x${canvas.height}:${m.intensity}`;
        if (stillDrawn.current !== key || liveRef.current !== lastLive) {
          liveRef.current.frame(ctx, 0, m.loopSeconds, m.intensity, "still");
          stillDrawn.current = key;
          lastLive = liveRef.current;
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);

  const prompts = useMemo(() => {
    if (!source) return null;
    return buildPrompts({ styleId, analysis: source.analysis, subject, aspect: source.aspect, camera, intensity, loopSeconds, seed });
  }, [source, styleId, subject, camera, intensity, loopSeconds, seed]);

  const replay = () => {
    if (!source) return;
    const { W, H } = outputSize(source.aspect, PREVIEW_LONG);
    runRef.current = new PaintRun(styleId, source, W, H, seed, detail);
    liveRef.current = null;
    setProgress(0);
    setMode("painting");
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please choose an image file (JPG, PNG or WebP).");
    if (file.size > 30 * 1024 * 1024) return setError("That image is over 30 MB — please choose a smaller one.");
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      setInput({ kind: "upload", img, name: file.name });
      setSubject("");
    } catch {
      setError("This browser cannot open that image format. Try JPG, PNG or WebP.");
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
    } catch {
      setError("Copy failed — select the text and copy it manually.");
    }
  };

  const fileBase = useCallback(() => slug(prompts?.title ?? STYLES_META[styleId].name), [prompts, styleId]);

  const cancel = () => abortRef.current?.abort();

  const exportPng = async (longEdge: number) => {
    if (!source || busy) return;
    const ac = new AbortController();
    abortRef.current = ac;
    setBusy(`Rendering ${longEdge} px PNG`);
    setBusyProgress(0);
    try {
      const { W, H } = outputSize(source.aspect, longEdge);
      const c = await renderStill(styleId, source, W, H, seed, detail, setBusyProgress, ac.signal);
      downloadBlob(await canvasToBlob(c), `${fileBase()}-${longEdge}px.png`);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  };

  const exportVideo = async (kind: "loop" | "timelapse") => {
    if (!source || busy) return;
    const ac = new AbortController();
    abortRef.current = ac;
    setBusy(kind === "loop" ? `Recording a ${loopSeconds}s loop` : "Recording the painting process");
    setBusyProgress(0);
    try {
      const { W, H } = outputSize(source.aspect, VIDEO_LONG);
      const out = makeCanvas(W, H);
      const octx = ctx2d(out);
      const m = { ...motionRef.current };
      let seconds: number, draw: (t: number) => void;
      if (kind === "loop") {
        const run = new PaintRun(styleId, source, W, H, seed, detail);
        while (!run.done) {
          if (ac.signal.aborted) throw new DOMException("Cancelled", "AbortError");
          run.step(40, 0);
          await new Promise((r) => setTimeout(r, 0));
        }
        const live = new LiveRun(run.canvas, run.env, styleId);
        seconds = m.loopSeconds;
        draw = (t) => live.frame(octx, t, m.loopSeconds, m.intensity, m.camera);
      } else {
        const run = new PaintRun(styleId, source, W, H, seed, detail);
        let live: LiveRun | null = null;
        let liveFrom = 0;
        const paint = 6;
        seconds = paint + m.loopSeconds;
        draw = (t) => {
          if (!run.done) {
            run.step(22, paint);
            octx.fillStyle = "#0a0a0a";
            octx.fillRect(0, 0, W, H);
            octx.drawImage(run.canvas, 0, 0);
            return;
          }
          if (!live) {
            live = new LiveRun(run.canvas, run.env, styleId);
            liveFrom = t;
          }
          live.frame(octx, (t - liveFrom) % m.loopSeconds, m.loopSeconds, m.intensity, m.camera);
        };
      }
      const { blob, ext } = await recordCanvas(out, draw, seconds, 30, setBusyProgress, ac.signal);
      downloadBlob(blob, `${fileBase()}-${kind}.${ext}`);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : "Recording failed.");
    } finally {
      setBusy(null);
    }
  };

  const style = STYLES_META[styleId];
  const a = source?.analysis;
  const painting = mode === "painting" && progress < 1;

  return (
    <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:px-12">
      {/* ───────── Controls ───────── */}
      <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
        <section aria-labelledby="st-source" className="panel p-5">
          <h2 id="st-source" className="eyebrow mb-3">
            1 · Source
          </h2>
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Sample scenes">
            {SCENES.map((sc) => {
              const active = input.kind === "scene" && input.sceneId === sc.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setInput({ kind: "scene", sceneId: sc.id });
                    setSubject(sc.subject);
                  }}
                  className={`overflow-hidden rounded-xl border text-left transition-colors ${active ? "border-gold" : "border-white/10 hover:border-white/30"}`}
                >
                  {thumbs[sc.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbs[sc.id]} alt="" className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <span className="block aspect-[4/3] w-full bg-white/5" />
                  )}
                  <span className="block truncate px-1.5 py-1 text-[11px] text-muted">{sc.name}</span>
                </button>
              );
            })}
          </div>
          <label className="btn btn-outline mt-3 w-full cursor-pointer">
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => onUpload(e.target.files?.[0])} data-testid="studio-upload" />
            {input.kind === "upload" ? `Photo: ${input.name.slice(0, 26)}` : "Use your own photo"}
          </label>
          <p className="mt-2 text-[12px] text-faint">Your photo stays on this device — it is painted in your browser and never uploaded.</p>
          <label htmlFor="st-subject" className="label mt-4">
            What is in the picture?
          </label>
          <textarea
            id="st-subject"
            className="field min-h-[72px] resize-y"
            value={subject}
            placeholder="e.g. a fisherman's boat at dawn, mist over the water"
            onChange={(e) => setSubject(e.target.value)}
            maxLength={300}
          />
          <p className="mt-1 text-[12px] text-faint">Used in the prompts. The painter reads colours and shapes from the image itself.</p>
        </section>

        <section aria-labelledby="st-style" className="panel p-5">
          <h2 id="st-style" className="eyebrow mb-3">
            2 · Style
          </h2>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Painting style">
            {STYLE_LIST.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={s.id === styleId}
                onClick={() => setStyleId(s.id)}
                className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-[13px] transition-colors ${s.id === styleId ? "border-gold bg-[var(--gold-tint)] text-ink" : "border-white/10 text-muted hover:border-white/30"}`}
              >
                <span aria-hidden="true" className="flex shrink-0 overflow-hidden rounded-full">
                  {s.swatch.map((c) => (
                    <span key={c} className="block h-5 w-2" style={{ background: c }} />
                  ))}
                </span>
                <span className="leading-tight">{s.name}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-muted">
            <span className="text-gold-light">{style.movement}.</span> {style.blurb}
          </p>
        </section>

        <section aria-labelledby="st-format" className="panel p-5">
          <h2 id="st-format" className="eyebrow mb-3">
            3 · Format &amp; detail
          </h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Aspect ratio">
            {ASPECTS.map((x) => (
              <button
                key={x.id}
                type="button"
                aria-pressed={x.id === aspectId}
                onClick={() => setAspectId(x.id)}
                className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors ${x.id === aspectId ? "border-gold text-ink" : "border-white/10 text-muted hover:border-white/30"}`}
              >
                {x.label}
              </button>
            ))}
          </div>
          <label htmlFor="st-detail" className="label mt-4">
            Detail · {detail < 0.85 ? "loose" : detail > 1.25 ? "fine" : "balanced"}
          </label>
          <input id="st-detail" type="range" min={0.6} max={1.6} step={0.1} value={detail} onChange={(e) => setDetail(+e.target.value)} className="w-full accent-[var(--gold)]" />
          <div className="mt-4 flex items-end gap-2">
            <div className="flex-1">
              <label htmlFor="st-seed" className="label">
                Variation
              </label>
              <input id="st-seed" type="number" min={0} max={999999} className="field nums" value={seed} onChange={(e) => setSeed(Math.max(0, Math.min(999999, Math.round(+e.target.value || 0))))} />
            </div>
            <button type="button" className="btn btn-outline" onClick={() => setSeed(Math.floor(Math.random() * 999999))}>
              New variation
            </button>
          </div>
        </section>

        <section aria-labelledby="st-motion" className="panel p-5">
          <h2 id="st-motion" className="eyebrow mb-3">
            4 · Motion
          </h2>
          <p className="mb-3 text-[13px] text-muted">
            <span className="text-gold-light">{style.motion.label}.</span> Every loop is seamless — the last frame meets the first.
          </p>
          <label htmlFor="st-camera" className="label">
            Camera
          </label>
          <select id="st-camera" className="field" value={camera} onChange={(e) => setCamera(e.target.value as Camera)}>
            <option value="still">Still — only the paint moves</option>
            <option value="breathe">Breathe — slow push-in to the focal point</option>
            <option value="drift">Drift — slow circular glide</option>
          </select>
          <label htmlFor="st-intensity" className="label mt-4">
            Intensity · {Math.round(intensity * 100)}%
          </label>
          <input id="st-intensity" type="range" min={0.3} max={1.5} step={0.1} value={intensity} onChange={(e) => setIntensity(+e.target.value)} className="w-full accent-[var(--gold)]" />
          <p className="eyebrow mt-4 mb-2">Loop length</p>
          <div className="flex gap-2" role="group" aria-label="Loop length">
            {[4, 6, 8].map((sec) => (
              <button
                key={sec}
                type="button"
                aria-pressed={sec === loopSeconds}
                onClick={() => setLoopSeconds(sec)}
                className={`rounded-full border px-3 py-1.5 text-[12px] nums transition-colors ${sec === loopSeconds ? "border-gold text-ink" : "border-white/10 text-muted hover:border-white/30"}`}
              >
                {sec} s
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* ───────── Stage ───────── */}
      <div className="flex min-w-0 flex-col gap-6">
        <section aria-label="Canvas" className="panel overflow-hidden p-3 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2" role="group" aria-label="View">
              <button type="button" className={`btn ${mode === "painting" ? "btn-solid" : "btn-outline"}`} onClick={replay} aria-pressed={mode === "painting"}>
                {painting ? "Painting…" : "Replay painting"}
              </button>
              <button
                type="button"
                className={`btn ${mode === "living" ? "btn-solid" : "btn-outline"}`}
                aria-pressed={mode === "living"}
                disabled={progress < 1}
                onClick={() => {
                  liveStart.current = performance.now();
                  setMode(mode === "living" ? "paused" : "living");
                }}
              >
                {mode === "living" ? "Pause motion" : "Play motion"}
              </button>
            </div>
            <p className="text-[12px] text-faint nums" aria-live="polite">
              {painting ? `Painting ${Math.round(progress * 100)}%` : mode === "living" ? `Living · ${style.motion.label}` : "Finished"}
            </p>
          </div>
          <div className="relative grid place-items-center rounded-[16px] bg-black/60 p-2 sm:p-4">
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={`${style.name} painting of ${subject || "the chosen image"}`}
              data-testid="studio-canvas"
              data-progress={Math.round(progress * 100)}
              className="h-auto max-h-[72vh] w-auto max-w-full rounded-[10px] shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
            />
            <div className="absolute inset-x-6 bottom-3 h-[3px] overflow-hidden rounded-full bg-white/10" aria-hidden="true" style={{ opacity: painting ? 1 : 0, transition: "opacity 600ms" }}>
              <div className="h-full bg-[var(--gold)]" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
          {error && (
            <p role="alert" className="mt-3 rounded-xl border border-[var(--danger)]/40 px-3 py-2 text-[13px] text-[var(--danger)]">
              {error}{" "}
              <button type="button" className="underline" onClick={() => setError(null)}>
                Dismiss
              </button>
            </p>
          )}
        </section>

        <section aria-labelledby="st-export" className="panel p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="st-export" className="eyebrow">
              Export
            </h2>
            <p className="text-[12px] text-faint">Rendered fresh at full size — the same seed gives the same painting.</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[2048, 3072, 4096].map((px) => (
              <button key={px} type="button" className="btn btn-outline nums" disabled={!!busy || !source} onClick={() => exportPng(px)}>
                PNG {px}
              </button>
            ))}
            <button type="button" className="btn btn-gold" disabled={!!busy || !source} onClick={() => exportVideo("loop")}>
              Video loop · {loopSeconds}s
            </button>
            <button type="button" className="btn btn-outline" disabled={!!busy || !source} onClick={() => exportVideo("timelapse")}>
              Painting timelapse
            </button>
          </div>
          {busy && (
            <div className="mt-4 flex items-center gap-3" role="status">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-[var(--gold)]" style={{ width: `${Math.round(busyProgress * 100)}%` }} />
              </div>
              <span className="text-[12px] text-muted nums">
                {busy}… {Math.round(busyProgress * 100)}%
              </span>
              <button type="button" className="text-[12px] text-gold-light underline" onClick={cancel}>
                Cancel
              </button>
            </div>
          )}
          <p className="mt-3 text-[12px] text-faint">Video records in real time in your browser (MP4 where supported, otherwise WebM). Keep this tab open while it records.</p>
        </section>

        {a && prompts && (
          <section aria-labelledby="st-read" className="panel p-5">
            <h2 id="st-read" className="eyebrow mb-3">
              What the painter saw
            </h2>
            <ul className="flex flex-wrap gap-2" aria-label="Palette">
              {a.palette.map((p) => (
                <li key={p.hex} className="flex items-center gap-2 rounded-full border border-white/10 py-1 pr-3 pl-1 text-[12px] text-muted">
                  <span className="size-5 rounded-full border border-white/20" style={{ background: p.hex }} aria-hidden="true" />
                  {p.name} <span className="nums text-faint">{Math.round(p.weight * 100)}%</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
              <div className="flex gap-2">
                <dt className="text-faint">Light</dt>
                <dd>{a.key}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-faint">Mood</dt>
                <dd>{a.moods.join(" · ")}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-faint">Focal point</dt>
                <dd>{a.focus.label}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-faint">Horizon</dt>
                <dd>{a.horizon ? a.horizon.label : "none detected"}</dd>
              </div>
            </dl>
          </section>
        )}

        {prompts && (
          <section aria-labelledby="st-prompts" className="panel p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="st-prompts" className="eyebrow">
                Detailed prompts
              </h2>
              <p className="display text-[18px] text-ink">{prompts.title}</p>
            </div>
            <div role="tablist" aria-label="Prompt type" className="mt-3 flex flex-wrap gap-2">
              {PROMPT_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls="prompt-panel"
                  onClick={() => setTab(t.id)}
                  className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors ${tab === t.id ? "border-gold text-ink" : "border-white/10 text-muted hover:border-white/30"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div id="prompt-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-3">
              <p data-testid="prompt-text" className="rounded-2xl border border-white/10 bg-black/30 p-4 text-[14px] leading-relaxed whitespace-pre-wrap text-ink">
                {tab === "caption" ? `${prompts.caption}\n\n${prompts.hashtags.join(" ")}` : prompts[tab]}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn btn-solid" onClick={() => copy(tab, tab === "caption" ? `${prompts.caption}\n\n${prompts.hashtags.join(" ")}` : prompts[tab])}>
                  {copied === tab ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() =>
                    copy(
                      "all",
                      [`# ${prompts.title}`, ...PROMPT_TABS.map((t) => `## ${t.label}\n${t.id === "caption" ? `${prompts.caption}\n\n${prompts.hashtags.join(" ")}` : prompts[t.id]}`)].join("\n\n"),
                    )
                  }
                >
                  {copied === "all" ? "Copied all" : "Copy all"}
                </button>
              </div>
              <p className="mt-3 text-[12px] text-faint">Prompts describe an original work in the spirit of public-domain traditions; they never ask to copy a living artist.</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
