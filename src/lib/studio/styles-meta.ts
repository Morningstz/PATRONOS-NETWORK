/**
 * Style vocabulary for the Studio: what each style is called, how a painter would describe it,
 * and how it moves. Pure data — shared by the painter (browser) and the prompt writer (tested).
 *
 * Influences only name artists and traditions in the public domain or movements in general;
 * living artists are never named, so prompts ask for original work, not imitation.
 */

export const STYLE_IDS = [
  "impasto",
  "impressionist",
  "pointillist",
  "oldmaster",
  "watercolor",
  "ukiyoe",
  "stencil",
  "batik",
  "bauhaus",
  "glass",
  "clockwork",
] as const;
export type StyleId = (typeof STYLE_IDS)[number];

export type StyleMeta = {
  id: StyleId;
  name: string;
  movement: string;
  blurb: string;
  /** Three hex colours for the picker swatch. */
  swatch: [string, string, string];
  prompt: {
    medium: string;
    technique: string;
    surface: string;
    light: string;
    influences: string;
    /** Fixed palette for styles that override the source colours. */
    fixedPalette?: string;
    /** Short comma tokens for Midjourney-style prompts. */
    tokens: string;
    print: string;
  };
  motion: { label: string; prompt: string };
};

export const STYLES_META: Record<StyleId, StyleMeta> = {
  impasto: {
    id: "impasto",
    name: "Impasto Swirl",
    movement: "Post-Impressionism",
    blurb: "Thick, rhythmic brushstrokes that follow every contour and swirl through the sky.",
    swatch: ["#1f3b73", "#e5b33a", "#3c6e57"],
    prompt: {
      medium: "oil painting on canvas",
      technique: "thick impasto applied with a loaded bristle brush; directional strokes that follow the contours of every form; swirling, rhythmic marks in open areas such as sky and water; colours laid side by side rather than blended",
      surface: "raised paint ridges that catch the light, visible canvas weave between strokes",
      light: "vibrant, pulsating light with luminous complementary contrasts",
      influences: "the expressive late landscapes of Vincent van Gogh (1888–1890)",
      tokens: "post-impressionist oil painting, heavy impasto, swirling directional brushstrokes, vibrant complementary colour, textured canvas",
      print: "Canvas print on 400 gsm poly-cotton canvas with a satin varnish; gallery-wrapped 4 cm stretcher.",
    },
    motion: {
      label: "Flowing brushstrokes",
      prompt: "the brushstrokes slowly flow along their own direction like wind moving through wet paint; swirls in open areas rotate gently; solid forms stay anchored",
    },
  },
  impressionist: {
    id: "impressionist",
    name: "Impressionist Light",
    movement: "Impressionism",
    blurb: "Broken colour and short dabs that catch fleeting light and coloured shadows.",
    swatch: ["#7aa6c2", "#f0c987", "#a58fc4"],
    prompt: {
      medium: "oil painting en plein air",
      technique: "broken colour in short comma-like dabs placed side by side; coloured shadows in violet and blue; warm highlights; no black; soft lost edges",
      surface: "lively, open brushwork in thin-to-medium paint",
      light: "fleeting natural daylight with sparkling highlights",
      influences: "the plein-air light studies of Claude Monet (1870s–1890s)",
      tokens: "impressionist oil painting, broken colour, short visible brushstrokes, dappled light, violet shadows, plein air",
      print: "Fine-art giclée on 310 gsm cotton rag (matte) or canvas; frame with a thin natural oak moulding.",
    },
    motion: {
      label: "Shimmering light",
      prompt: "sunlight dances across the surface; dabs of colour shimmer like light on water; leaves and reflections flicker softly",
    },
  },
  pointillist: {
    id: "pointillist",
    name: "Pointillist",
    movement: "Neo-Impressionism",
    blurb: "Thousands of pure-colour dots that mix in the eye.",
    swatch: ["#2f6fb3", "#f2c14e", "#d9583b"],
    prompt: {
      medium: "oil painting in the divisionist technique",
      technique: "thousands of small, evenly sized dots of pure, unmixed colour that blend optically; complementary dots inside the shadows; no visible blending",
      surface: "matte, evenly textured dots on a warm cream ground",
      light: "clear, still, high-noon light",
      influences: "the divisionist colour theory of Georges Seurat and Paul Signac",
      tokens: "pointillism, divisionism, tiny dots of pure colour, optical colour mixing, neo-impressionist",
      print: "Giclée on 310 gsm cotton rag (matte) — dots stay crisp at 300 dpi.",
    },
    motion: {
      label: "Twinkling dots",
      prompt: "individual dots of colour twinkle and breathe at different moments, as if the light itself is vibrating; the composition stays perfectly still",
    },
  },
  oldmaster: {
    id: "oldmaster",
    name: "Old Master",
    movement: "Baroque chiaroscuro",
    blurb: "Sfumato glazes, a single warm light, deep shadows and aged varnish.",
    swatch: ["#2a1d12", "#c8963e", "#7a4b2c"],
    prompt: {
      medium: "oil painting on panel",
      technique: "smooth glazed layers over a warm umber underpainting; soft sfumato transitions with no hard outlines; deep enveloping shadows",
      surface: "aged amber varnish with fine craquelure",
      light: "a single warm light source from the upper left, strong chiaroscuro",
      influences: "the sfumato and chiaroscuro of the Old Masters — Leonardo da Vinci, Caravaggio and Rembrandt",
      tokens: "old master oil painting, chiaroscuro, sfumato, warm glazes, aged varnish, craquelure, baroque lighting",
      print: "Giclée on canvas with a gloss varnish, or Hahnemühle Photo Rag Baryta; dark gilded frame.",
    },
    motion: {
      label: "Candlelight",
      prompt: "the warm light source flickers gently like a candle; dust motes drift slowly through the beam; shadows breathe",
    },
  },
  watercolor: {
    id: "watercolor",
    name: "Watercolour",
    movement: "Contemporary watercolour",
    blurb: "Transparent washes, soft blooms, pigment granulation and a light pencil line.",
    swatch: ["#7fb2c9", "#e8a2a2", "#f4e9d0"],
    prompt: {
      medium: "transparent watercolour on paper",
      technique: "layered wet-in-wet washes, soft blooms and backruns, pigment granulation, crisp dried edges, the white of the paper kept for highlights, a faint graphite underdrawing",
      surface: "cold-press cotton paper with visible tooth",
      light: "airy, luminous light carried by the paper",
      influences: "the traditional transparent watercolour of the English and Asian watercolour schools",
      tokens: "loose watercolour painting, wet-in-wet washes, blooms, granulation, white paper highlights, light pencil sketch",
      print: "Giclée on 300 gsm cold-press watercolour paper (100% cotton); float-mount with a deckled edge.",
    },
    motion: {
      label: "Wet blooms",
      prompt: "pigment slowly blooms and spreads into the wet paper; washes breathe softly; edges stay crisp; nothing else moves",
    },
  },
  ukiyoe: {
    id: "ukiyoe",
    name: "Ukiyo-e Woodblock",
    movement: "Ukiyo-e",
    blurb: "Flat colour, bold ink outlines, a bokashi sky and washi paper.",
    swatch: ["#1f3a5a", "#c8452c", "#efe6d2"],
    prompt: {
      medium: "Japanese woodblock print (nishiki-e)",
      technique: "flat areas of colour separated by bold sumi ink outlines; bokashi gradation in the sky; simplified, stylised forms",
      surface: "visible washi paper fibres and faint woodgrain from the block",
      light: "flat, graphic light without cast shadows",
      influences: "Edo-period woodblock prints by Katsushika Hokusai and Utagawa Hiroshige",
      fixedPalette: "Prussian blue, indigo, vermilion, ochre, sage and washi cream",
      tokens: "ukiyo-e woodblock print, flat colour, bold ink outlines, bokashi gradient sky, prussian blue, washi paper texture",
      print: "Giclée on Japanese kozo or 210 gsm natural washi-style paper; narrow black frame.",
    },
    motion: {
      label: "Drifting mist",
      prompt: "bands of mist and cloud drift slowly sideways across the scene; the bokashi sky gently brightens and dims; the printed forms stay still",
    },
  },
  stencil: {
    id: "stencil",
    name: "Stencil Street",
    movement: "Street art",
    blurb: "A two-tone spray stencil on weathered concrete, with drips and overspray.",
    swatch: ["#151515", "#d23c2a", "#8d8a84"],
    prompt: {
      medium: "spray-paint stencil on a concrete wall",
      technique: "a hand-cut multi-layer stencil in black plus one accent colour; hard cut edges; soft overspray halos; paint drips running down",
      surface: "weathered concrete blocks with stains and fine cracks",
      light: "flat daylight with a faint street-light glow",
      influences: "contemporary multi-layer stencil street art (original composition, not in the style of any specific artist)",
      tokens: "spray paint stencil graffiti, two-tone, hard edges, overspray, paint drips, weathered concrete wall",
      print: "Giclée on 290 gsm matte fine-art paper or a screenprint edition; raw wood frame.",
    },
    motion: {
      label: "Fresh paint",
      prompt: "fresh paint drips slowly run down the wall; a fine spray mist sparkles; a passing street-light glow sweeps across",
    },
  },
  batik: {
    id: "batik",
    name: "Batik Sogan",
    movement: "Javanese batik",
    blurb: "Sogan browns and indigo, canting lines, isen-isen dots, kawung and wax crackle.",
    swatch: ["#8a4f24", "#1f2a44", "#ead9b8"],
    prompt: {
      medium: "hand-drawn batik tulis on cotton",
      technique: "fine canting wax lines; isen-isen dot fills (cecek); a kawung background motif; remukan wax-crackle veins where dye seeped through",
      surface: "hand-dyed primissima cotton with a soft weave",
      light: "even, textile light",
      influences: "classical Central Javanese sogan batik from Yogyakarta and Surakarta",
      fixedPalette: "sogan brown, deep soga, indigo and natural cream",
      tokens: "javanese batik tulis, sogan brown and indigo, kawung motif, canting wax lines, isen-isen dots, wax crackle",
      print: "Print on cotton fabric (pigment textile print) or giclée on 310 gsm cotton rag; or commission a batik artisan to make it by hand.",
    },
    motion: {
      label: "Wax glow",
      prompt: "a warm light glides slowly across the cloth, catching the wax-crackle lines; the kawung motif breathes; the cloth stays flat",
    },
  },
  bauhaus: {
    id: "bauhaus",
    name: "Bauhaus Geometry",
    movement: "Bauhaus",
    blurb: "Primary colours and simple shapes on a modular grid.",
    swatch: ["#d1352a", "#f2c230", "#1f4e9c"],
    prompt: {
      medium: "geometric screenprint poster",
      technique: "a modular grid of circles, quarter-circles, half-circles, triangles and squares; primary red, yellow and blue with black and warm cream; flat colour, no gradients",
      surface: "flat screenprint ink on warm uncoated paper",
      light: "graphic, shadowless",
      influences: "Bauhaus design principles (1919–1933) and Constructivist posters",
      fixedPalette: "primary red, yellow, blue, black, grey and warm cream",
      tokens: "bauhaus geometric poster, modular grid, circles quarter circles triangles, primary colours, flat screenprint",
      print: "Screenprint or giclée on 250 gsm uncoated paper; thin black aluminium frame.",
    },
    motion: {
      label: "Turning shapes",
      prompt: "the geometric shapes rotate in quarter turns in a staggered rhythm, like a kinetic poster; the grid stays fixed",
    },
  },
  glass: {
    id: "glass",
    name: "Stained Glass",
    movement: "Stained glass",
    blurb: "Jewel-toned panes divided by dark lead lines, lit from behind.",
    swatch: ["#1f4e9c", "#b8233a", "#e6b33e"],
    prompt: {
      medium: "leaded stained-glass window",
      technique: "jewel-toned glass panes of varied sizes separated by dark lead cames; smaller panes where detail is fine",
      surface: "translucent glass with subtle seeds and streaks",
      light: "strong backlight passing through the glass",
      influences: "Gothic cathedral windows and Art Nouveau leaded glass",
      tokens: "stained glass window, leaded glass, jewel tones, backlit, mosaic panes, gothic",
      print: "Backlit duratrans in a light box, or acrylic face-mount for glow.",
    },
    motion: {
      label: "Passing sun",
      prompt: "a band of sunlight passes slowly through the glass from left to right and the panes glow as it crosses; the lead lines stay dark and still",
    },
  },
  clockwork: {
    id: "clockwork",
    name: "Gilded Clockwork",
    movement: "PATRONOS house style",
    blurb: "Low-key gold chiaroscuro with halo rings, engraved gears, rays and kintsugi veins.",
    swatch: ["#0e0b07", "#b8913e", "#eee7d8"],
    prompt: {
      medium: "mixed media: oil glaze, gold leaf and engraved linework",
      technique: "a low-key chiaroscuro underlayer; engraved gold hatching that follows form; luminous halo rings; interlocking clockwork gears; kintsugi-like gold veins",
      surface: "gold leaf on dark lacquer with a soft sheen",
      light: "divine rays falling from above; glowing gold against near-black",
      influences: "Baroque gold-leaf altarpieces, horological engravings and sacred iconography",
      fixedPalette: "near-black, antique gold, warm ivory and amber",
      tokens: "gilded clockwork, gold leaf on black, halo rings, engraved gears, divine light rays, kintsugi gold veins, baroque chiaroscuro",
      print: "Giclée on Hahnemühle Photo Rag Metallic or a gold-foil-accented print; black frame with a gilded fillet.",
    },
    motion: {
      label: "Living clockwork",
      prompt: "the gears turn slowly, the halo rings orbit, golden dust rises and the divine rays sway gently",
    },
  },
};

export const STYLE_LIST = STYLE_IDS.map((id) => STYLES_META[id]);
