# PATRONOS Art House — Studio, Art Lens, Assistant, Daily

> Ringkas (ID): **Studio** mengubah foto atau adegan contoh menjadi lukisan dalam 11 gaya, menampilkan proses melukis goresan demi goresan, lalu menghidupkannya sebagai animasi loop mulus. Hasil bisa diunduh sebagai PNG cetak (hingga 4096 px) dan video MP4/WebM, plus **prompt detail** untuk model gambar, Midjourney, animasi/video, spesifikasi cetak, dan caption. Semua proses berjalan di browser — foto pengguna tidak pernah diunggah.

This document is both the product spec and the build prompt for the Art House features. Use it to extend or rebuild them.

## 1. Product surface

| Route | What it does | Data leaves the device? |
|---|---|---|
| `/studio` | Source (4 procedural sample scenes or the visitor's photo) → 11 styles → paint-in animation → living loop → exports + prompts | No. Painting, analysis, PNG and video encoding run in the browser |
| `/lens` | Art Lens: photo/sample → palette → closest works by colour | Only a 15-number colour signature (server action `lensMatch`) |
| `/assistant` | Art Assistant: EN + Bahasa Indonesia sentence → filters → works; shows "How I read it" chips and words it did not use; relaxes mood → price → medium when nothing matches, and says so | Query text (GET) |
| `/daily` | Discover Daily: 10 works per day (deterministic shuffle by Asia/Jakarta date), swipe / buttons / arrow keys; Keep saves when signed in | Saves only when signed in |
| `/saved` | Saves and Following (signed-in only) | — |
| `/art` | Browse filters: medium, colour family, mood, IDR price band, availability, sort | — |
| `/art/[slug]` | Save heart, **View in a room** (to scale beside a 210 cm sofa, width parsed from dimensions), **Living view** (opt-in CSS breathing + light sheen; colours unchanged; off for reduced motion), IDR price `Rp 45.000.000` | — |
| `/artists/[slug]` | Follow | — |
| Home | Studio band that paints sample scenes live only while visible | — |

Rules kept from the master prompt: artworks are never cropped or desaturated (Studio crops only the visitor's own source photo to the aspect they choose); DEMO data stays labelled; no payments, auctions, fractional ownership or price "signals"; prompts never name living artists and always ask for an original work.

## 2. Engine (`src/lib/studio/`)

- `field.ts` — source at ≤480 px: RGB, luminance, blurred luminance, Sobel magnitude, structure-tensor flow (double-angle `c2/s2`, coherence). Bilinear samplers in normalised `(u,v)`.
- `analyze.ts` — deterministic k-means++ palette (k=6, merged under ΔE 9) with pigment names and colour families; mean luminance, contrast, saturation, warmth; key (high/mid/low); focal point (edge-energy centroid → rule-of-thirds label); horizon (strongest wide luminance step); detail; orientation; moods; 15-bin colour signature (12 hue bins weighted by saturation + 3 neutral bins), L2-normalised.
- `kit.ts` — `PaintEnv` (W, H, `s` = short edge / 1000, field, analysis, seeded rng + Perlin noise, detail 0.6–1.6, layers/store for the live layer); stroke helpers (`flowAngle`, `tracePath`, `strokePts`), surface textures (canvas, paper, washi, concrete), glow, vignette.
- `styles.ts` — each style is `paint(ctx, env): Generator<number>` that yields progress 0…1 **in painting order** (that is the paint-in animation) and `live(env): LiveLayer` whose `draw(ctx, t, T, k)` is periodic in `T` (seamless loops). Every size × `env.s`, every position in `(u,v)`, so preview, 4096 px print and video are the same painting for the same seed.
- `engine.ts` — `buildSource` (cover-crop to aspect, analyse), `PaintRun.step(budgetMs, paceSeconds)`, `LiveRun.frame(ctx, t, T, k, camera)` with cameras still / breathe (push-in to focal point) / drift (circular glide), `renderStill` (async, cancellable), `recordCanvas` (captureStream + MediaRecorder, MP4 H.264 where supported else WebM, 12 Mbps, 30 fps).
- `prompt.ts` — pure; see §4.
- `scenes.ts` — procedural sample scenes (volcano at dawn, rice terraces, harbour at night, tropical still life) so no photo assets are shipped.

## 3. Styles

| Id | Name | Paint process | Living motion |
|---|---|---|---|
| impasto | Impasto Swirl | blurred underpainting → long → medium → short loaded strokes along the flow field, each with shadow + highlight ridge; swirls where flat | strokes flow along their direction; swirl rotation |
| impressionist | Impressionist Light | broken-colour dabs, warm lights / violet shadows | shimmer on light |
| pointillist | Pointillist | optical-mix dots in layers | dots twinkle |
| oldmaster | Old Master | dark ground → glazes → modelled highlights → craquelure + varnish | candle flicker + dust motes |
| watercolor | Watercolour | wet-in-wet wash → granulating washes with dried edges → pen lines → speckle → paper | pigment blooms |
| ukiyoe | Ukiyo-e Woodblock | per-pixel quantisation to a 13-ink woodblock palette → sumi key-block outlines → bokashi sky → woodgrain → washi → seal (no characters) | mist bands drift; sky breathes |
| stencil | Stencil Street | concrete wall → two-tone stencil by value → overspray → drips | drips run; light sweep |
| batik | Batik Sogan | soga/indigo/cream by value → kawung + cecek motifs → canting lines → wax crackle | warm light glides across the cloth |
| bauhaus | Bauhaus Geometry | grid; cell background follows the colour mass, shapes take the colour across edges so the subject still reads | staggered quarter-turns |
| glass | Stained Glass | detail-weighted Voronoi panes (adaptive half-plane clipping) → jewel tones → lead cames | sun band passes through |
| clockwork | Gilded Clockwork (house style) | gold duotone (black → bronze → gold → ivory) → engraved hatching → divine rays → kintsugi veins | gears turn, halo rings orbit, gold dust rises |

## 4. Prompt outputs (per style × analysis × subject)

1. **Image** — medium, subject, composition (orientation, ratio, focal point, horizon), technique, surface, light + key/temperature/contrast, palette (pigment names from the source, or the style's fixed palette), mood, public-domain influences framed as "in the spirit of… an original work, not a copy", quality + no text/watermark/frame.
2. **Midjourney** — subject, style tokens, palette, focal point, moods, `--ar`, `--s` (from detail), `--seed`, `--no …`.
3. **Animation / video** — loop length, ratio, fps, the style's motion sentence, camera sentence (from camera + intensity), keep texture/palette/subject fixed, last frame = first frame, no morphing/new objects/text, ambient sound suggestion.
4. **Negative** — shared negative list.
5. **Print** — the style's paper/canvas recommendation; size in cm at 300 dpi and 150 dpi for 4096 and 3072 px; ratio; sRGB + soft-proof note.
6. **Caption** — title, movement, blurb, moods, palette + hashtags (`#patronosstudio`, `#seniindonesia`, …).

## 5. Data model added

`Artwork.category`, `colorFamilies[]`, `moods[]`, `colorSignature[]` (backfilled for generative demo works; demo prices converted to IDR), `SavedArtwork(userId, artworkId)`, `FollowedArtist(userId, artistId)` — RLS enabled on both. Server actions `setSaved`, `setFollowed` (zod uuid, signed-in, rate-limited 120/min, visibility-checked) and `lensMatch` (15 numbers in [0,1], 30/min per hashed IP).

## 6. Next steps (not built)

- Upload real artworks with analysis on upload (same `analyze` → fields above).
- Make Gilded Clockwork exclusive to VERXEPHON (`STYLES_META.clockwork` flag + gate in the picker).
- Auctions only with a licensed Indonesian *balai lelang* partner.
- Save Studio pieces to a profile (needs storage + moderation).
